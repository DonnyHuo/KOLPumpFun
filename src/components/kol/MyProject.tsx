'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { toast } from 'sonner';
import { useBalance } from '@/hooks/useERC20';
import {
  useTokenRatiosIndex,
  useCanWithdrawValue,
  useCrossProgress,
  useLpExProgress,
  useKolProgress,
  useWithdrawKolAirdrop,
} from '@/hooks/useKolContract';
import { kolApi, type KolInfo, type ProjectInfo } from '@/lib/api';
import { useStore } from '@/store/useStore';
import zhCN from '@/i18n/zh-CN';
import enUS from '@/i18n/en-US';

interface MyProjectProps {
  kolInfo: KolInfo;
}

export default function MyProject({ kolInfo }: MyProjectProps) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { lang } = useStore();
  const t = lang === 'zh' ? zhCN : enUS;
  const home = t.home as Record<string, unknown>;

  const [reserveInfo, setReserveInfo] = useState<ProjectInfo | null>(null);

  // 获取项目 Token ID
  const { data: tokenId } = useTokenRatiosIndex(kolInfo.project_name || '');

  // 获取项目代币余额
  const { formatted: reserveBalance } = useBalance(
    reserveInfo?.contract_addr as `0x${string}`,
    address
  );

  // tokenId 已经是 bigint 类型，直接使用
  const tokenIdBigInt = tokenId !== undefined ? (tokenId as bigint) : undefined;

  // 获取可提取金额
  const { formatted: viewCanWithdrawValue, value: rawCanWithdrawValue } = useCanWithdrawValue(tokenIdBigInt);

  // 打印调试信息
  console.log('=== 待收取收益调试信息 ===');
  console.log('项目名称:', kolInfo.project_name);
  console.log('Token ID:', tokenId?.toString());
  console.log('Token ID (bigint):', tokenIdBigInt?.toString());
  console.log('待收取收益 (原始值):', rawCanWithdrawValue?.toString());
  console.log('待收取收益 (格式化):', viewCanWithdrawValue);
  console.log('========================');

  // 获取进度
  const { percentage: crossProgressValue, progress: crossProgressRaw } = useCrossProgress(tokenIdBigInt);
  const { percentage: lpExProgressValue, progress: lpExProgressRaw } = useLpExProgress(tokenIdBigInt);
  const { percentage: kolProgressValue, progress: kolProgressRaw } = useKolProgress(tokenIdBigInt);

  // 打印进度调试信息
  console.log('=== 进度调试信息 ===');
  console.log('跨鏈進度 (原始值):', crossProgressRaw?.toString());
  console.log('跨鏈進度 (百分比):', crossProgressValue);
  console.log('LP兌換發行進度 (原始值):', lpExProgressRaw?.toString());
  console.log('LP兌換發行進度 (百分比):', lpExProgressValue);
  console.log('KOL獎勵發行進度 (原始值):', kolProgressRaw?.toString());
  console.log('KOL獎勵發行進度 (百分比):', kolProgressValue);
  console.log('==================');

  // 提取收益
  const { withdraw, isPending, isConfirming, isSuccess } = useWithdrawKolAirdrop();

  // 获取已发行项目列表
  useEffect(() => {
    const fetchProjectInfo = async () => {
      try {
        const res = await kolApi.getProjectIssuedList();
        if (res.data?.length > 0) {
          const project = res.data.find(
            (p) => p.project_name === kolInfo.project_name
          );
          if (project) {
            setReserveInfo(project);
          }
        }
      } catch (error) {
        console.error('Failed to fetch project info:', error);
      }
    };

    if (kolInfo.project_name) {
      fetchProjectInfo();
    }
  }, [kolInfo.project_name]);

  // 监听提取成功
  useEffect(() => {
    if (isSuccess) {
      toast.success(lang === 'zh' ? '領取成功' : 'Withdraw Success');
    }
  }, [isSuccess, lang]);

  // 领取收益
  const handleWithdraw = () => {
    if (tokenIdBigInt !== undefined) {
      withdraw(tokenIdBigInt);
    }
  };

  // 是否显示 KOL 进度（非 SOS 项目时显示）
  const showKolProgress = reserveInfo?.name !== 'SOS';

  return (
    <div className="space-y-4">
      {/* 项目名称和余额 */}
      <div className="flex items-center justify-between py-3 bg-[#1A1A1E] rounded-xl">
        <span className="text-gray-400">{reserveInfo?.name}</span>
        <span className="font-medium text-white">
          {parseFloat(reserveBalance).toFixed(2)} {reserveInfo?.symbol}
        </span>
      </div>

      {/* 待领取收益 */}
      <div className="flex items-center justify-between py-3 bg-[#1A1A1E] rounded-xl">
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">{home.revenueCollected as string}</span>
          <span className="font-bold text-[#FFC519] text-lg">
            {parseFloat(viewCanWithdrawValue).toFixed(4)}
          </span>
          <span className="text-[#FFC519] text-[10px]">{reserveInfo?.symbol}</span>
        </div>
        {isConnected ? (
          <button
            onClick={handleWithdraw}
            disabled={
              isPending ||
              isConfirming ||
              parseFloat(viewCanWithdrawValue) === 0
            }
            className="btn-primary text-sm px-5 py-2"
          >
            {isPending || isConfirming ? '...' : home.receiveBenefits as string}
          </button>
        ) : (
          <button
            onClick={openConnectModal}
            className="btn-primary text-sm px-5 py-2"
          >
            {lang === 'zh' ? '連接錢包' : 'Connect Wallet'}
          </button>
        )}
      </div>

      {/* 进度信息 */}
      <div className="bg-[#1A1A1E] rounded-xl py-4 space-y-3">
        {/* 跨链进度 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">{home.crossChainProgress as string}</span>
          <span className="font-medium text-white">{crossProgressValue} %</span>
        </div>

        {/* LP 进度 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">{home.LpProgress as string}</span>
          <span className="font-medium text-white">{lpExProgressValue} %</span>
        </div>

        {/* KOL 进度 */}
        {showKolProgress && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">{home.KOLProgress as string}</span>
            <span className="font-medium text-white">{kolProgressValue} %</span>
          </div>
        )}
      </div>

      {/* 进度说明 */}
      <p className="text-xs text-red-500 leading-5 text-left">
        {home.progressDesc as string}
      </p>
    </div>
  );
}

