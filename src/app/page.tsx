"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Globe, Sun, Moon } from "lucide-react";
import { useConnection, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/store/useStore";
import { useUserDepositedAmount } from "@/hooks/useDepositContract";
import { kolApi, type KolInfo } from "@/lib/api";
import { KolCertification } from "@/components/kol/KolCertification";
import { DepositSection } from "@/components/kol/DepositSection";
import { WithdrawSection } from "@/components/kol/WithdrawSection";
import { CreateProject } from "@/components/kol/CreateProject";
import MyProject from "@/components/kol/MyProject";
import zhCN from "@/i18n/zh-CN";
import enUS from "@/i18n/en-US";
import { SocialLinks } from "@/components/common/SocialLinks";
import { logo, wallet, step1, step2, step3, success } from "@/assets/images";

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
  const { address, isConnected } = useConnection();
  const disconnect = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const {
    lang,
    setLang,
    theme,
    toggleTheme,
    activeAmount,
    setActiveAmount,
    accountInfoStatus,
    setAccountInfoStatus,
  } = useStore();
  const t = lang === "zh" ? zhCN : enUS;

  const langMenuRef = useRef<HTMLDivElement>(null);

  // 获取质押金额
  const { formatted: depositedAmount, refetch: refetchDeposit } =
    useUserDepositedAmount(address as `0x${string}`);

  // 语言选择下拉菜单
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Header 滚动隐藏/显示
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const {
    data: kolInfoData,
    isLoading: kolLoading,
    refetch: refetchKolInfo,
  } = useQuery<KolInfo | null>({
    queryKey: ["kolInfo", address],
    queryFn: async () => {
      if (!address) return null;
      try {
        const res = await kolApi.queryKol(address);
        return res.data || null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(isConnected && address),
  });
  const kolInfo = useMemo(() => {
    return kolInfoData ?? null;
  }, [kolInfoData]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(event.target as Node)
      ) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 监听滚动事件，控制 Header 显示/隐藏
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const currentScrollY = target.scrollTop;

      // 向下滚动且滚动距离大于 60px 时隐藏 header
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setShowHeader(false);
      }
      // 向上滚动时显示 header
      else if (currentScrollY < lastScrollY) {
        setShowHeader(true);
      }

      setLastScrollY(currentScrollY);
    };

    // 监听 main 元素的滚动事件（而不是 window）
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll, { passive: true });
      return () => mainElement.removeEventListener("scroll", handleScroll);
    }
  }, [lastScrollY]);

  // 切换语言
  const handleSelectLang = (newLang: "zh" | "en") => {
    setLang(newLang);
    setShowLangMenu(false);
  };

  useEffect(() => {
    if (kolInfo) {
      setAccountInfoStatus(kolInfo.status ?? 0);
    }
  }, [kolInfo, setAccountInfoStatus]);

  // 更新质押金额到 store
  useEffect(() => {
    if (depositedAmount) {
      setActiveAmount(parseFloat(depositedAmount));
    }
  }, [depositedAmount, setActiveAmount]);

  // 刷新数据
  const refreshData = useCallback(async () => {
    await Promise.all([refetchKolInfo(), refetchDeposit()]);
  }, [refetchKolInfo, refetchDeposit]);

  // 判断各步骤完成状态
  // KOL认证：只要提交过认证就算完成（与 Vue 项目一致）
  const hasSubmittedKol = !!kolInfo;
  const hasStaked = activeAmount > 0;
  const hasProject = [4, 5].includes(accountInfoStatus);

  return (
    <div className="bg-background bg-grid p-4 min-h-full text-left">
      {/* Header */}
      <div
        className="flex items-center justify-between fixed top-0 left-0 right-0 z-50 py-3 px-4 bg-background transition-transform duration-300 ease-in-out"
        style={{ transform: showHeader ? 'translateY(0)' : 'translateY(-100%)' }}
      >
        <div className="flex items-center gap-2">
          <Image
            src={logo}
            alt="KOLPumpFun"
            width={36}
            height={36}
            className="h-9 w-auto"
          />
          <span className="font-bold text-secondary text-lg">KOLPumpFun</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 钱包连接/断开按钮 */}
          {isConnected ? (
            <button
              onClick={() => disconnect.mutate()}
              className="h-9 px-3 bg-background-card border border-primary rounded-xl flex items-center gap-2 hover:bg-card-hover hover:border-red-500/50 transition-all group"
              title={lang === "zh" ? "點擊斷開連接" : "Click to disconnect"}
            >
              <Image src={wallet} alt="wallet" width={18} height={18} />
              <span className="text-xs text-primary group-hover:text-red-500 transition-colors">
                {address?.slice(0, 4)}...{address?.slice(-4)}
              </span>
            </button>
          ) : (
            <button
              onClick={openConnectModal}
              className="h-9 w-9 bg-background-card border border-border rounded-xl flex items-center justify-center hover:bg-card-hover hover:border-primary/30 transition-all"
            >
              <Image src={wallet} alt="wallet" width={18} height={18} />
            </button>
          )}
          {/* 主题切换按钮 */}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 bg-background-card border border-border rounded-xl flex items-center justify-center hover:bg-card-hover hover:border-hover transition-all"
            title={
              theme === "dark"
                ? lang === "zh"
                  ? "切換到淺色模式"
                  : "Switch to Light Mode"
                : lang === "zh"
                  ? "切換到深色模式"
                  : "Switch to Dark Mode"
            }
          >
            {theme === "dark" ? (
              <Sun className="w-4.5 h-4.5 text-secondary" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-secondary" />
            )}
          </button>
          {/* 语言切换按钮 */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="h-9 w-9 bg-background-card border border-border rounded-xl flex items-center justify-center hover:bg-card-hover hover:border-hover transition-all"
            >
              <Globe className="w-4.5 h-4.5 text-secondary" />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-10.5 bg-background-card border border-border rounded-xl overflow-hidden z-50 min-w-30">
                <button
                  onClick={() => handleSelectLang("zh")}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-card-hover transition-colors ${lang === "zh" ? "text-primary" : "text-secondary"
                    }`}
                >
                  繁体中文
                </button>
                <button
                  onClick={() => handleSelectLang("en")}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-card-hover transition-colors ${lang === "en" ? "text-primary" : "text-secondary"
                    }`}
                >
                  English
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Banner Title */}
      <div className="mt-20 text-center">
        <h1 className="text-[32px] font-bold gradient-text leading-tight">
          {t.create.title}
        </h1>
        <p className="text-sm text-text-secondary mt-3">{t.create.subtitle}</p>
        <p className="text-sm text-text-secondary mt-1">
          {t.create.rewardNote}
        </p>
      </div>

      {/* Banner Card */}
      <div className="card mt-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-[#FFC519]/10 via-transparent to-[#FB8018]/5" />
        <div className="relative z-10 py-6">
          <div className="text-lg font-bold text-secondary text-center">
            {t.create.bannerTitle}
          </div>
          <div className="text-lg font-bold text-secondary text-center">
            {t.create.bannerSubtitle}
          </div>
          <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-2 text-text-secondary mt-4 text-xs px-4">
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
      {isConnected && kolLoading ? (
        <Skeleton />
      ) : (
        <div className="mt-8 space-y-8">
          {/* Step 1: KOL 认证 */}
          <div className="card">
            <div className="flex items-center gap-4 mb-5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasSubmittedKol ? "bg-[#FFC519]/20" : "bg-blue-500/20"
                  }`}
              >
                <Image
                  src={hasSubmittedKol ? success : step1}
                  alt="step1"
                  width={28}
                  height={28}
                />
              </div>
              <span
                className={`text-xl font-bold ${hasSubmittedKol ? "text-[#FFC519]" : "text-blue-400"
                  }`}
              >
                {(t.home as Record<string, unknown>).kolCertification as string}
              </span>
            </div>
            <KolCertification kolInfo={kolInfo} onSuccess={refreshData} t={t} />
          </div>

          {/* Step 2: SOS质押 */}
          <div className="card">
            <div className="flex items-center gap-4 mb-5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasStaked ? "bg-[#FFC519]/20" : "bg-blue-500/20"
                  }`}
              >
                <Image
                  src={hasStaked ? success : step2}
                  alt="step2"
                  width={28}
                  height={28}
                />
              </div>
              <span
                className={`text-xl font-bold ${hasStaked ? "text-[#FFC519]" : "text-blue-400"
                  }`}
              >
                {((t.home as Record<string, unknown>).stakeSOS as string) ||
                  "SOS質押"}
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
              <DepositSection kolInfo={kolInfo} onSuccess={refreshData} t={t} />
            )}
          </div>

          {/* Step 3: 成为项目方 */}
          <div className="card">
            <div className="flex items-center gap-4 mb-5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasProject ? "bg-[#FFC519]/20" : "bg-blue-500/20"
                  }`}
              >
                <Image
                  src={hasProject ? success : step3}
                  alt="step3"
                  width={28}
                  height={28}
                />
              </div>
              <span
                className={`text-xl font-bold ${hasProject ? "text-[#FFC519]" : "text-blue-400"
                  }`}
              >
                {(t.home as Record<string, unknown>).becomeProject as string}
              </span>
            </div>
            {hasProject && kolInfo ? (
              <MyProject kolInfo={kolInfo} />
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
