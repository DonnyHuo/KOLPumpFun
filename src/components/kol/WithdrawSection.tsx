'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuitKol, useTokenRatiosIndex } from '@/hooks/useKolContract';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { KolInfo } from '@/lib/api';

interface WithdrawSectionProps {
  kolInfo: KolInfo | null;
  activeAmount: number;
  onSuccess: () => void;
  t: Record<string, unknown>;
}

export function WithdrawSection({ kolInfo, activeAmount, onSuccess, t }: WithdrawSectionProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const home = t.home as Record<string, unknown>;
  const common = t.common as Record<string, unknown>;

  // 获取项目 tokenId
  const { data: tokenId } = useTokenRatiosIndex(kolInfo?.project_name || '');

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
      toast.success('退出KOL成功');
      setShowConfirm(false);
      onSuccess();
    }
  }, [isQuitSuccess, onSuccess]);

  const handleQuitKol = () => {
    if (!tokenId) {
      toast.error('無法獲取項目信息');
      return;
    }
    quitKol(Number(tokenId));
  };

  const isLoading = isQuitting || isQuitConfirming;

  return (
    <div>
      <div className="text-left flex flex-col gap-4">
        {/* 质押数量显示 */}
        <div className="text-sm text-gray-400">{home.dispositNumber as string || '質押數量'}</div>
        <div className="bg-[#0D0D0F] border border-white/10 h-[50px] flex items-center justify-between px-4 rounded-xl">
          <span className="text-xl font-bold text-white">{activeAmount.toFixed(2)}</span>
          <span className="text-[#FFC519] font-semibold">SOS</span>
        </div>

        {/* 提示文字 */}
        <div className="text-red-400 text-xs leading-5">
          {home.dispositDesc as string || '解除SOS質押，將即時終止KOL資格，且不可申請複效，謹慎操作。'}
        </div>

        {/* 解除质押按钮 */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!(activeAmount > 0) || isLoading}
          className="btn-primary w-full mt-2"
        >
          {isLoading ? (common.loading as string || '加載中...') : (home.liftDisposit as string || '解除質押')}
        </button>
      </div>

      {/* 确认弹窗 */}
      <ConfirmDialog
        open={showConfirm}
        title={home.unstake as string || '解除質押'}
        message={home.unstakeDesc as string || '解除質押即終止KOL資格。'}
        confirmText={common.confirm as string || '確認'}
        cancelText={common.cancel as string || '取消'}
        loading={isLoading}
        onConfirm={handleQuitKol}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

