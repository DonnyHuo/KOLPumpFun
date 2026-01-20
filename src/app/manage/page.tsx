'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
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
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError: isTransactionError } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();

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
      if (!pairsCount || !publicClient) {
        setLoading(false);
        return;
      }

      const count = Number(pairsCount);
      const pairs: PairInfo[] = [];

      try {
        // 循环获取每个 pair 的信息
      for (let i = 0; i < count; i++) {
        try {
            // 获取 pair 信息
            const pairData = await publicClient.readContract({
              address: CONTRACTS.LP_EXCHANGE as `0x${string}`,
              abi: lpExchangeAbi,
              functionName: 'pairs',
              args: [BigInt(i)],
            }) as [string, string, string, boolean, string, bigint, boolean];

            const [lpToken, pairName, disPlayName, baseTokenIsToken0, changeToken, rate, isOpen] = pairData;

            // 获取 lpToken 的余额（LP_EXCHANGE 合约持有的 LP token 数量）
            const lpTokenBalance = await publicClient.readContract({
              address: lpToken as `0x${string}`,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [CONTRACTS.LP_EXCHANGE as `0x${string}`],
            });

            const pairInfo: PairInfo = {
                id: i,
              pairName,
              disPlayName,
              lpToken,
              changeToken,
              rate: rate.toString(),
              isOpen,
              baseTokenIsToken0,
              lpTokenBalance: formatUnits(lpTokenBalance as bigint, 18),
            };

            pairs.push(pairInfo);
          } catch (err) {
            console.error(`Failed to fetch pair ${i}:`, err);
          }
        }
        } catch (err) {
        console.error('Failed to fetch pairs:', err);
      }

      setExchangePairs(pairs);
      setLoading(false);
    };

    fetchPairs();
  }, [pairsCount, publicClient]);

  // 提取成功/失败处理
  useEffect(() => {
    if (isSuccess) {
      toast.success(t.common.withdrawSuccess as string);
      setWithdrawingId(null);
      // 刷新列表
      if (pairsCount && publicClient) {
        const fetchPairs = async () => {
          const count = Number(pairsCount);
          const pairs: PairInfo[] = [];

          try {
            for (let i = 0; i < count; i++) {
              try {
                const pairData = await publicClient.readContract({
                  address: CONTRACTS.LP_EXCHANGE as `0x${string}`,
                  abi: lpExchangeAbi,
                  functionName: 'pairs',
                  args: [BigInt(i)],
                }) as [string, string, string, boolean, string, bigint, boolean];

                const [lpToken, pairName, disPlayName, baseTokenIsToken0, changeToken, rate, isOpen] = pairData;

                const lpTokenBalance = await publicClient.readContract({
                  address: lpToken as `0x${string}`,
                  abi: erc20Abi,
                  functionName: 'balanceOf',
                  args: [CONTRACTS.LP_EXCHANGE as `0x${string}`],
                });

                const pairInfo: PairInfo = {
                  id: i,
                  pairName,
                  disPlayName,
                  lpToken,
                  changeToken,
                  rate: rate.toString(),
                  isOpen,
                  baseTokenIsToken0,
                  lpTokenBalance: formatUnits(lpTokenBalance as bigint, 18),
                };

                pairs.push(pairInfo);
              } catch (err) {
                console.error(`Failed to fetch pair ${i}:`, err);
              }
            }
          } catch (err) {
            console.error('Failed to fetch pairs:', err);
          }

          setExchangePairs(pairs);
        };

        fetchPairs();
      }
    }
  }, [isSuccess, pairsCount, publicClient]);

  // 提取失败处理
  useEffect(() => {
    if (writeError || isTransactionError) {
      toast.error(t.common.withdrawFailed as string || '提取失败');
      setWithdrawingId(null);
    }
  }, [writeError, isTransactionError, t]);

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
    <div className="bg-[var(--background)] min-h-screen p-5">
      {/* Header */}
      <div className="flex justify-end mb-6">
        {isConnected && address ? (
          <div
            className="flex items-center gap-2 cursor-pointer bg-[var(--background-card)] border border-[var(--border-color)] px-3 py-2 rounded-xl hover:border-[var(--border-color-hover)] transition-colors"
            onClick={handleCopy}
          >
            <span className="text-sm text-[var(--foreground)]">{shortAddress(address)}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={copy.src} alt="copy" className="w-3.5 h-3.5 opacity-70" style={{ filter: 'brightness(0) saturate(100%) invert(var(--icon-invert))' }} />
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
      <h1 className="text-left text-lg font-semibold mb-6 text-[var(--foreground)]">{manage.title}</h1>

      {/* LP 余额领取 */}
      <div className="text-left text-sm flex items-center justify-between py-3 text-[var(--text-secondary)] font-medium">
        {manage.lpWithdraw}
      </div>

      {/* 列表 */}
      <div className="card space-y-1">
        {loading ? (
          <div className="text-center py-8 text-[var(--text-muted)]">{t.common.loading as string}</div>
        ) : exchangePairs.length > 0 ? (
          exchangePairs.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 px-3 bg-[var(--background-card-hover)] rounded-xl text-sm border border-[var(--border-color)] hover:border-[var(--border-color-hover)] transition-colors"
            >
              <div className="text-[var(--foreground)] font-medium">{item.disPlayName}</div>
              <span className="text-[var(--text-secondary)]">{Number(item.lpTokenBalance || 0).toFixed(2)}</span>
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
          <div className="text-center py-8 text-[var(--text-muted)]">{t.common.noData as string}</div>
        )}
      </div>

      {/* 权限提示 */}
      {!isOwner && isConnected && (
        <div className="mt-6 text-center text-sm text-[var(--warning)] bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-xl p-3">
          {manage.noPermission}
        </div>
      )}
    </div>
  );
}

