"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useConnection, useBalance as useWagmiBalance } from "wagmi";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import dayjs from "dayjs";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@/store/useStore";
import { useBalance, useAllowance, useApprove } from "@/hooks/useERC20";
import { CONTRACTS } from "@/constants/contracts";
import { Progress } from "@/components/ui/Progress";
import zhCN from "@/i18n/zh-CN";
import enUS from "@/i18n/en-US";
import { goBack1 } from "@/assets/images";
import tokenShopAbi from "@/constants/abi/tokenShop.json";
import { kolApi } from "@/lib/api";
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

// 订单状态
function getOrderStatus(status: number, t: typeof zhCN): string {
  switch (status) {
    case 0:
      return t.poolDetail.statusTypes.new;
    case 1:
      return t.poolDetail.statusTypes.processing;
    case 2:
      return t.poolDetail.statusTypes.completed;
    default:
      return "";
  }
}

// 订单类型
interface MemeOrder {
  order_id: string;
  address: string;
  a_amount: string;
  b_amount: string;
  spend_txid: string;
  order_type: number;
  order_state: number;
  created_at: string;
}

export default function PoolDetailPage() {
  const router = useRouter();
  const { address, isConnected } = useConnection();
  const { openConnectModal } = useConnectModal();
  const { lang, currentProject } = useStore();
  const t = lang === "zh" ? zhCN : enUS;

  // 从 store 获取池子信息
  // mint_process_percent 格式: "总量,百分比"
  const processPercent =
    currentProject?.mint_process_percent?.split(",")[1] || "0";

  const poolInfo = {
    id: String(currentProject?.mint_pool_id || 0),
    symbol: currentProject?.symbol || "",
    logoUrl: currentProject?.logo_url || "",
    details: currentProject?.details || "",
    createTime: currentProject?.mint_pool_create_time || "",
    processPercent,
    type: String(currentProject?.project_type || 0),
    contract: currentProject?.contract_addr || "",
    exchangeRate: currentProject?.exchange_rate || 1,
    token: currentProject?.display_name?.split("-")[0] || "BNB",
    coinMintToken: currentProject?.coin_mint_token || "",
  };

  // 打印 poolInfo
  useEffect(() => {
    console.log("poolInfo:", poolInfo);
    console.log("currentProject:", currentProject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  // 如果没有项目信息，返回列表页
  useEffect(() => {
    if (!currentProject) {
      router.replace("/share");
    }
  }, [currentProject, router]);

  const [activeTab, setActiveTab] = useState<"buy" | "redeem">("buy");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState(0);

  // 用于跟踪已经处理过的交易哈希，避免重复处理
  const processedSwapHash = useRef<string | null>(null);
  const processedWithdrawHash = useRef<string | null>(null);

  // 原生 BNB 余额
  const { data: bnbBalance, refetch: refetchBnbBalance } = useWagmiBalance({
    address: address as `0x${string}`,
  });

  // USDT 余额和decimals
  const {
    formatted: usdtBalance,
    decimals: usdtDecimals,
    refetch: refetchUsdtBalance,
  } = useBalance(
    "0x55d398326f99059ff775485246999027b3197955" as `0x${string}`,
    address as `0x${string}`,
  );

  // SOS 余额和decimals
  const {
    formatted: sosBalance,
    decimals: sosDecimals,
    refetch: refetchSosBalance,
  } = useBalance(CONTRACTS.SOS as `0x${string}`, address as `0x${string}`);

  // 授权检查
  // 抢购时需要的代币：支付代币（coinMintToken）或项目代币（contract）
  const buyToken = poolInfo.coinMintToken || poolInfo.contract;
  // 赎回时需要的代币：项目代币（contract）
  const redeemToken = poolInfo.contract;

  // 项目代币的decimals（用于赎回）
  const { decimals: projectTokenDecimals } = useBalance(
    poolInfo.contract as `0x${string}`,
    address as `0x${string}`,
  );

  // 支付代币的decimals（用于抢购，如果不是BNB）
  const { decimals: paymentTokenDecimals } = useBalance(
    buyToken as `0x${string}`,
    address as `0x${string}`,
  );

  // 根据 token 类型获取余额
  const getTokenBalance = () => {
    if (poolInfo.token === "BNB") {
      return bnbBalance ? formatUnits(bnbBalance.value, 18) : "0";
    } else if (poolInfo.token === "USDT") {
      return usdtBalance;
    } else if (poolInfo.token === "SOS") {
      return sosBalance;
    }
    return "0";
  };

  // 获取用户贡献金额
  const { data: userContribution, refetch: refetchUserContribution } =
    useReadContract({
      address: CONTRACTS.TOKEN_SHOP as `0x${string}`,
      abi: tokenShopAbi,
      functionName: "userContributions",
      args: poolInfo.id ? [BigInt(poolInfo.id), address] : undefined,
      query: {
        enabled: !!address && !!poolInfo.id,
      },
    });

  const stakeBalance = userContribution
    ? parseFloat(formatUnits(userContribution as bigint, 18)).toFixed(6)
    : "0";

  // 获取当前token的decimals
  const getCurrentTokenDecimals = (): number => {
    if (activeTab === "buy") {
      // 抢购时：BNB是18，其他ERC20从paymentTokenDecimals获取
      if (poolInfo.token === "BNB") {
        return 18;
      } else if (poolInfo.token === "USDT") {
        return Number(usdtDecimals) || 18;
      } else if (poolInfo.token === "SOS") {
        return Number(sosDecimals) || 18;
      } else {
        return Number(paymentTokenDecimals) || 18;
      }
    } else {
      // 赎回时：项目代币的decimals
      return Number(projectTokenDecimals) || 18;
    }
  };

  // 处理输入，限制小数位数
  const handleAmountChange = (value: string) => {
    const decimals = getCurrentTokenDecimals();
    // 允许输入数字和小数点
    const regex = new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`);

    // 如果输入为空，允许清空
    if (value === "" || value === ".") {
      setAmount(value);
      return;
    }

    // 检查是否符合格式
    if (regex.test(value)) {
      setAmount(value);
    }
  };

  // 检查抢购时的授权（支付代币或项目代币）
  const { data: buyAllowanceData, refetch: refetchBuyAllowance } = useAllowance(
    buyToken as `0x${string}`,
    address as `0x${string}`,
    CONTRACTS.TOKEN_SHOP as `0x${string}`,
  );

  // 检查赎回时的授权（项目代币）
  const { data: redeemAllowanceData, refetch: refetchRedeemAllowance } =
    useAllowance(
      redeemToken as `0x${string}`,
      address as `0x${string}`,
      CONTRACTS.TOKEN_SHOP as `0x${string}`,
    );

  // 根据当前 tab 获取对应的授权额度
  const getCurrentAllowance = () => {
    if (activeTab === "buy") {
      return buyAllowanceData ? Number(buyAllowanceData.toString()) : 0;
    }
    return redeemAllowanceData ? Number(redeemAllowanceData.toString()) : 0;
  };

  const allowance = getCurrentAllowance();

  // 获取当前需要授权的代币地址
  const getSpenderToken = () => {
    if (activeTab === "buy") {
      return buyToken;
    }
    return redeemToken;
  };

  // 刷新授权（根据当前 tab 刷新对应的授权）
  const refetchAllowance = useCallback(() => {
    if (activeTab === "buy") {
      refetchBuyAllowance();
    } else {
      refetchRedeemAllowance();
    }
  }, [activeTab, refetchBuyAllowance, refetchRedeemAllowance]);

  // 授权
  const {
    approve,
    isPending: isApproving,
    isSuccess: approveSuccess,
  } = useApprove();

  // Swap 交易
  const {
    writeContract: writeSwap,
    data: swapHash,
    isPending: isSwapping,
  } = useWriteContract();
  const { isLoading: isSwapConfirming, isSuccess: isSwapSuccess } =
    useWaitForTransactionReceipt({ hash: swapHash });

  // Withdraw 交易
  const {
    writeContract: writeWithdraw,
    data: withdrawHash,
    isPending: isWithdrawing,
  } = useWriteContract();
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash });

  // 格式化大数字
  const formatNumber = (num: number): string => {
    if (isNaN(num) || !isFinite(num)) return "0";
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    if (num < 0.000001) return num.toExponential(2);
    return num.toFixed(6);
  };

  // 计算预期获得金额
  const getExpectedAmount = () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount === 0) return "0";
    if (activeTab === "buy") {
      const result = numAmount * poolInfo.exchangeRate;
      return formatNumber(result);
    } else {
      const result = (numAmount * 0.96) / poolInfo.exchangeRate;
      return formatNumber(result);
    }
  };

  const {
    data: ordersData,
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery<{ data: MemeOrder[] }>({
    queryKey: ["memeOrders", address],
    queryFn: async () => {
      if (!address) {
        return { data: [] };
      }
      return kolApi.getMemeOrders(address);
    },
    enabled: Boolean(address),
  });

  // 前端过滤：只显示当前项目的订单
  const orders = useMemo(() => {
    const allOrders = ordersData?.data || [];
    const currentPoolId = Number(poolInfo.id);
    if (!currentPoolId) return [];
    return allOrders.filter((order) => {
      const orderWithPoolId = order as MemeOrder & { pool_id?: number };
      return orderWithPoolId.pool_id === currentPoolId;
    });
  }, [ordersData?.data, poolInfo.id]);

  // 授权成功后刷新
  useEffect(() => {
    if (approveSuccess) {
      refetchAllowance();
    }
  }, [approveSuccess, refetchAllowance]);

  const recordTradeMutation = useMutation({
    mutationFn: (params: {
      pool_id: number;
      address: string;
      a_amount: string;
      b_amount: string;
      spend_txid: string;
      order_type: number;
    }) => kolApi.memeTrade(params),
    onSuccess: () => {
      refetchOrders();
    },
  });

  // 刷新余额
  const refreshBalances = useCallback(() => {
    refetchBnbBalance();
    refetchUsdtBalance();
    refetchSosBalance();
    refetchUserContribution();
  }, [
    refetchBnbBalance,
    refetchUsdtBalance,
    refetchSosBalance,
    refetchUserContribution,
  ]);

  // Swap 成功后
  useEffect(() => {
    if (
      isSwapSuccess &&
      swapHash &&
      address &&
      processedSwapHash.current !== swapHash
    ) {
      // 标记这个交易已经处理过
      processedSwapHash.current = swapHash;

      toast.success((t.poolDetail.buySuccess as string) || "抢购成功");
      recordTradeMutation.mutate({
        pool_id: Number(poolInfo.id),
        address,
        a_amount: amount,
        b_amount: String(parseFloat(amount) * poolInfo.exchangeRate),
        spend_txid: swapHash,
        order_type: 0,
      });
      setAmount("");
      // 刷新余额
      refreshBalances();
    }
  }, [
    address,
    amount,
    isSwapSuccess,
    poolInfo.exchangeRate,
    poolInfo.id,
    swapHash,
    t.poolDetail.buySuccess,
    recordTradeMutation,
    refreshBalances,
  ]);

  // Withdraw 成功后
  useEffect(() => {
    if (
      isWithdrawSuccess &&
      withdrawHash &&
      address &&
      processedWithdrawHash.current !== withdrawHash
    ) {
      // 标记这个交易已经处理过
      processedWithdrawHash.current = withdrawHash;

      toast.success((t.poolDetail.redeemSuccess as string) || "赎回成功");
      recordTradeMutation.mutate({
        pool_id: Number(poolInfo.id),
        address,
        a_amount: String(parseFloat(stakeBalance) * rate * 0.96),
        b_amount: amount,
        spend_txid: withdrawHash,
        order_type: 1,
      });
      setAmount("");
      // 刷新余额
      refreshBalances();
    }
  }, [
    address,
    amount,
    isWithdrawSuccess,
    poolInfo.id,
    rate,
    stakeBalance,
    t.poolDetail.redeemSuccess,
    withdrawHash,
    recordTradeMutation,
    refreshBalances,
  ]);

  // 快捷金额按钮
  const changeAmount = (percentage: number) => {
    setRate(percentage);
    const balance = getTokenBalance();
    if (activeTab === "buy") {
      // 使用 toFixed 和 parseFloat 避免精度问题
      const balanceNum = parseFloat(balance) || 0;
      const result = parseFloat((balanceNum * percentage).toFixed(6));
      setAmount(result.toString());
    } else {
      // 使用 toFixed 和 parseFloat 避免精度问题
      const redeemBalance = parseFloat(stakeBalance) * poolInfo.exchangeRate;
      const result = parseFloat((redeemBalance * percentage).toFixed(6));
      setAmount(result.toString());
    }
  };

  // 授权
  const handleApprove = () => {
    approve(
      getSpenderToken() as `0x${string}`,
      CONTRACTS.TOKEN_SHOP as `0x${string}`,
      maxUint256,
    );
  };

  // 购买
  const handleBuy = () => {
    if (!amount || !poolInfo.id) return;

    if (poolInfo.token === "BNB") {
      writeSwap({
        address: CONTRACTS.TOKEN_SHOP as `0x${string}`,
        abi: tokenShopAbi,
        functionName: "swap",
        args: [BigInt(poolInfo.id), parseUnits(amount, 18)],
        value: parseUnits(amount, 18),
      });
    } else {
      writeSwap({
        address: CONTRACTS.TOKEN_SHOP as `0x${string}`,
        abi: tokenShopAbi,
        functionName: "swap",
        args: [BigInt(poolInfo.id), parseUnits(amount, 18)],
      });
    }
  };

  // 赎回
  const handleWithdraw = () => {
    if (!amount || !poolInfo.id || !stakeBalance) return;

    const withdrawAmount = parseFloat(stakeBalance) * rate;
    writeWithdraw({
      address: CONTRACTS.TOKEN_SHOP as `0x${string}`,
      abi: tokenShopAbi,
      functionName: "withdraw",
      args: [BigInt(poolInfo.id), parseUnits(withdrawAmount.toString(), 18)],
      gas: BigInt(100000),
      gasPrice: parseUnits("5", 9), // 与 Vue 版本保持一致 (9 decimals = gwei)
    });
  };

  // Tab 切换时清空金额
  useEffect(() => {
    setAmount("");
    if (
      (activeTab === "buy" && poolInfo.token !== "BNB") ||
      activeTab === "redeem"
    ) {
      refetchAllowance();
    }
  }, [activeTab, poolInfo.token, refetchAllowance]);

  const tokenBalance = getTokenBalance();
  const numAmount = parseFloat(amount) || 0;
  const numBalance = parseFloat(tokenBalance) || 0;
  const redeemableAmount = parseFloat(stakeBalance) * poolInfo.exchangeRate;

  const isLoading =
    isSwapping ||
    isSwapConfirming ||
    isWithdrawing ||
    isWithdrawConfirming ||
    isApproving;
  const needsApproval =
    (activeTab === "buy" && poolInfo.token !== "BNB") || activeTab === "redeem";
  const isDisabled =
    activeTab === "buy"
      ? numAmount === 0 || numBalance < numAmount
      : numAmount === 0 || redeemableAmount < numAmount;

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
        <div className="flex justify-center items-center rounded-2xl overflow-hidden bg-background-card border border-border m-auto w-fit">
          <Image
            src={poolInfo.logoUrl || "/images/default-token.png"}
            alt={poolInfo.symbol}
            width={200}
            height={200}
            className="object-cover"
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

      {/* Tabs */}
      <div className="px-4 mt-6">
        <div className="tab-container">
          <button
            className={
              activeTab === "buy" ? "tab-item-active" : "tab-item-inactive"
            }
            onClick={() => setActiveTab("buy")}
          >
            {t.poolDetail.buy}
          </button>
          <button
            className={
              activeTab === "redeem" ? "tab-item-active" : "tab-item-inactive"
            }
            onClick={() => setActiveTab("redeem")}
          >
            {t.poolDetail.redeem}
          </button>
        </div>
      </div>

      {/* Trade Section */}
      <div className="px-4 mt-4 space-y-4">
        {/* Exchange Rate / Redeem Note */}
        {activeTab === "buy" ? (
          <div className="card flex items-center justify-between">
            <span className="text-text-secondary text-sm">
              {t.poolDetail.equalLaunch}
            </span>
            <span className="text-secondary text-sm">
              1 {poolInfo.token} = {poolInfo.exchangeRate} {poolInfo.symbol}
            </span>
          </div>
        ) : (
          <div className="card text-center">
            <span className="text-primary text-sm font-medium">
              {t.poolDetail.redeemNote}
            </span>
          </div>
        )}

        {/* Balance & Input */}
        <div>
          <div className="text-right text-sm text-text-secondary mb-2 px-1">
            {activeTab === "buy" ? (
              <>
                {t.poolDetail.balance}：{parseFloat(tokenBalance).toFixed(6)}{" "}
                {poolInfo.token}
              </>
            ) : (
              <>
                {t.poolDetail.redeemAmount}：{redeemableAmount.toFixed(6)}{" "}
                {poolInfo.symbol}
              </>
            )}
          </div>
          <div className="card flex items-center justify-between gap-4">
            <span className="text-text-secondary text-sm">
              {t.poolDetail.payment}
            </span>
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder={t.poolDetail.inputAmount}
                className="bg-transparent text-right text-secondary w-28 outline-none flex-1"
              />
              <span className="text-secondary font-medium shrink-0">
                {activeTab === "buy" ? poolInfo.token : poolInfo.symbol}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Amounts */}
        <div className="flex gap-2">
          {[0.1, 0.5, 0.8, 1].map((val) => (
            <button
              key={val}
              onClick={() => changeAmount(val)}
              className="flex-1 py-3 rounded-xl bg-background-card text-secondary font-bold text-sm hover:bg-card-hover transition-colors border border-border"
            >
              {val === 1 ? t.poolDetail.allIn : `${val * 100}%`}
            </button>
          ))}
        </div>

        {/* Expected Amount */}
        <div className="card flex items-center justify-between">
          <span className="text-text-secondary text-sm">
            {t.poolDetail.expectedAmount}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-secondary">{getExpectedAmount()}</span>
            <span className="text-secondary font-medium">
              {activeTab === "buy" ? poolInfo.symbol : poolInfo.token}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {!isConnected ? (
          <button onClick={openConnectModal} className="btn-primary w-full">
            {lang === "zh" ? "連接錢包" : "Connect Wallet"}
          </button>
        ) : needsApproval && allowance === 0 ? (
          <ConfirmButton
            onClick={handleApprove}
            disabled={isLoading}
            className="btn-primary w-full"
            loading={isApproving}
          >
            {t.poolDetail.approve}
          </ConfirmButton>
        ) : activeTab === "buy" ? (
          <ConfirmButton
            onClick={handleBuy}
            disabled={isDisabled || isLoading}
            className="btn-primary w-full"
            loading={isSwapping || isSwapConfirming}
          >
            {t.poolDetail.buyToken}
          </ConfirmButton>
        ) : (
          <ConfirmButton
            onClick={handleWithdraw}
            disabled={isDisabled || isLoading}
            className="btn-primary w-full"
            loading={isWithdrawing || isWithdrawConfirming}
          >
            {t.poolDetail.earlyRedeem}
          </ConfirmButton>
        )}
      </div>

      {/* Orders Section */}
      <div className="px-4 mt-8">
        {ordersLoading && (
          <div className="h-75 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {!ordersLoading && orders.length > 0 && (
          <>
            <div className="text-secondary font-bold mb-4 text-left">
              {t.poolDetail.myOrders}
            </div>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.order_id} className="card space-y-3">
                  {/* Header */}
                  <div className="flex justify-between items-center">
                    <span className="text-secondary font-medium">
                      {poolInfo.symbol} / {poolInfo.token}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {dayjs(order.created_at).format("YYYY-MM-DD HH:mm:ss")}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">
                      {t.poolDetail.type}
                    </span>
                    <span className="text-secondary">
                      {order.order_type
                        ? t.poolDetail.redeem
                        : t.poolDetail.buy}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">
                      {t.poolDetail.amount}
                    </span>
                    <span className="text-secondary">
                      {order.order_type
                        ? `${order.a_amount} ${poolInfo.token}`
                        : `${order.b_amount} ${poolInfo.symbol}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">
                      {t.poolDetail.price}
                    </span>
                    <span className="text-secondary">
                      {order.order_type ? (
                        <>
                          1 {poolInfo.symbol} ➡️{" "}
                          {(
                            parseFloat(order.a_amount) /
                            parseFloat(order.b_amount)
                          ).toFixed(4)}{" "}
                          {poolInfo.token}
                        </>
                      ) : (
                        <>
                          1 {poolInfo.token} ➡️{" "}
                          {(
                            parseFloat(order.b_amount) /
                            parseFloat(order.a_amount)
                          ).toFixed(4)}{" "}
                          {poolInfo.symbol}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">
                      {t.poolDetail.status}
                    </span>
                    <span className="text-success">
                      {getOrderStatus(order.order_state, t)}
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
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
