"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuitKol, useTokenRatiosIndex } from "@/hooks/useKolContract";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { KolInfo } from "@/lib/api";
import ConfirmButton from "../ui/ConfirmButton";

interface WithdrawSectionProps {
  kolInfo: KolInfo | null;
  activeAmount: number;
  onSuccess: () => void;
  t: Record<string, unknown>;
}

export function WithdrawSection({
  kolInfo,
  activeAmount,
  onSuccess,
  t,
}: WithdrawSectionProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const home = t.home as Record<string, unknown>;
  const common = t.common as Record<string, unknown>;

  // 获取项目 tokenId
  const { data: tokenId } = useTokenRatiosIndex(kolInfo?.project_name || "");

  // 退出 KOL
  const {
    quitKol,
    isPending: isQuitting,
    isConfirming: isQuitConfirming,
    isSuccess: isQuitSuccess,
  } = useQuitKol();

  // 退出成功
  useEffect(() => {
    if (isQuitSuccess) {
      toast.success("退出KOL成功");
      queueMicrotask(() => setShowConfirm(false));
      onSuccess();
    }
  }, [isQuitSuccess, onSuccess]);

  const handleQuitKol = () => {
    quitKol(Number(tokenId));
  };

  const isLoading = isQuitting || isQuitConfirming;

  return (
    <div>
      <div className="text-left flex flex-col gap-4">
        {/* 质押数量显示 */}
        <div className="text-sm text-text-secondary">
          {(home.dispositNumber as string) || "質押數量"}
        </div>
        <div className="bg-background-card border border-border h-12.5 flex items-center justify-between px-4 rounded-xl">
          <span className="text-xl font-bold text-secondary">
            {activeAmount.toFixed(2)}
          </span>
          <span className="text-primary font-semibold">SOS</span>
        </div>

        {/* 提示文字 */}
        <div className="text-red-500 text-xs leading-5">
          {(home.dispositDesc as string) ||
            "解除SOS質押，將即時終止KOL資格，且不可申請複效，謹慎操作。"}
        </div>

        {/* 解除质押按钮 */}
        <ConfirmButton
          onClick={() => setShowConfirm(true)}
          disabled={!(activeAmount > 0) || isLoading || tokenId === undefined}
          className="btn-primary w-full mt-2"
          loading={isLoading}
        >
          {(home.liftDisposit as string)}
        </ConfirmButton>
      </div>

      {/* 确认弹窗 */}
      <ConfirmDialog
        open={showConfirm}
        title={(home.unstake as string) || "解除質押"}
        message={(home.unstakeDesc as string) || "解除質押即終止KOL資格。"}
        confirmText={(common.confirm as string) || "確認"}
        cancelText={(common.cancel as string) || "取消"}
        loading={isLoading}
        onConfirm={handleQuitKol}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
