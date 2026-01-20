"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useConnection } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import dayjs from "dayjs";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@/store/useStore";
import { useBalance, useTransfer } from "@/hooks/useERC20";
import { kolApi, type PrivateFundOrder } from "@/lib/api";
import { CONTRACTS } from "@/constants/contracts";
import { Progress } from "@/components/ui/Progress";
import zhCN from "@/i18n/zh-CN";
import enUS from "@/i18n/en-US";
import { goBack1 } from "@/assets/images";
import ConfirmButton from "@/components/ui/ConfirmButton";

// 短地址
function shortStr(str?: string, start = 6, end = 4): string {
  if (!str) return "";
  if (str.length <= start + end) return str;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

// 项目类型
function getProjectType(type: string | number, t: typeof zhCN): string {
  const typeNum = typeof type === "string" ? parseInt(type) : type;
  switch (typeNum) {
    case 0:
      return t.poolDetail.projectTypes.joint;
    case 1:
      return t.poolDetail.projectTypes.single;
    case 2:
      return t.poolDetail.projectTypes.marketMaking;
    default:
      return "";
  }
}

export default function EarlyBirdDetailPage() {
  const router = useRouter();
  const { address, isConnected } = useConnection();
  const { openConnectModal } = useConnectModal();
  const { lang, currentProject } = useStore();
  const t = lang === "zh" ? zhCN : enUS;

  // 从 store 获取池子信息
  // airdrop_process_percent 格式: "总量,百分比"
  const processPercent =
    currentProject?.airdrop_process_percent?.split(",")[1] || "0";

  const poolInfo = {
    id: String(currentProject?.mint_pool_id || 0),
    symbol: currentProject?.symbol || "",
    logoUrl: currentProject?.logo_url || "",
    details: currentProject?.details || "",
    createTime: currentProject?.mint_pool_create_time || "",
    processPercent,
    type: String(currentProject?.project_type || 0),
    contract: currentProject?.contract_addr || "",
    exchangeRate: String(currentProject?.exchange_rate || 1),
    token: "SOS",
    mintStatus: currentProject?.mint_status,
  };

  // 如果没有项目信息，返回列表页
  useEffect(() => {
    if (!currentProject) {
      router.replace("/share");
    }
  }, [currentProject, router]);

  const [amount, setAmount] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [onlyMe, setOnlyMe] = useState(false);

  // SOS 余额
  const { formatted: sosBalance, refetch: refetchBalance } = useBalance(
    CONTRACTS.SOS as `0x${string}`,
    address as `0x${string}`
  );

  // 转账 hook
  const {
    transfer,
    isPending: isTransferring,
    isSuccess,
    hash,
  } = useTransfer();

  const contractAddr = currentProject?.contract_addr;
  const userAddress = onlyMe ? address : undefined;
  const {
    data: ordersData,
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery<{ data: PrivateFundOrder[] }>({
    queryKey: ["projectPrivateFundList", contractAddr, onlyMe, address],
    queryFn: async () => {
      if (!contractAddr) {
        return { data: [] };
      }
      return kolApi.getProjectPrivateFundList(contractAddr, userAddress);
    },
    enabled: Boolean(contractAddr) && (!onlyMe || Boolean(address)),
  });
  const orders = ordersData?.data || [];
  const recordOrderMutation = useMutation({
    mutationFn: (data: {
      pool_id: number;
      address: string;
      token: string;
      spent_amount: string;
      spend_txid: string;
    }) => kolApi.projectPrivateFund(data),
    onSuccess: () => {
      toast.success(t.common.success);
      refetchOrders();
      refetchBalance();
      setAmount("");
    },
    onError: () => {
      toast.error(t.common.failed);
    },
  });

  // 切换 onlyMe 时重新获取订单
  const handleToggleOnlyMe = () => {
    setOnlyMe((prev) => !prev);
  };

  // 交易成功后刷新
  useEffect(() => {
    if (isSuccess && hash) {
      // 记录订单
      recordOrderMutation.mutate({
        pool_id: Number(poolInfo.id),
        address: address || "",
        token: poolInfo.contract,
        spent_amount: String(parseFloat(amount) * 10 ** 18),
        spend_txid: hash,
      });
    }
  }, [
    isSuccess,
    hash,
    poolInfo.id,
    poolInfo.contract,
    address,
    amount,
    t.common.success,
    t.common.failed,
    refetchOrders,
    refetchBalance,
    recordOrderMutation,
  ]);

  // 快捷金额按钮
  const changeAmount = (value: number) => {
    setAmount(String(value));
  };

  // 验证金额必须为100的倍数
  const validateAmount = () => {
    const numAmount = parseFloat(amount);
    if (numAmount && numAmount % 100 !== 0) {
      toast.warning(t.poolDetail.inputMultipleOf100);
      const roundedAmount = Math.floor(numAmount / 100) * 100;
      setAmount(String(roundedAmount));
    }
  };

  // 购买
  const handleBuy = async () => {
    if (!amount || !address) return;

    // 验证金额是否为100的倍数
    const numAmount = parseFloat(amount);
    if (numAmount % 100 !== 0) {
      toast.warning(t.poolDetail.inputMultipleOf100);
      return;
    }

    setBuyLoading(true);
    try {
      transfer(
        CONTRACTS.SOS as `0x${string}`,
        "0xc4c7b70750e1dd5992e096c433c63741b86f5966" as `0x${string}`,
        parseUnits(amount, 18)
      );
    } catch (error) {
      console.error("Buy failed:", error);
      toast.error(t.common.failed);
    } finally {
      setBuyLoading(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const numBalance = parseFloat(sosBalance) || 0;
  const isDisabled =
    numAmount === 0 || numBalance < numAmount || isTransferring || buyLoading;

  console.log("poolInfo", poolInfo);

  const closeStatus = useMemo(() => {
    return poolInfo.mintStatus === 3 || poolInfo.mintStatus === 5;
  }, [poolInfo.mintStatus]);

  return (
    <div className="min-h-full bg-background pb-6">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl bg-background-card border border-border flex items-center justify-center hover:bg-card-hover transition-colors"
        >
          <Image
            src={goBack1}
            alt="back"
            width={20}
            height={20}
            className="opacity-80"
            style={{
              filter: "brightness(0) saturate(100%) invert(var(--icon-invert))",
            }}
          />
        </button>
      </div>

      {/* Token Image */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl overflow-hidden bg-background-card border border-border">
          <Image
            src={poolInfo.logoUrl || "/images/default-token.png"}
            alt={poolInfo.symbol}
            width={500}
            height={300}
            className="w-full h-auto object-contain"
            unoptimized
          />
        </div>
      </div>

      {/* Token Info */}
      <div className="px-4 mt-4 text-left">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl font-bold text-secondary">
            {poolInfo.symbol}
          </span>
          <span className="bg-primary/10 border border-primary text-xs text-primary rounded-full px-3 py-1 font-medium">
            {getProjectType(poolInfo.type, t)}
          </span>
          <span
            className={`text-xs rounded-full px-3 py-1 font-medium ${
              closeStatus
                ? "bg-red-500/10 text-red-400 border border-red-400/30"
                : "bg-primary text-black"
            }`}
          >
            {closeStatus ? t.poolDetail.statusClosed : t.poolDetail.statusOpen}
          </span>
        </div>
        <p className="text-sm text-text-secondary mb-2">{poolInfo.details}</p>
        {poolInfo.createTime && (
          <p className="text-xs text-text-muted">
            {t.poolDetail.createTime}{" "}
            {dayjs(poolInfo.createTime).format("YYYY-MM-DD HH:mm:ss")}
          </p>
        )}
        {/* Progress */}
        {!closeStatus && (
          <>
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">
                  {t.poolDetail.launchProgress}
                </span>
                <span className="text-secondary font-bold">
                  {Number(poolInfo.processPercent) < 0.01
                    ? "<0.01"
                    : Number(poolInfo.processPercent).toFixed(4)}
                  %
                </span>
              </div>
              <Progress
                value={Number(poolInfo.processPercent)}
                color="yellow"
              />
            </div>
          </>
        )}
      </div>
      {/* Buy Section */}
      {!closeStatus && (
        <div className="px-4 mt-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-secondary font-bold">{t.poolDetail.buy}</span>
            <span className="text-sm text-text-secondary">
              {t.poolDetail.balance}：{parseFloat(sosBalance).toFixed(2)} SOS
            </span>
          </div>

          {/* Input */}
          <div className="card flex items-center justify-between gap-4">
            <span className="text-text-secondary text-sm">
              {t.poolDetail.payment}
            </span>
            <div className="flex flex-1 items-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={validateAmount}
                placeholder={t.poolDetail.inputAmount}
                className="bg-transparent text-right text-secondary w-24 outline-none flex-1"
              />
              <span className="text-secondary font-medium shrink-0">SOS</span>
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="flex gap-2 mt-4">
            {[100, 200, 500, 1000].map((val) => (
              <button
                key={val}
                onClick={() => changeAmount(val)}
                className="flex-1 py-3 rounded-xl bg-background-card text-secondary font-bold text-sm hover:bg-card-hover transition-colors border border-border"
              >
                {val}
              </button>
            ))}
          </div>

          {/* Buy Button */}
          {!isConnected ? (
            <button
              onClick={openConnectModal}
              className="btn-primary w-full mt-6"
            >
              {lang === "zh" ? "連接錢包" : "Connect Wallet"}
            </button>
          ) : (
            <ConfirmButton
              onClick={handleBuy}
              disabled={isDisabled}
              className="btn-primary w-full mt-6"
              loading={isTransferring || buyLoading}
            >
              {t.poolDetail.buyToken}
            </ConfirmButton>
          )}
        </div>
      )}

      {/* Orders Section */}
      <div className="px-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-secondary font-bold">
            {t.poolDetail.allOrders}
          </span>
          {/* 只有连接钱包后才显示 Only Me 开关 */}
          {address && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">
                {t.poolDetail.onlyMe}
              </span>
              <button
                onClick={handleToggleOnlyMe}
                className={`w-11 h-6 rounded-full transition-all duration-300 relative ${
                  onlyMe
                    ? "bg-primary shadow-[0_0_10px_var(--glow-primary)]"
                    : "bg-card-hover"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                    onlyMe ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {ordersLoading ? (
          <div className="h-75 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC519]"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state py-12">
            <span className="text-4xl mb-4">📭</span>
            <p>{t.common.noData}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.order_id} className="card space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {t.poolDetail.orders.orderId}
                  </span>
                  <span className="text-secondary">{order.order_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {t.poolDetail.orders.address}
                  </span>
                  <span className="text-secondary">
                    {shortStr(order.address)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {t.poolDetail.orders.token}
                  </span>
                  <span className="text-secondary">
                    {shortStr(order.token)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {t.poolDetail.orders.spendAmount}
                  </span>
                  <span className="text-secondary">
                    {(parseFloat(order.a_amount) / 10 ** 18).toFixed(0)} SOS
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {t.poolDetail.orders.txId}
                  </span>
                  <a
                    href={`https://bscscan.com/tx/${order.spend_txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    {shortStr(order.spend_txid)}
                  </a>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {t.poolDetail.orders.time}
                  </span>
                  <span className="text-secondary">
                    {dayjs(order.updated_at).format("YYYY-MM-DD HH:mm:ss")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
