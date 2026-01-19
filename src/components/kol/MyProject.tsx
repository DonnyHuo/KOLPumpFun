'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
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
  const { address } = useAccount();
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

  // 获取可提取金额
  const { formatted: viewCanWithdrawValue } = useCanWithdrawValue(
    tokenId !== undefined ? BigInt(tokenId as number) : undefined
  );

  // 获取进度
  const { percentage: crossProgressValue } = useCrossProgress(
    tokenId !== undefined ? BigInt(tokenId as number) : undefined
  );
  const { percentage: lpExProgressValue } = useLpExProgress(
    tokenId !== undefined ? BigInt(tokenId as number) : undefined
  );
  const { percentage: kolProgressValue } = useKolProgress(
    tokenId !== undefined ? BigInt(tokenId as number) : undefined
  );

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
    if (tokenId !== undefined) {
      withdraw(BigInt(tokenId as number));
    }
  };

  // 是否显示 KOL 进度（非 SOS 项目时显示）
  const showKolProgress = reserveInfo?.name !== 'SOS';

  return (
    <div className="card bg-[#F8FCFF]">
      <h3 className="font-semibold text-base mb-4">{home.myProject as string}</h3>
      
      {/* 项目名称和余额 */}
      <div className="flex items-center justify-between py-2 border-b border-gray-100">
        <span className="text-gray-600">{reserveInfo?.name}</span>
        <span className="font-medium">
          {parseFloat(reserveBalance).toFixed(2)} {reserveInfo?.symbol}
        </span>
      </div>

      {/* 已领取收益 */}
      <div className="flex items-center justify-between py-2 border-b border-gray-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-600">{home.revenueCollected as string}：</span>
          <span className="font-medium">
            {parseFloat(viewCanWithdrawValue).toFixed(2)} {reserveInfo?.symbol}
          </span>
        </div>
        <button
          onClick={handleWithdraw}
          disabled={
            isPending ||
            isConfirming ||
            parseFloat(viewCanWithdrawValue) === 0
          }
          className="btn-primary text-xs px-3 py-1"
        >
          {isPending || isConfirming ? '...' : home.receiveBenefits as string}
        </button>
      </div>

      {/* 跨链进度 */}
      <div className="flex items-center justify-between py-2 border-b border-gray-100">
        <span className="text-gray-600">{home.crossChainProgress as string}</span>
        <span className="font-medium">{crossProgressValue} %</span>
      </div>

      {/* LP 进度 */}
      <div className="flex items-center justify-between py-2 border-b border-gray-100">
        <span className="text-gray-600">{home.LpProgress as string}</span>
        <span className="font-medium">{lpExProgressValue} %</span>
      </div>

      {/* KOL 进度 */}
      {showKolProgress && (
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600">{home.KOLProgress as string}</span>
          <span className="font-medium">{kolProgressValue} %</span>
        </div>
      )}

      {/* 进度说明 */}
      <p className="text-xs text-gray-400 mt-3 leading-5 text-left">
        {home.progressDesc as string}
      </p>
    </div>
  );
}

