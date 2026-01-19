'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { toast } from 'sonner';
import { useBalance, useAllowance, useApprove } from '@/hooks/useERC20';
import { useDeposit,  } from '@/hooks/useDepositContract';
import { CONTRACTS } from '@/constants/contracts';
import type { KolInfo } from '@/lib/api';

interface DepositSectionProps {
  kolInfo: KolInfo | null;
  onSuccess: () => void;
  t: Record<string, unknown>;
}

export function DepositSection({ kolInfo, onSuccess, t }: DepositSectionProps) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [amount, setAmount] = useState('');

  const kol = t.kol as Record<string, unknown>;
  const deposit = t.deposit as Record<string, unknown>;
  const common = t.common as Record<string, unknown>;
  const tips = kol.tips as string[];

  // 是否已认证
  const isCertified = kolInfo?.status === 1;

  // 获取余额
  const { formatted: sosBalance, decimals } = useBalance(
    CONTRACTS.SOS as `0x${string}`,
    address
  );

  // 获取最低质押金额
  const [minDeposit] = useState(100);

  // 三个质押范围（与 Vue 项目一致）
  const kolTypes = deposit.kolTypes as Record<string, string>;
  const stakeRanges = [
    { name: kolTypes?.joint || '聯合KOL', value: 100 },
    { name: kolTypes?.single || '單一KOL', value: 10000 },
    { name: kolTypes?.marketMaking || '銘文做市', value: 2100 },
  ];

  // 获取授权额度
  const { data: allowance, refetch: refetchAllowance } = useAllowance(
    CONTRACTS.SOS as `0x${string}`,
    address,
    CONTRACTS.PLEDGE as `0x${string}`
  );

  const hasAllowance = allowance ? Number(allowance) > 0 : false;

  // 授权
  const { 
    approve, 
    isPending: isApproving, 
    isConfirming: isApproveConfirming,
    isSuccess: isApproveSuccess,
  } = useApprove();

  // 质押
  const {
    deposit: doDeposit,
    isPending: isDepositing,
    isConfirming: isDepositConfirming,
    isSuccess: isDepositSuccess,
  } = useDeposit();

  // 授权成功后刷新授权状态
  useEffect(() => {
    if (isApproveSuccess) {
      toast.success(deposit.approveSuccess as string || '授權成功');
      refetchAllowance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproveSuccess]);

  // 质押成功后清空输入并刷新数据
  useEffect(() => {
    if (isDepositSuccess) {
      toast.success('質押成功');
      setAmount('');
      onSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDepositSuccess]);

  // 授权操作
  const handleApprove = () => {
    approve(
      CONTRACTS.SOS as `0x${string}`,
      CONTRACTS.PLEDGE as `0x${string}`
    );
  };

  // 质押操作
  const handleDeposit = () => {
    // 检查是否已认证
    if (!isCertified) {
      toast.error(deposit.kolCertificationRequired as string);
      return;
    }

    const amountNum = parseFloat(amount);

    // 检查最低金额
    if (amountNum < minDeposit) {
      toast.error(tips?.[4]?.replace('{minDeposit}', minDeposit.toString()) || `最低質押 ${minDeposit} SOS`);
      return;
    }

    // 检查余额
    if (amountNum > parseFloat(sosBalance)) {
      toast.error(t.noBalance as string || '餘額不足');
      return;
    }

    doDeposit(amount, decimals ? Number(decimals) : 18);
  };

  // 最大金额
  const handleMax = () => {
    setAmount(sosBalance);
  };

  const isLoading = isApproving || isApproveConfirming || isDepositing || isDepositConfirming;

  // 获取翻译
  const inputPlaceholder = kol.inputPlaceholder as Record<string, string>;
  const placeholderText = inputPlaceholder?.stakeAmount?.replace('{minDeposit}', minDeposit.toString()) 
    || `${kol.inputNumber} ≥ ${minDeposit} SOS`;

  return (
    <div>
      {/* 余额显示 */}
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-gray-400">{kol.balance as string}</span>
        <span className="text-white font-semibold">{parseFloat(sosBalance || '0').toFixed(0)} <span className="text-[#FFC519]">SOS</span></span>
      </div>

      {/* 输入框 */}
      <div className="w-full flex items-center bg-[#0D0D0F] border border-white/10 px-4 h-[50px] rounded-xl focus-within:border-[#FFC519] transition-colors">
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={placeholderText}
          className="flex-1 outline-none bg-transparent text-white text-sm placeholder:text-gray-500"
        />
        <button
          onClick={handleMax}
          className="bg-[#FFC519]/20 text-[#FFC519] text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#FFC519]/30 transition-colors"
        >
          {kol.max as string}
        </button>
      </div>

      {/* 质押范围展示 */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {stakeRanges.map((range, index) => (
          <div
            key={index}
            className="bg-[#0D0D0F] border border-white/10 rounded-xl p-3 text-center"
          >
            <div className="text-xs text-gray-400 mb-1">{range.name}</div>
            <div className="text-sm font-semibold text-[#FFC519]"><span className="text-xs">≥</span> {range.value} SOS</div>
          </div>
        ))}
      </div>

      {/* 提示文字 */}
      <p className="text-left text-xs text-red-500 mt-3">
        * {deposit.stakeNote as string}
      </p>

      {/* 按钮 */}
      {!isConnected ? (
        <button
          onClick={openConnectModal}
          className="btn-primary w-full mt-5"
        >
          {kol.connectWallet as string || '連接錢包'}
        </button>
      ) : !hasAllowance ? (
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="btn-primary w-full mt-5"
        >
          {isApproving || isApproveConfirming 
            ? (common.loading as string) 
            : (kol.goApprove as string)
          }
        </button>
      ) : (
        <button
          onClick={handleDeposit}
          disabled={isLoading || !amount}
          className="btn-primary w-full mt-5"
        >
          {isDepositing || isDepositConfirming 
            ? (common.loading as string) 
            : (kol.deposit as string)
          }
        </button>
      )}
    </div>
  );
}

