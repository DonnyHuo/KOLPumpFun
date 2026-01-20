"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import dayjs from "dayjs";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { useStore } from "@/store/useStore";
import { useBalance, useTransfer } from "@/hooks/useERC20";
import { kolApi, type PrivateFundOrder } from "@/lib/api";
import { CONTRACTS } from "@/constants/contracts";
import { Progress } from "@/components/ui/Progress";
import zhCN from "@/i18n/zh-CN";
import enUS from "@/i18n/en-US";
import { goBack1 } from "@/assets/images";

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
  const { address, isConnected } = useAccount();
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
  };

  // 如果没有项目信息，返回列表页
  useEffect(() => {
    if (!currentProject) {
      router.replace("/share");
    }
  }, [currentProject, router]);

  const [amount, setAmount] = useState("");
  const [orders, setOrders] = useState<PrivateFundOrder[]>([]);
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

  // 获取订单列表
  const fetchOrders = useCallback(
    async (filterOnlyMe?: boolean) => {
      const contractAddr = currentProject?.contract_addr;
      if (!contractAddr) return;

      // 使用传入的参数或当前状态
      const shouldFilterOnlyMe =
        filterOnlyMe !== undefined ? filterOnlyMe : onlyMe;

      // 构建请求参数
      const userAddress = shouldFilterOnlyMe ? address : undefined;

      console.log("fetchOrders params:", {
        contractAddr,
        shouldFilterOnlyMe,
        userAddress,
      });

      try {
        const res = await kolApi.getProjectPrivateFundList(
          contractAddr,
          userAddress
        );
        setOrders(res.data || []);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      }
    },
    [currentProject?.contract_addr, onlyMe, address]
  );

  // 初始加载订单
  useEffect(() => {
    fetchOrders();
  }, [currentProject?.contract_addr, address]);

  // 切换 onlyMe 时重新获取订单
  const handleToggleOnlyMe = () => {
    const newValue = !onlyMe;
    setOnlyMe(newValue);
    // 直接使用新值调用，避免状态更新延迟问题
    fetchOrders(newValue);
  };

  // 交易成功后刷新
  useEffect(() => {
    if (isSuccess && hash) {
      // 记录订单
      kolApi
        .projectPrivateFund({
          pool_id: Number(poolInfo.id),
          address: address || "",
          token: poolInfo.contract,
          spent_amount: String(parseFloat(amount) * 10 ** 18),
          spend_txid: hash,
        })
        .then(() => {
          toast.success(t.common.success);
          fetchOrders();
          refetchBalance();
          setAmount("");
        })
        .catch((err) => {
          console.error("Failed to record order:", err);
          toast.error(t.common.failed);
        });
    }
  }, [isSuccess, hash]);

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
        "0x9b816a835d55351bfdb2eb5ad056160ff47fc079" as `0x${string}`,
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
          <span className="bg-primary text-xs text-black rounded-full px-3 py-1 font-medium">
            {getProjectType(poolInfo.type, t)}
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
          <Progress value={Number(poolInfo.processPercent)} color="yellow" />
        </div>
      </div>

      {/* Buy Section */}
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
          <button
            onClick={handleBuy}
            disabled={isDisabled}
            className="btn-primary w-full mt-6"
          >
            {isTransferring || buyLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                {t.common.loading}
              </span>
            ) : (
              t.poolDetail.buyToken
            )}
          </button>
        )}
      </div>

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

        {orders.length === 0 ? (
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
