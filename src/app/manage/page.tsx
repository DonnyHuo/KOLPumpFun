'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { toast } from 'sonner';
import { shortAddress, copyToClipboard } from '@/lib/utils';
import { CONTRACTS } from '@/constants/contracts';
import lpExchangeAbi from '@/constants/abi/lpExchange.json';
import erc20Abi from '@/constants/abi/erc20.json';
import { useStore } from '@/store/useStore';
import zhCN from '@/i18n/zh-CN';
import enUS from '@/i18n/en-US';
import { copy } from '@/assets/images';

interface PairInfo {
  id: number;
  pairName: string;
  disPlayName: string;
  lpToken: string;
  changeToken: string;
  rate: string;
  isOpen: boolean;
  baseTokenIsToken0: boolean;
  lpTokenBalance: string;
}

export default function ManagePage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { lang } = useStore();
  const t = lang === 'zh' ? zhCN : enUS;
  const manage = t.manage as Record<string, string>;

  const [exchangePairs, setExchangePairs] = useState<PairInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  // 获取合约 owner
  const { data: owner } = useReadContract({
    address: CONTRACTS.LP_EXCHANGE as `0x${string}`,
    abi: lpExchangeAbi,
    functionName: 'owner',
  });

  // 获取交易对数量
  const { data: pairsCount } = useReadContract({
    address: CONTRACTS.LP_EXCHANGE as `0x${string}`,
    abi: lpExchangeAbi,
    functionName: 'getPairsCount',
  });

  // 提取 LP
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // 检查是否是 owner
  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

  // 复制地址
  const handleCopy = async () => {
    if (!address) return;
    const success = await copyToClipboard(address);
    if (success) {
      toast.success(t.common.copySuccess as string);
    }
  };

  // 获取交易对列表
  useEffect(() => {
    const fetchPairs = async () => {
      if (!pairsCount) {
        setLoading(false);
        return;
      }

      const count = Number(pairsCount);
      const pairs: PairInfo[] = [];

      // 这里需要逐个获取，因为 wagmi 不支持批量调用带参数的函数
      for (let i = 0; i < count; i++) {
        try {
          const response = await fetch(
            `https://bsc-dataseed.bnbchain.org/`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [
                  {
                    to: CONTRACTS.LP_EXCHANGE,
                    data: `0x${lpExchangeAbi.find(a => a.name === 'pairs')?.name ? '1ab06ee5' + i.toString(16).padStart(64, '0') : ''}`,
                  },
                  'latest',
                ],
                id: i,
              }),
            }
          );
          // 简化处理，实际需要解析 ABI
        } catch (err) {
          console.error('Failed to fetch pair:', err);
        }
      }

      setExchangePairs(pairs);
      setLoading(false);
    };

    fetchPairs();
  }, [pairsCount]);

  // 提取成功
  useEffect(() => {
    if (isSuccess) {
      toast.success(t.common.withdrawSuccess as string);
      setWithdrawingId(null);
    }
  }, [isSuccess]);

  // 提取 LP
  const handleWithdraw = async (pairId: number) => {
    if (!isOwner) {
      toast.error(manage.notOwner as string);
      return;
    }

    setWithdrawingId(pairId);
    writeContract({
      address: CONTRACTS.LP_EXCHANGE as `0x${string}`,
      abi: lpExchangeAbi,
      functionName: 'withdrawLpToken',
      args: [BigInt(pairId)],
    });
  };

  return (
    <div className="bg-[#0D0D0F] min-h-screen p-5">
      {/* Header */}
      <div className="flex justify-end mb-6">
        {isConnected && address ? (
          <div
            className="flex items-center gap-2 cursor-pointer bg-[#1A1A1E] border border-white/10 px-3 py-2 rounded-xl hover:border-white/20 transition-colors"
            onClick={handleCopy}
          >
            <span className="text-sm text-white">{shortAddress(address)}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={copy.src} alt="copy" className="w-3.5 h-3.5 invert opacity-70" />
          </div>
        ) : (
          <button
            onClick={openConnectModal}
            className="btn-primary text-sm px-4 py-2"
          >
            {t.common.connectWallet as string}
          </button>
        )}
      </div>

      {/* 标题 */}
      <h1 className="text-left text-lg font-semibold mb-6 text-white">{manage.title}</h1>

      {/* LP 余额领取 */}
      <div className="text-left text-sm flex items-center justify-between py-3 text-gray-300 font-medium">
        {manage.lpWithdraw}
      </div>

      {/* 列表 */}
      <div className="card space-y-1">
        {loading ? (
          <div className="text-center py-8 text-gray-500">{t.common.loading as string}</div>
        ) : exchangePairs.length > 0 ? (
          exchangePairs.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 px-3 bg-white/5 rounded-xl text-sm border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="text-white font-medium">{item.disPlayName}</div>
              <span className="text-gray-300">{Number(item.lpTokenBalance || 0).toFixed(2)}</span>
              <button
                onClick={() => handleWithdraw(item.id)}
                disabled={withdrawingId === item.id || isPending || isConfirming}
                className="btn-primary h-[30px] px-4 text-xs"
              >
                {withdrawingId === item.id && (isPending || isConfirming) ? '...' : manage.withdraw}
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">{t.common.noData as string}</div>
        )}
      </div>

      {/* 权限提示 */}
      {!isOwner && isConnected && (
        <div className="mt-6 text-center text-sm text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
          {manage.noPermission}
        </div>
      )}
    </div>
  );
}

