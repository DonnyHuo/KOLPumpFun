"use client";

import { useState } from "react";
import { useConnection } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { kolApi, type KolInfo } from "@/lib/api";
import { Copy, ExternalLink } from "lucide-react";
import { shortAddress, copyToClipboard } from "@/lib/utils";
import ConfirmButton from "../ui/ConfirmButton";

interface KolCertificationProps {
  kolInfo: KolInfo | null;
  onSuccess: () => void;
  t: Record<string, unknown>;
}

// 官推链接
const OFFICIAL_TWITTER_URL = "https://x.com/SmartBTCdao";

export function KolCertification({
  kolInfo,
  onSuccess,
  t,
}: KolCertificationProps) {
  const { address, isConnected } = useConnection();
  const { openConnectModal } = useConnectModal();
  const [twitterUrl, setTwitterUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const queryClient = useQueryClient();
  // 官推链接
  const officialTwitterUrl = OFFICIAL_TWITTER_URL;

  const kol = t.kol as Record<string, unknown>;
  const common = t.common as Record<string, unknown>;
  const inputPlaceholder = kol.inputPlaceholder as Record<string, string>;

  // 是否已提交过认证（只要有 kolInfo 数据就表示已提交）
  const hasSubmitted = !!kolInfo;
  const displayTwitterUrl = hasSubmitted
    ? kolInfo?.twitter_account || ""
    : twitterUrl;
  const displayTelegramUrl = hasSubmitted ? kolInfo?.tg_account || "" : telegramUrl;

  const handleCopyAddress = async () => {
    if (address) {
      const success = await copyToClipboard(address);
      if (success) {
        toast.success((common.copySuccess as string) || "複製成功");
      }
    }
  };

  const tips = kol.tips as string[];

  const handleSubmit = async () => {
    if (!address) return;

    if (!twitterUrl) {
      toast.error(tips?.[1] || "Please enter a valid X address");
      return;
    }

    try {
      await certifyMutation.mutateAsync({
        address,
        twitter_account: twitterUrl,
        tg_account: telegramUrl || undefined,
        discord_account: officialTwitterUrl || undefined,
      });

      // 与 Vue 项目一致：只要请求成功就显示成功提示
      toast.success(tips?.[5] || "已提交認證申請");
      onSuccess();
    } catch (error) {
      toast.error((common.failed as string) || "Failed");
      console.error(error);
    }
  };
  const certifyMutation = useMutation({
    mutationFn: (data: {
      address: string;
      twitter_account: string;
      tg_account?: string;
      discord_account?: string;
    }) => kolApi.certify(data),
    onSuccess: () => {
      if (address) {
        queryClient.invalidateQueries({ queryKey: ["kolInfo", address] });
      }
    },
  });

  // 输入框样式 - 适配主题
  const inputClass =
    "bg-background-card border border-border w-full h-[44px] text-sm rounded-xl px-4 text-secondary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors disabled:bg-background-card/50 disabled:text-text-muted";

  return (
    <div className="text-sm">
      {/* 表单 - 两列布局 */}
      <div className="flex items-start justify-between gap-4 text-xs">
        {/* 钱包地址 */}
        <div className="flex flex-col gap-2 text-left w-full">
          <span className="text-text-secondary">
            <span className="text-red-500 pr-0.5">*</span>
            {kol.revenueAddress as string}
          </span>
          <div className="relative">
            {isConnected ? (
              <>
                <input
                  disabled
                  type="text"
                  value={address ? shortAddress(address) : "--"}
                  className={inputClass}
                />
                {address && (
                  <button
                    onClick={handleCopyAddress}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <Copy className="w-4 h-4 text-text-muted hover:text-primary transition-colors" />
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={openConnectModal}
                className="bg-[#FFC519] hover:bg-[#FFD54F] text-black font-medium w-full h-11 text-sm rounded-xl px-4 transition-colors"
              >
                {(kol.connectWallet as string) || "連接錢包"}
              </button>
            )}
          </div>
        </div>

        {/* Twitter */}
        <div className="flex flex-col gap-2 text-left w-full">
          <span className="text-text-secondary">
            <span className="text-red-500 pr-0.5">*</span>
            {kol.twitterAddress as string}
          </span>
          <input
            type="text"
            value={displayTwitterUrl}
            onChange={(e) => setTwitterUrl(e.target.value)}
            placeholder={inputPlaceholder?.twitter || "https://x.com/xxx"}
            disabled={hasSubmitted}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-start justify-between mt-4 gap-4 text-xs">
        {/* Telegram */}
        <div className="flex flex-col gap-2 text-left w-full">
          <span className="text-text-secondary">
            {kol.telegramAddress as string}
          </span>
          <input
            type="text"
            value={displayTelegramUrl}
            onChange={(e) => setTelegramUrl(e.target.value)}
            placeholder={inputPlaceholder?.telegram || "https://t.me/xxx"}
            disabled={hasSubmitted}
            className={inputClass}
          />
        </div>

        {/* 关注官推 */}
        <div className="flex flex-col gap-2 text-left w-full">
          <span className="text-text-secondary">
            {kol.binanceSquare as string}
          </span>
          <a
            href={officialTwitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${inputClass} bg-[#0D0D0F]/50 flex items-center justify-between cursor-pointer hover:border-white/10 focus:border-white/10`}
          >
            <span>@SmartBTCdao</span>
            <ExternalLink className="w-4 h-4 text-text-muted" />
          </a>
        </div>
      </div>

      {/* 提示文字 */}
      <p className="mt-4 text-xs text-red-500 text-left leading-5">
        *{kol.desc1 as string}
      </p>

      {/* 提交按钮 - 只有未提交过认证时显示 */}
      {!hasSubmitted && (
        <div className="mt-6">
          <ConfirmButton
            onClick={handleSubmit}
            disabled={certifyMutation.isPending || !twitterUrl}
            className="btn-primary w-full"
            loading={certifyMutation.isPending}
          >
            {(kol.submit as string)}
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}
