'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits, maxUint256 } from 'viem';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { CONTRACTS } from '@/constants/contracts';
import lpExchangeAbi from '@/constants/abi/lpExchange.json';
import erc20Abi from '@/constants/abi/erc20.json';
import { shortAddress } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import zhCN from '@/i18n/zh-CN';
import enUS from '@/i18n/en-US';
import { getTokenIcon } from '@/assets/images/tokenList';
import { copy } from '@/assets/images';
import { ArrowLeft } from 'lucide-react';

// Loading 组件
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#FFC519] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

interface PairInfo {
  pairId: string;
  pairName: string;
  disPlayName: string;
  rate: number;
  isOpen: boolean;
  lpToken: string;
  changeToken: string;
  baseTokenIsToken0: boolean;
}

function LpSwapDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address } = useAccount();
  const { lang } = useStore();
  const t = lang === 'zh' ? zhCN : enUS;
  const poolDetail = t.poolDetail as Record<string, unknown>;
  const lpSwapT = t.lpSwap as Record<string, unknown>;
  const common = t.common as Record<string, unknown>;
  const publicClient = usePublicClient();

  const pairId = searchParams.get('pairId') || '';

  const [loading, setLoading] = useState(true);
  const [pairInfo, setPairInfo] = useState<PairInfo | null>(null);
  const [tokenName, setTokenName] = useState('--');
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [lpBalance, setLpBalance] = useState('0');
  const [lpAllowance, setLpAllowance] = useState('0');
  const [inputValue, setInputValue] = useState('');
  const [expectedTokens, setExpectedTokens] = useState('--');
  const [noLp, setNoLp] = useState(false);

  // 写入合约
  const { writeContract: approve, data: approveTxHash, isPending: approveLoading } = useWriteContract();
  const { writeContract: exchange, data: exchangeTxHash, isPending: exchangeLoading } = useWriteContract();

  // 等待交易确认
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isSuccess: exchangeSuccess } = useWaitForTransactionReceipt({ hash: exchangeTxHash });

  // 获取 pair 信息
  const fetchPairInfo = useCallback(async () => {
    if (!publicClient || !pairId) return;

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.LP_EXCHANGE as `0x${string}`,
        abi: lpExchangeAbi,
        functionName: 'pairs',
        args: [BigInt(pairId)],
      }) as readonly [string, string, string, boolean, string, bigint, boolean];

      const [lpToken, pairName, disPlayNmae, baseTokenIsToken0, changeToken, rate, isOpen] = result;

      setPairInfo({
        pairId,
        lpToken,
        pairName,
        disPlayName: disPlayNmae,
        baseTokenIsToken0,
        changeToken,
        rate: Number(rate) / 200,
        isOpen,
      });
    } catch (error) {
      console.error('fetchPairInfo error:', error);
    }
  }, [publicClient, pairId]);

  // 获取 token 信息
  const fetchTokenInfo = useCallback(async () => {
    if (!publicClient || !pairInfo?.changeToken) return;

    try {
      const [symbol, decimals] = await Promise.all([
        publicClient.readContract({
          address: pairInfo.changeToken as `0x${string}`,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: pairInfo.changeToken as `0x${string}`,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
      ]);

      setTokenName(symbol as string);
      setTokenDecimals(Number(decimals));
    } catch (error) {
      console.error('fetchTokenInfo error:', error);
    }
  }, [publicClient, pairInfo?.changeToken]);

  // 获取 LP 余额
  const fetchLpBalance = useCallback(async () => {
    if (!publicClient || !pairInfo?.lpToken || !address) return;

    try {
      const balance = await publicClient.readContract({
        address: pairInfo.lpToken as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      }) as bigint;

      const formatted = formatUnits(balance, 18);
      setLpBalance(formatted);
      setNoLp(parseFloat(formatted) === 0);
    } catch (error) {
      console.error('fetchLpBalance error:', error);
    }
  }, [publicClient, pairInfo?.lpToken, address]);

  // 获取 allowance
  const fetchAllowance = useCallback(async () => {
    if (!publicClient || !pairInfo?.lpToken || !address) return;

    try {
      const allowance = await publicClient.readContract({
        address: pairInfo.lpToken as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, CONTRACTS.LP_EXCHANGE],
      }) as bigint;

      setLpAllowance(formatUnits(allowance, 18));
    } catch (error) {
      console.error('fetchAllowance error:', error);
    }
  }, [publicClient, pairInfo?.lpToken, address]);

  // 计算预期兑换数量
  const calculateExpectedTokens = useCallback(async (value: string) => {
    if (!publicClient || !pairInfo || !value || parseFloat(value) <= 0) {
      setExpectedTokens('--');
      return;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.LP_EXCHANGE as `0x${string}`,
        abi: lpExchangeAbi,
        functionName: 'viewExchangeLpTokenForTokens',
        args: [BigInt(pairInfo.pairId), parseUnits(value, 18)],
      }) as bigint;

      const formatted = formatUnits(result, tokenDecimals);
      setExpectedTokens(parseFloat(formatted).toFixed(4));
    } catch (error) {
      console.error('calculateExpectedTokens error:', error);
      setExpectedTokens('--');
    }
  }, [publicClient, pairInfo, tokenDecimals]);

  // 授权
  const handleApprove = async () => {
    if (!pairInfo?.lpToken) return;

    try {
      approve({
        address: pairInfo.lpToken as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACTS.LP_EXCHANGE, maxUint256],
      });
    } catch (error) {
      console.error('approve error:', error);
      toast.error(common.approveFailed as string);
    }
  };

  // 兑换
  const handleExchange = async () => {
    if (!pairInfo || !inputValue) return;

    if (parseFloat(inputValue) > parseFloat(lpBalance)) {
      toast.error(poolDetail.noBalance as string);
      return;
    }

    if (parseFloat(inputValue) <= 0) {
      toast.error(poolDetail.errorTips as string);
      return;
    }

    try {
      exchange({
        address: CONTRACTS.LP_EXCHANGE as `0x${string}`,
        abi: lpExchangeAbi,
        functionName: 'exchangeLpTokenForTokens',
        args: [BigInt(pairInfo.pairId), parseUnits(inputValue, 18)],
      });
    } catch (error) {
      console.error('exchange error:', error);
      toast.error(poolDetail.swapFail as string);
    }
  };

  // 复制地址
  const copyAddress = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(common.copySuccess as string);
  };

  // 初始化
  useEffect(() => {
    const init = async () => {
      await fetchPairInfo();
      setLoading(false);
    };
    init();
  }, [fetchPairInfo]);

  // 获取 token 信息
  useEffect(() => {
    if (pairInfo) {
      fetchTokenInfo();
      fetchLpBalance();
      fetchAllowance();
    }
  }, [pairInfo, fetchTokenInfo, fetchLpBalance, fetchAllowance]);

  // 输入变化时计算预期兑换数量
  useEffect(() => {
    calculateExpectedTokens(inputValue);
  }, [inputValue, calculateExpectedTokens]);

  // 授权成功
  useEffect(() => {
    if (approveSuccess) {
      toast.success(common.approveSuccess as string);
      fetchAllowance();
    }
  }, [approveSuccess, common.approveSuccess, fetchAllowance]);

  // 兑换成功
  useEffect(() => {
    if (exchangeSuccess) {
      toast.success(poolDetail.swapSuccess as string);
      setInputValue('');
      fetchLpBalance();
    }
  }, [exchangeSuccess, fetchLpBalance, poolDetail.swapSuccess]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] p-5">
        <div className="space-y-4">
          <div className="h-10 skeleton" />
          <div className="h-80 skeleton" />
        </div>
      </div>
    );
  }

  if (!pairInfo) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex flex-col items-center justify-center p-5">
        <p className="text-gray-500 mb-4 text-sm">交換對不存在</p>
        <Link href="/lp-swap" className="btn-primary px-6">
          返回列表
        </Link>
      </div>
    );
  }

  const needApprove = parseFloat(lpAllowance) === 0;

  return (
    <div className="min-h-screen bg-[#0D0D0F] bg-grid bg-gradient-radial p-5">
      {/* 顶部标题 */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 rounded-xl bg-[#1A1A1E] border border-white/10 flex items-center justify-center hover:bg-[#222226] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-lg font-semibold text-white">LP 兌換</h1>
      </div>

      {/* Token 信息卡片 */}
      <div className="card mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#222226] p-1 ring-2 ring-[#FFC519]/30">
            <Image
              src={getTokenIcon(tokenName.toLowerCase())}
              alt={tokenName}
              width={40}
              height={40}
              className="rounded-full"
            />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">{pairInfo.disPlayName}</h2>
            <p className="text-sm text-[#FFC519] mt-0.5">{lpSwapT.timely as string} {pairInfo.rate}%</p>
          </div>
        </div>
      </div>

      {/* 合约地址 */}
      <div className="card mb-5 space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">{tokenName} {poolDetail.contractAddress as string}</span>
          <div
            className="flex items-center gap-2 cursor-pointer text-[#FFC519] hover:text-[#FFD54F] transition-colors"
            onClick={() => copyAddress(pairInfo.changeToken)}
          >
            <span>{shortAddress(pairInfo.changeToken)}</span>
            <Image src={copy} alt="copy" width={14} height={14} className="opacity-70" />
          </div>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex justify-between items-center">
          <span className="text-gray-400">{poolDetail.lp as string}</span>
          <a
            href={`https://bscscan.com/address/${pairInfo.lpToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FFC519] hover:text-[#FFD54F] transition-colors"
          >
            {shortAddress(pairInfo.lpToken)} ↗
          </a>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="card mb-5">
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-gray-400">{poolDetail.search2 as string}</span>
          {noLp && (
            <span className="badge-error">{poolDetail.getLp as string}</span>
          )}
        </div>
        <div className="flex items-center bg-[#0D0D0F] rounded-xl h-[56px] px-4 border border-white/10 focus-within:border-[#FFC519] transition-colors">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              const value = e.target.value.match(/^\d+(?:\.\d{0,18})?/)?.[0] || '';
              setInputValue(value);
            }}
            placeholder={poolDetail.placeHolder as string}
            className="flex-1 bg-transparent border-none outline-none text-white text-base placeholder:text-gray-600"
          />
          <button
            onClick={() => setInputValue(lpBalance)}
            className="bg-[#FFC519]/20 text-[#FFC519] text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#FFC519]/30 transition-colors"
          >
            MAX
          </button>
        </div>

        {/* 余额和预期 */}
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">{poolDetail.balance as string}</span>
            <span className="text-white">{parseFloat(lpBalance).toFixed(4)} LP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">{poolDetail.expected as string}</span>
            <span className="text-[#FFC519] font-semibold">{expectedTokens} {tokenName}</span>
          </div>
        </div>
      </div>

      {/* 按钮 */}
      <div className="mb-5">
        {needApprove ? (
          <button
            onClick={handleApprove}
            disabled={approveLoading}
            className="btn-primary w-full"
          >
            {approveLoading ? `${common.loading}` : poolDetail.approve as string}
          </button>
        ) : (
          <button
            onClick={handleExchange}
            disabled={exchangeLoading || !inputValue}
            className="btn-primary w-full"
          >
            {exchangeLoading ? `${common.loading}` : poolDetail.stake as string}
          </button>
        )}
      </div>

      {/* PancakeSwap 链接 */}
      <a
        href="https://pancakeswap.finance/v2/add/BNB/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"
        target="_blank"
        rel="noopener noreferrer"
        className="card flex items-center justify-between hover:bg-[#222226] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🥞</span>
          <span className="text-sm text-gray-300">{poolDetail.goPancake as string}</span>
        </div>
        <span className="text-[#FFC519]">→</span>
      </a>
    </div>
  );
}

export default function LpSwapDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LpSwapDetailContent />
    </Suspense>
  );
}
