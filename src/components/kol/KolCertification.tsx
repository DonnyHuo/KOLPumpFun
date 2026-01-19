'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { kolApi, type KolInfo } from '@/lib/api';
import { Copy } from 'lucide-react';
import { shortAddress, copyToClipboard } from '@/lib/utils';

interface KolCertificationProps {
  kolInfo: KolInfo | null;
  onSuccess: () => void;
  t: Record<string, unknown>;
}

// 币安广场默认链接（与 Vue 项目一致，不允许用户修改）
const DEFAULT_BINANCE_URL = 'https://accounts.binance.com/zh-CN/login?return_to=aHR0cHM6Ly93d3cuYmluYW5jZS5jb20vemgtQ04vc3F1YXJl';

export function KolCertification({ kolInfo, onSuccess, t }: KolCertificationProps) {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [twitterUrl, setTwitterUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  // 币安广场使用默认链接，不允许用户修改
  const binanceUrl = kolInfo?.discord_account || DEFAULT_BINANCE_URL;

  const kol = t.kol as Record<string, unknown>;
  const common = t.common as Record<string, unknown>;
  const inputPlaceholder = kol.inputPlaceholder as Record<string, string>;

  // 同步 kolInfo 数据
  useEffect(() => {
    if (kolInfo) {
      setTwitterUrl(kolInfo.twitter_account || '');
      setTelegramUrl(kolInfo.tg_account || '');
    }
  }, [kolInfo]);

  // 是否已提交过认证（只要有 kolInfo 数据就表示已提交）
  const hasSubmitted = !!kolInfo;

  const handleCopyAddress = async () => {
    if (address) {
      const success = await copyToClipboard(address);
      if (success) {
        toast.success(common.copySuccess as string || '複製成功');
      }
    }
  };

  const tips = kol.tips as string[];

  const handleSubmit = async () => {
    if (!address) return;
    
    if (!twitterUrl) {
      toast.error(tips?.[5] || 'Please enter Twitter URL');
      return;
    }

    setLoading(true);
    try {
      const res = await kolApi.certify({
        address,
        twitter_account: twitterUrl,
        tg_account: telegramUrl || undefined,
        discord_account: binanceUrl || undefined,
      });

      if (res.message === 'success') {
        toast.success(common.success as string || 'Success');
        onSuccess();
      } else {
        toast.error(res.message || (common.failed as string) || 'Failed');
      }
    } catch (error) {
      toast.error((common.failed as string) || 'Failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 输入框样式 - Web3 暗色风格
  const inputClass = "bg-[#0D0D0F] border border-white/10 w-full h-[44px] text-sm rounded-xl px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#FFC519] transition-colors disabled:bg-[#0D0D0F]/50 disabled:text-gray-400";
  
  return (
    <div className="text-sm">
      {/* 表单 - 两列布局 */}
      <div className="flex items-start justify-between gap-4 text-xs">
        {/* 钱包地址 */}
        <div className="flex flex-col gap-2 text-left w-full">
          <span className="text-gray-400">
            <span className="text-red-400 pr-0.5">*</span>{kol.revenueAddress as string}
          </span>
          <div className="relative">
            <input
              disabled
              type="text"
              value={address ? shortAddress(address) : '--'}
              className={inputClass}
            />
            {address && (
              <button
                onClick={handleCopyAddress}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <Copy className="w-4 h-4 text-gray-500 hover:text-[#FFC519] transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* Twitter */}
        <div className="flex flex-col gap-2 text-left w-full">
          <span className="text-gray-400">
            <span className="text-red-400 pr-0.5">*</span>{kol.twitterAddress as string}
          </span>
          <input
            type="text"
            value={twitterUrl}
            onChange={(e) => setTwitterUrl(e.target.value)}
            placeholder={inputPlaceholder?.twitter || 'https://x.com/xxx'}
            disabled={hasSubmitted}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-start justify-between mt-4 gap-4 text-xs">
        {/* Telegram */}
        <div className="flex flex-col gap-2 text-left w-full">
          <span className="text-gray-400">{kol.telegramAddress as string}</span>
          <input
            type="text"
            value={telegramUrl}
            onChange={(e) => setTelegramUrl(e.target.value)}
            placeholder={inputPlaceholder?.telegram || 'https://t.me/xxx'}
            disabled={hasSubmitted}
            className={inputClass}
          />
        </div>

        {/* 币安广场 */}
        <div className="flex flex-col gap-2 text-left w-full">
          <span className="text-gray-400">{kol.binanceSquare as string}</span>
          <input
            type="text"
            value={binanceUrl}
            readOnly
            disabled
            className={inputClass}
          />
        </div>
      </div>

      {/* 提示文字 */}
      <p className="mt-4 text-xs text-red-400 text-left leading-5">
        *{kol.desc1 as string}
      </p>

      {/* 提交按钮 - 只有未提交过认证时显示 */}
      {!hasSubmitted && (
        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={loading || !twitterUrl}
            className="btn-primary w-full"
          >
            {loading ? (common.loading as string) : (kol.submit as string)}
          </button>
        </div>
      )}
    </div>
  );
}

