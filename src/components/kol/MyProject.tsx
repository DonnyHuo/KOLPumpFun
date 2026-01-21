"use client";

import { useEffect, useMemo, useRef } from "react";
import { useConnection } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useBalance } from "@/hooks/useERC20";
import {
  useTokenRatiosIndex,
  useCanWithdrawValue,
  useCrossProgress,
  useLpExProgress,
  useKolProgress,
  useWithdrawKolAirdrop,
} from "@/hooks/useKolContract";
import { kolApi, type KolInfo, type ProjectInfo } from "@/lib/api";
import { useStore } from "@/store/useStore";
import zhCN from "@/i18n/zh-CN";
import enUS from "@/i18n/en-US";
import ConfirmButton from "../ui/ConfirmButton";

interface MyProjectProps {
  kolInfo: KolInfo;
}

export default function MyProject({ kolInfo }: MyProjectProps) {
  const { address, isConnected } = useConnection();
  const { openConnectModal } = useConnectModal();
  const { lang } = useStore();
  const t = lang === "zh" ? zhCN : enUS;
  const home = t.home as Record<string, unknown>;

  const { data: issuedProjects = [] } = useQuery<ProjectInfo[]>({
    queryKey: ["projectIssuedList"],
    queryFn: async () => {
      const res = await kolApi.getProjectIssuedList();
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const reserveInfo = useMemo<ProjectInfo | null>(() => {
    if (!kolInfo.project_name) return null;
    return (
      issuedProjects.find((p) => p.project_name === kolInfo.project_name) ||
      null
    );
  }, [issuedProjects, kolInfo.project_name]);

  // 获取项目 Token ID
  const { data: tokenId } = useTokenRatiosIndex(kolInfo.project_name || "");

  // 获取项目代币余额
  const { formatted: reserveBalance, refetch: refetchReserveBalance } =
    useBalance(reserveInfo?.contract_addr as `0x${string}`, address);

  // tokenId 已经是 bigint 类型，直接使用
  const tokenIdBigInt = tokenId !== undefined ? (tokenId as bigint) : undefined;

  // 获取可提取金额（传入当前钱包地址）
  const { formatted: viewCanWithdrawValue, refetch: refetchCanWithdrawValue } =
    useCanWithdrawValue(tokenIdBigInt, address);

  // 获取进度
  const { percentage: crossProgressValue } = useCrossProgress(tokenIdBigInt);
  const { percentage: lpExProgressValue } = useLpExProgress(tokenIdBigInt);
  const { percentage: kolProgressValue } = useKolProgress(tokenIdBigInt);

  // 提取收益
  const { withdraw, isPending, isConfirming, isSuccess, hash } =
    useWithdrawKolAirdrop();
  const lastSuccessHashRef = useRef<string | undefined>(undefined);

  // 监听提取成功
  useEffect(() => {
    if (!isSuccess || !hash || lastSuccessHashRef.current === hash) {
      return;
    }
    lastSuccessHashRef.current = hash;
    if (isSuccess) {
      const common = t.common as Record<string, unknown>;
      toast.success(common.withdrawSuccess as string);
      // 刷新待收取收益和余额
      refetchCanWithdrawValue();
      refetchReserveBalance();
    }
  }, [
    isSuccess,
    hash,
    lang,
    t,
    refetchCanWithdrawValue,
    refetchReserveBalance,
  ]);

  // 领取收益
  const handleWithdraw = () => {
    if (tokenIdBigInt !== undefined) {
      withdraw(tokenIdBigInt);
    }
  };

  // 是否显示 KOL 进度（非 SOS 项目时显示）
  const showKolProgress = reserveInfo?.name !== "SOS";

  return (
    <div className="space-y-4">
      {/* 项目名称和余额 */}
      <div className="flex items-center justify-between py-3 bg-background-card rounded-xl">
        <span className="text-text-secondary text-sm">{reserveInfo?.name}</span>
        <div className="flex items-center gap-1">
          <span className="font-medium text-secondary">
            {parseFloat(reserveBalance).toFixed(2)}
          </span>
          <span className="text-primary font-medium">
            {reserveInfo?.symbol}
          </span>
        </div>
      </div>

      {/* 待领取收益 */}
      <div className="flex items-center justify-between py-3 bg-background-card rounded-xl">
        <div className="flex flex-col gap-1">
          <span className="text-text-secondary text-sm">
            {home.revenueCollected as string}
          </span>
          <span className="font-bold text-primary text-lg">
            {parseFloat(viewCanWithdrawValue).toFixed(4)}
          </span>
          <span className="text-primary text-[10px]">
            {reserveInfo?.symbol}
          </span>
        </div>
        {isConnected ? (
          <ConfirmButton
            onClick={handleWithdraw}
            disabled={isPending || isConfirming || parseFloat(viewCanWithdrawValue) === 0}
            className="btn-primary text-sm px-5 py-2"
            loading={isPending || isConfirming}
          >
            {home.receiveBenefits as string}
          </ConfirmButton>
        ) : (
          <button
            onClick={openConnectModal}
            className="btn-primary text-sm px-5 py-2"
          >
            {lang === "zh" ? "連接錢包" : "Connect Wallet"}
          </button>
        )}
      </div>

      {/* 进度信息 */}
      <div className="bg-background-card rounded-xl py-4 space-y-3">
        {/* 跨链进度 */}
        <div className="flex items-center justify-between">
          <span className="text-text-secondary text-sm">
            {home.crossChainProgress as string}
          </span>
          <span className="font-medium text-secondary">
            {crossProgressValue} %
          </span>
        </div>

        {/* LP 进度 */}
        <div className="flex items-center justify-between">
          <span className="text-text-secondary text-sm">
            {home.LpProgress as string}
          </span>
          <span className="font-medium text-secondary">
            {lpExProgressValue} %
          </span>
        </div>

        {/* KOL 进度 */}
        {showKolProgress && (
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">
              {home.KOLProgress as string}
            </span>
            <span className="font-medium text-secondary">
              {kolProgressValue} %
            </span>
          </div>
        )}
      </div>

      {/* 进度说明 */}
      <p className="text-xs text-error leading-5 text-left">
        {home.progressDesc as string}
      </p>
    </div>
  );
}
