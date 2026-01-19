'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { useStore } from '@/store/useStore';
import { useUserDepositedAmount } from '@/hooks/useDepositContract';
import { kolApi, type KolInfo } from '@/lib/api';
import { KolCertification } from '@/components/kol/KolCertification';
import { DepositSection } from '@/components/kol/DepositSection';
import { WithdrawSection } from '@/components/kol/WithdrawSection';
import { CreateProject } from '@/components/kol/CreateProject';
import zhCN from '@/i18n/zh-CN';
import enUS from '@/i18n/en-US';
import { SocialLinks } from '@/components/common/SocialLinks';
import {
  logo, wallet,
  step1, step2, step3, success,
} from '@/assets/images';

// 骨架屏组件
function Skeleton() {
  return (
    <div className="mt-8">
      {/* KOL Section Skeleton */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full skeleton" />
          <div className="h-8 skeleton w-32" />
        </div>
        <div className="flex gap-4 mb-4">
          <div className="w-1/2">
            <div className="h-4 skeleton w-20 mb-2" />
            <div className="h-12 skeleton w-full rounded-xl" />
          </div>
          <div className="w-1/2">
            <div className="h-4 skeleton w-20 mb-2" />
            <div className="h-12 skeleton w-full rounded-xl" />
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <div className="h-3 skeleton w-full" />
          <div className="h-3 skeleton w-5/6" />
        </div>
      </div>

      {/* Stake SOS Section Skeleton */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full skeleton" />
          <div className="h-8 skeleton w-32" />
        </div>
        <div className="h-14 skeleton w-full rounded-xl mb-4" />
        <div className="h-3 skeleton w-3/4 mb-6" />
        <div className="space-y-3">
          <div className="h-12 skeleton w-full rounded-xl" />
          <div className="h-12 skeleton w-full rounded-xl" />
        </div>
      </div>

      {/* Become Project Section Skeleton */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full skeleton" />
          <div className="h-8 skeleton w-40" />
        </div>
        <div className="h-60 skeleton w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { lang, setLang, activeAmount, setActiveAmount, accountInfoStatus, setAccountInfoStatus } = useStore();
  const t = lang === 'zh' ? zhCN : enUS;

  const [loading, setLoading] = useState(true);
  const [kolInfo, setKolInfo] = useState<KolInfo | null>(null);

  // 获取质押金额
  const { formatted: depositedAmount, refetch: refetchDeposit } = useUserDepositedAmount(
    address as `0x${string}`
  );

  // 切换语言
  const toggleLang = () => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  };

  // 获取 KOL 信息
  const fetchKolInfo = async () => {
    if (!address) return;
    try {
      const res = await kolApi.queryKol(address);
      setKolInfo(res.data);
      setAccountInfoStatus(res.data?.status ?? 0);
    } catch (error) {
      console.error('Failed to fetch KOL info:', error);
      setKolInfo(null);
    }
  };

  // 初始化数据
  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    const initData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchKolInfo(),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [address, isConnected]);

  // 更新质押金额到 store
  useEffect(() => {
    if (depositedAmount) {
      setActiveAmount(parseFloat(depositedAmount));
    }
  }, [depositedAmount, setActiveAmount]);

  // 刷新数据
  const refreshData = async () => {
    await Promise.all([fetchKolInfo(), refetchDeposit()]);
  };

  // 判断各步骤完成状态
  // KOL认证：只要提交过认证就算完成（与 Vue 项目一致）
  const hasSubmittedKol = !!kolInfo;
  const hasStaked = activeAmount > 0;
  const hasProject = [4, 5].includes(accountInfoStatus);

  return (
    <div className="bg-[#0D0D0F] bg-grid p-4 min-h-full text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src={logo} alt="KOLPumpFun" width={36} height={36} className="h-9 w-auto" />
          <span className="font-bold text-white text-lg">KOLPumpFun</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 钱包连接按钮 */}
          {isConnected ? (
            <div className="h-[36px] px-3 bg-[#1A1A1E] border border-[#FFC519]/30 rounded-xl flex items-center gap-2">
              <Image src={wallet} alt="wallet" width={18} height={18} />
              <span className="text-xs text-[#FFC519]">
                {address?.slice(0, 4)}...{address?.slice(-4)}
              </span>
            </div>
          ) : (
            <button
              onClick={openConnectModal}
              className="h-[36px] w-[36px] bg-[#1A1A1E] border border-white/10 rounded-xl flex items-center justify-center hover:bg-[#222226] hover:border-[#FFC519]/30 transition-all"
            >
              <Image src={wallet} alt="wallet" width={18} height={18} />
            </button>
          )}
          {/* 语言切换按钮 */}
          <button
            onClick={toggleLang}
            className="h-[36px] px-4 bg-[#1A1A1E] border border-white/10 rounded-xl text-sm text-white hover:bg-[#222226] hover:border-white/20 transition-all"
          >
            {lang === 'zh' ? '繁体中文' : 'English'}
          </button>
        </div>
      </div>

      {/* Banner Title */}
      <div className="mt-10 text-center">
        <h1 className="text-[32px] font-bold gradient-text leading-tight">
          {t.create.title}
        </h1>
        <p className="text-sm text-gray-400 mt-3">
          {t.create.subtitle}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {t.create.rewardNote}
        </p>
      </div>

      {/* Banner Card */}
      <div className="card mt-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFC519]/10 via-transparent to-[#FB8018]/5" />
        <div className="relative z-10 py-6">
          <div className="text-lg font-bold text-white text-center">
            {t.create.bannerTitle}
          </div>
          <div className="text-lg font-bold text-white text-center">
            {t.create.bannerSubtitle}
          </div>
          <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-2 text-gray-400 mt-4 text-xs px-4">
            {t.create.features.map((feature, index) => (
              <span key={index} className="flex items-center">
                <span className="w-1 h-1 rounded-full bg-[#FFC519] mr-2" />
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <Skeleton />
      ) : (
        <div className="mt-8 space-y-8">
          {/* Step 1: KOL 认证 */}
          <div className="card">
            <div className="flex items-center gap-4 mb-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                hasSubmittedKol 
                  ? 'bg-[#FFC519]/20' 
                  : 'bg-blue-500/20'
              }`}>
                <Image
                  src={hasSubmittedKol ? success : step1}
                  alt="step1"
                  width={28}
                  height={28}
                />
              </div>
              <span className={`text-xl font-bold ${hasSubmittedKol ? 'text-[#FFC519]' : 'text-blue-400'}`}>
                {(t.home as Record<string, unknown>).kolCertification as string}
              </span>
            </div>
            <KolCertification
              kolInfo={kolInfo}
              onSuccess={refreshData}
              t={t}
            />
          </div>

          {/* Step 2: SOS质押 */}
          <div className="card">
            <div className="flex items-center gap-4 mb-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                hasStaked 
                  ? 'bg-[#FFC519]/20' 
                  : 'bg-blue-500/20'
              }`}>
                <Image
                  src={hasStaked ? success : step2}
                  alt="step2"
                  width={28}
                  height={28}
                />
              </div>
              <span className={`text-xl font-bold ${hasStaked ? 'text-[#FFC519]' : 'text-blue-400'}`}>
                {(t.home as Record<string, unknown>).stakeSOS as string || 'SOS質押'}
              </span>
            </div>
            {hasStaked ? (
              <WithdrawSection
                kolInfo={kolInfo}
                activeAmount={activeAmount}
                onSuccess={refreshData}
                t={t}
              />
            ) : (
              <DepositSection
                kolInfo={kolInfo}
                onSuccess={refreshData}
                t={t}
              />
            )}
          </div>

          {/* Step 3: 成为项目方 */}
          <div className="card">
            <div className="flex items-center gap-4 mb-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                hasProject 
                  ? 'bg-[#FFC519]/20' 
                  : 'bg-blue-500/20'
              }`}>
                <Image
                  src={hasProject ? success : step3}
                  alt="step3"
                  width={28}
                  height={28}
                />
              </div>
              <span className={`text-xl font-bold ${hasProject ? 'text-[#FFC519]' : 'text-blue-400'}`}>
                {(t.home as Record<string, unknown>).becomeProject as string}
              </span>
            </div>
            {hasProject ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full bg-[#FFC519]/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="text-gray-400">{(t.home as Record<string, unknown>).projectCreated as string}</p>
              </div>
            ) : (
              <CreateProject
                activeAmount={activeAmount}
                onSuccess={refreshData}
                t={t}
                kolInfo={kolInfo}
              />
            )}
          </div>
        </div>
      )}

      {/* Footer Social Links */}
      <SocialLinks className="mt-10 pb-6" />
    </div>
  );
}
