"use client";

import { useState, useEffect } from "react";
import { useConnection } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import { useBalance, useAllowance, useApprove } from "@/hooks/useERC20";
import { useDeposit } from "@/hooks/useDepositContract";
import { CONTRACTS } from "@/constants/contracts";
import type { KolInfo } from "@/lib/api";
import ConfirmButton from "../ui/ConfirmButton";

interface DepositSectionProps {
  kolInfo: KolInfo | null;
  onSuccess: () => void;
  t: Record<string, unknown>;
}

export function DepositSection({ kolInfo, onSuccess, t }: DepositSectionProps) {
  const { address, isConnected } = useConnection();
  const { openConnectModal } = useConnectModal();
  const [amount, setAmount] = useState("");
  const [selectedType, setSelectedType] = useState<"joint" | "single">("joint");

  const kol = t.kol as Record<string, unknown>;
  const deposit = t.deposit as Record<string, unknown>;
  const home = t.home as Record<string, unknown>;

  // 是否已认证
  const isCertified = kolInfo?.status === 1;

  // 获取余额
  const { formatted: sosBalance, decimals } = useBalance(
    CONTRACTS.SOS as `0x${string}`,
    address,
  );

  // 三个质押范围
  const kolTypes = deposit.kolTypes as Record<string, string>;
  const stakeRanges = [
    {
      name: kolTypes?.joint || "聯合KOL",
      value: 1,
      max: 19999,
      type: "joint" as const,
    },
    {
      name: kolTypes?.single || "單一KOL",
      value: 20000,
      max: 20000,
      type: "single" as const,
    },
    {
      name: (home?.claimProject as string) || "銘文做市",
      value: 1000,
      type: null,
    },
  ];

  // 当选择类型变化时，更新金额
  useEffect(() => {
    if (selectedType === "single") {
      setAmount("20000");
    } else if (selectedType === "joint" && amount === "20000") {
      setAmount("");
    }
  }, [selectedType, amount]);

  // 获取授权额度
  const { data: allowance, refetch: refetchAllowance } = useAllowance(
    CONTRACTS.SOS as `0x${string}`,
    address,
    CONTRACTS.PLEDGE as `0x${string}`,
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
      toast.success((deposit.approveSuccess as string) || "授權成功");
      refetchAllowance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproveSuccess]);

  // 质押成功后清空输入并刷新数据
  useEffect(() => {
    if (isDepositSuccess) {
      toast.success("質押成功");
      setAmount("");
      onSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDepositSuccess]);

  // 授权操作
  const handleApprove = () => {
    approve(CONTRACTS.SOS as `0x${string}`, CONTRACTS.PLEDGE as `0x${string}`);
  };

  // 处理输入，限制为正整数
  const handleAmountChange = (value: string) => {
    // 单一KOL固定20000，不允许修改
    if (selectedType === "single") {
      return;
    }

    // 联合KOL：只允许输入正整数
    if (value === "") {
      setAmount(value);
      return;
    }

    // 验证是否为正整数
    const regex = /^\d+$/;
    if (regex.test(value)) {
      const num = parseInt(value);
      // 限制范围：1 到 19999
      if (num >= 1 && num <= 19999) {
        setAmount(value);
      } else if (num > 19999) {
        setAmount("19999");
      }
    }
  };

  // 质押操作
  const handleDeposit = () => {
    // 检查是否已认证
    if (!isCertified) {
      toast.error(deposit.kolCertificationRequired as string);
      return;
    }

    const amountNum = parseFloat(amount);

    // 根据选择类型验证金额
    if (selectedType === "joint") {
      // 联合KOL：1 到 19999
      if (amountNum < 1 || amountNum > 19999 || !Number.isInteger(amountNum)) {
        toast.error("聯合KOL質押量必須為 1-19999 的正整數");
        return;
      }
    } else if (selectedType === "single") {
      // 单一KOL：固定20000
      if (amountNum !== 20000) {
        toast.error("單一KOL質押量必須為 20000 SOS");
        return;
      }
    }

    // 检查余额
    if (amountNum > parseFloat(sosBalance)) {
      toast.error((t.noBalance as string) || "餘額不足");
      return;
    }

    doDeposit(amount, decimals ? Number(decimals) : 18);
  };

  // 最大金额
  const handleMax = () => {
    setAmount(sosBalance);
  };

  const isLoading =
    isApproving || isApproveConfirming || isDepositing || isDepositConfirming;

  // 获取翻译
  const getPlaceholderText = () => {
    if (selectedType === "single") {
      return "20000";
    }
    // 联合KOL：显示范围提示
    return "請輸入 1-19999 SOS";
  };

  return (
    <div>
      {/* 余额显示 */}
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-text-secondary">{kol.balance as string}</span>
        <span className="text-secondary font-semibold">
          {parseFloat(sosBalance || "0").toFixed(0)}{" "}
          <span className="text-primary">SOS</span>
        </span>
      </div>

      {/* 质押类型选择 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {stakeRanges.slice(0, 2).map((range) => (
          <button
            key={range.type}
            onClick={() => {
              if (range.type) {
                setSelectedType(range.type);
              }
            }}
            className={`rounded-xl p-3 text-center transition-all ${selectedType === range.type
                ? "bg-primary/10 border border-primary"
                : "bg-background-card border border-border hover:border-primary/30"
              }`}
          >
            <div className="text-xs text-text-secondary mb-1">{range.name}</div>
            <div className="text-sm font-semibold text-primary">
              {range.type === "joint" ? (
                <>
                  <span className="text-xs">1-19999</span> SOS
                </>
              ) : (
                <>20000 SOS</>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* 输入框 */}
      <div className="w-full flex items-center bg-background-card border border-border px-4 h-12.5 rounded-xl focus-within:border-primary transition-colors">
        <input
          type="text"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder={getPlaceholderText()}
          disabled={selectedType === "single"}
          className="flex-1 outline-none bg-transparent text-secondary text-sm placeholder:text-text-muted disabled:text-text-muted disabled:cursor-not-allowed"
        />
        {selectedType === "joint" && (
          <button
            onClick={handleMax}
            className="bg-primary/20 text-primary text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/30 transition-colors"
          >
            {kol.max as string}
          </button>
        )}
      </div>

      {/* 第三个质押范围（仅展示） */}
      {/* <div className="mt-3">
        <div className="bg-background-card border border-border rounded-xl p-3 text-center opacity-60">
          <div className="text-xs text-text-secondary mb-1">{stakeRanges[2].name}</div>
          <div className="text-sm font-semibold text-text-secondary">
            <span className="text-xs">≥</span> {stakeRanges[2].value} SOS
          </div>
        </div>
      </div> */}

      {/* 提示文字 */}
      <p className="text-left text-xs text-red-500 mt-3">
        * {deposit.stakeNote as string}
      </p>

      {/* 按钮 */}
      {!isConnected ? (
        <button onClick={openConnectModal} className="btn-primary w-full mt-5">
          {(kol.connectWallet as string) || "連接錢包"}
        </button>
      ) : !hasAllowance ? (
        <ConfirmButton
          onClick={handleApprove}
          disabled={isLoading}
          className="btn-primary w-full mt-5"
          loading={isApproving || isApproveConfirming}
        >
          {kol.goApprove as string}
        </ConfirmButton>
      ) : (
        <ConfirmButton
          onClick={handleDeposit}
          disabled={isLoading || !amount}
          className="btn-primary w-full mt-5"
          loading={isDepositing || isDepositConfirming}
        >
          {kol.deposit as string}
        </ConfirmButton>
      )}
    </div>
  );
}
