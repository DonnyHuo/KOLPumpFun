"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { ChevronDown, RefreshCw, Copy } from "lucide-react";
import { SocialLinks } from "@/components/common/SocialLinks";
import { shortAddress, copyToClipboard } from "@/lib/utils";
import { isAddress } from "viem";
import { useStore } from "@/store/useStore";
import zhCN from "@/i18n/zh-CN";
import enUS from "@/i18n/en-US";
import { homeBg, homeBg2, swapDown, logo } from "@/assets/images";
import { getTokenIcon } from "@/assets/images/tokenList";
import { brc20Api } from "@/lib/api";

interface BridgeRecord {
  brc20_txid?: string;
  from_net: string;
  from_net_address: string;
  to_net: string;
  to_net_address: string;
  convert_txid?: string;
  order_state: number;
  amount?: string;
  symbol?: string;
}

interface TokenInfo {
  name: string;
}

interface CoinInfo {
  tokenName: string;
  tokenType?: string;
  balance?: string;
  availableBalance?: string;
  transferBalance?: string;
  inscriptionId?: string;
  inscriptionNumber?: string;
  amount: number;
}

// OKX 钱包类型声明
declare global {
  interface Window {
    okxwallet?: {
      bitcoin: {
        requestAccounts: () => Promise<string[]>;
        getAccounts: () => Promise<string[]>;
        getBalance: () => Promise<{
          confirmed: number;
          unconfirmed: number;
          total: number;
        }>;
        getInscriptions: () => Promise<unknown[]>;
        sendInscription: (
          address: string,
          inscriptionId: string
        ) => Promise<string>;
      };
    };
  }
}

export default function BtcSwapPage() {
  const { lang } = useStore();
  const t = lang === "zh" ? zhCN : enUS;
  const btcSwap = t.btcSwap as Record<string, unknown>;
  const home = t.home as Record<string, unknown>;

  // BTC 钱包状态
  const [btcAddress, setBtcAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [recordList, setRecordList] = useState<BridgeRecord[]>([]);
  const [tokenList, setTokenList] = useState<TokenInfo[]>([]);
  const [selectedChain, setSelectedChain] = useState("");
  const [coinList, setCoinList] = useState<CoinInfo[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinInfo>({
    tokenName: btcSwap.select as string,
    amount: 0,
  });
  const [showChainModal, setShowChainModal] = useState(false);
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);

  // 复制地址
  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(t.common.copySuccess as string);
    }
  };

  // 粘贴地址
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setToAddress(text);
    } catch {
      toast.error(t.common.cannotReadClipboard as string);
    }
  };

  // 获取订单状态文本
  const getStatusText = (status: number) => {
    const statusTexts = btcSwap.status as string[];
    return statusTexts[status] || statusTexts[4];
  };

  // 获取跨链记录
  const fetchRecordList = useCallback(async () => {
    if (!btcAddress) return;
    setLoading(true);
    try {
      const res = await brc20Api.getBridgeRecord(btcAddress);
      setRecordList(res.data || []);
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      setLoading(false);
    }
  }, [btcAddress]);

  // 获取 BRC20 余额 - 通过 OKX 钱包的 getInscriptions 方法
  const getBTCBalance = useCallback(
    async (tokenName: string) => {
      if (!btcAddress || !tokenName || typeof window.okxwallet === "undefined")
        return;

      try {
        // 尝试通过 OKX 钱包获取铭文
        const inscriptions = await window.okxwallet.bitcoin.getInscriptions();

        if (Array.isArray(inscriptions) && inscriptions.length > 0) {
          // 定义铭文类型
          type Inscription = {
            tick?: string;
            ticker?: string;
            contentType?: string;
            inscriptionId?: string;
            inscriptionNumber?: string;
            amount?: string;
          };

          // 过滤出当前选择的代币的铭文
          const filteredInscriptions = (inscriptions as Inscription[]).filter(
            (item) => {
              const tick = item.tick || item.ticker || "";
              return tick.toLowerCase() === tokenName.toLowerCase();
            }
          );

          const tokenListData = filteredInscriptions.map((item) => ({
            tokenName: item.tick || item.ticker || tokenName,
            inscriptionId: item.inscriptionId || "",
            inscriptionNumber: item.inscriptionNumber || "",
            amount: parseFloat(item.amount || "0"),
          }));

          setCoinList(tokenListData);
          if (tokenListData.length > 0) {
            setSelectedCoin(tokenListData[0]);
          } else {
            setCoinList([]);
            setSelectedCoin({ tokenName: btcSwap.select as string, amount: 0 });
          }
        } else {
          setCoinList([]);
          setSelectedCoin({ tokenName: btcSwap.select as string, amount: 0 });
        }
      } catch (error) {
        console.error("Failed to fetch BTC balance:", error);
        // 如果获取失败，清空列表
        setCoinList([]);
        setSelectedCoin({ tokenName: btcSwap.select as string, amount: 0 });
      }
    },
    [btcAddress, btcSwap.select]
  );

  // 连接 OKX 钱包
  const connectWallet = useCallback(async () => {
    if (typeof window.okxwallet === "undefined") {
      toast.error(btcSwap.installWallet as string);
      window.open("https://www.okx.com/web3", "_blank");
      return;
    }

    try {
      const accounts = await window.okxwallet.bitcoin.requestAccounts();
      if (accounts[0]) {
        setBtcAddress(accounts[0]);
      }
    } catch (error) {
      console.error("Connect wallet failed:", error);
      toast.error(t.common.walletConnectFailed as string);
    }
  }, [btcSwap.installWallet, t.common.walletConnectFailed]);

  // 获取代币列表
  useEffect(() => {
    const fetchTokenList = async () => {
      try {
        const res = await brc20Api.getTokenList();
        if (res.data) {
          const tokens = res.data.map((item) => ({
            name: item.symbol,
          }));
          setTokenList(tokens);
          if (tokens.length > 0) {
            setSelectedChain(tokens[0].name);
          }
        }
      } catch (error) {
        console.error("Failed to fetch token list:", error);
      }
    };

    fetchTokenList();
  }, []);

  // 当钱包连接后获取跨链记录
  useEffect(() => {
    if (!btcAddress) return;
    fetchRecordList();
  }, [btcAddress, fetchRecordList]);

  // 当钱包连接且选中代币后获取余额
  useEffect(() => {
    if (!btcAddress || !selectedChain) return;
    getBTCBalance(selectedChain);
  }, [btcAddress, selectedChain, getBTCBalance]);

  // 检查钱包
  useEffect(() => {
    if (typeof window.okxwallet !== "undefined") {
      connectWallet();
    }
  }, [connectWallet]);

  // 选择链
  const handleSelectChain = (name: string) => {
    setSelectedChain(name);
    setShowChainModal(false);
  };

  // 选择币种
  const handleSelectCoin = (coin: CoinInfo) => {
    setSelectedCoin(coin);
    setShowCoinModal(false);
  };

  // 提交跨链
  const handleSubmit = async () => {
    if (selectedCoin.amount <= 0) {
      toast.error(
        (btcSwap.desc as string[])?.[0] ||
          (t.common.pleaseSelectToken as string)
      );
      return;
    }
    if (!isAddress(toAddress)) {
      toast.error(
        (btcSwap.desc as string[])?.[1] || (t.common.fillRequired as string)
      );
      return;
    }
    if (!selectedCoin.inscriptionId) {
      toast.error(t.common.pleaseSelectInscription as string);
      return;
    }

    try {
      setPostLoading(true);

      // 固定的接收地址
      const receiverAddress =
        "bc1pec6jqs5v0xzrjamdq3g5w2u3z4sls96x0yquypt4gf4vgpt9zmqq05y7r9";

      // 发送铭文
      const txid = await window.okxwallet!.bitcoin.sendInscription(
        receiverAddress,
        selectedCoin.inscriptionId
      );

      // 通知后端
      await noticeService(txid);
    } catch (error) {
      console.error("Submit failed:", error);
      setPostLoading(false);
      toast.error(t.common.submitFailed as string);
    }
  };

  // 通知后端服务
  const noticeService = async (txid: string) => {
    try {
      const res = await brc20Api.bridge({
        symbol: selectedChain,
        from_net_address: btcAddress,
        to_net_address: toAddress,
        amount: selectedCoin.amount,
        brc20_txid: txid,
      });

      if (res.data?.order_id) {
        setPostLoading(false);
        toast.success(t.common.submitSuccess as string);
        fetchRecordList();
      } else {
        // 重试
        setTimeout(() => noticeService(txid), 2000);
      }
    } catch (error) {
      setPostLoading(false);
      console.error("Notice service failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid pb-24 relative">
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial opacity-50" />
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2">
            <Image
              src={logo}
              alt="Logo"
              width={36}
              height={36}
              className="rounded-full"
            />
            <span className="font-bold text-secondary">KOLPumpFun</span>
          </div>
          {btcAddress ? (
            <div
              className="flex items-center gap-2 px-3 py-2 bg-background-card border border-border rounded-xl cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => handleCopy(btcAddress)}
            >
              <span className="text-sm text-secondary">
                {shortAddress(btcAddress)}
              </span>
              <Copy className="w-3.5 h-3.5 text-text-secondary" />
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="btn-primary text-sm px-4 py-2"
            >
              連接錢包
            </button>
          )}
        </div>

        {/* Hero Section */}

        <div
          className="px-5 py-8 text-center relative overflow-hidden"
          style={{
            backgroundImage: `url(${homeBg2.src})`,
            backgroundSize: "100%",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="relative z-10">
            <h1 className="text-xl font-bold gradient-text leading-relaxed">
              {(home.title as string[])[0]}
              <br />
              {(home.title as string[])[1]}
            </h1>
            <Image
              src={homeBg}
              alt="SmartBTC"
              width={180}
              height={180}
              className="mx-auto mt-4 opacity-90"
            />
          </div>
        </div>

        {/* Swap Content */}
        <div className="px-5">
          {/* Title */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-lg text-secondary">
                {btcSwap.swap as string}
              </span>
              <span className="text-xs text-text-secondary bg-background-card border border-border px-2 py-1 rounded-lg">
                BTC → BSC
              </span>
            </div>
            <button
              onClick={() => setShowChainModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-background-card border border-border rounded-xl text-sm text-secondary hover:border-primary/30 transition-colors"
            >
              <span>{selectedChain || (btcSwap.select as string)}</span>
              <ChevronDown className="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          {/* Swap Box */}
          <div className="relative">
            {/* From */}
            <div className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1 text-left">
                  <p className="text-sm text-text-secondary mb-3">
                    {btcSwap.send as string}
                  </p>
                  <input
                    type="text"
                    value={selectedCoin.amount || 0}
                    disabled
                    className="w-full bg-transparent text-2xl font-bold text-secondary outline-none mb-4"
                  />
                  <a
                    href="https://www.okx.com/zh-hans/web3/marketplace/inscription/ordinals/token/SOS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary-hover transition-colors"
                  >
                    {btcSwap.buy as string} →
                  </a>
                </div>
                <button
                  onClick={() => setShowCoinModal(true)}
                  className="flex items-center gap-2 bg-background-card border border-border px-3 py-2 rounded-xl text-sm text-secondary hover:border-primary/30 transition-colors"
                >
                  <span>
                    {selectedCoin.tokenName}
                    {selectedCoin.inscriptionNumber &&
                      `#${selectedCoin.inscriptionNumber}`}
                  </span>
                  <ChevronDown className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            </div>

            {/* Swap Icon */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="bg-background-card border-4 border-background rounded-full p-3 shadow-lg">
                <Image
                  src={swapDown}
                  alt="swap"
                  width={20}
                  height={20}
                  style={{
                    filter:
                      "brightness(0) saturate(100%) invert(76%) sepia(98%) saturate(1000%) hue-rotate(359deg) brightness(103%) contrast(106%)",
                  }}
                />
              </div>
            </div>

            {/* To */}
            <div className="card mt-2">
              <p className="text-sm text-text-secondary mb-3 text-left">
                {btcSwap.reviceAddress as string}
              </p>
              <div className="input flex items-center justify-between">
                <input
                  type="text"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 outline-none text-sm bg-transparent text-secondary placeholder:text-text-muted"
                />
                <button
                  onClick={handlePaste}
                  className="text-sm text-primary hover:text-primary-hover transition-colors shrink-0"
                >
                  {btcSwap.paste as string}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={
              !(selectedCoin.amount > 0 && isAddress(toAddress)) || postLoading
            }
            className="btn-primary w-full mt-6 h-13 rounded-2xl"
          >
            {postLoading ? "..." : (btcSwap.submit as string)}
          </button>

          {/* Records */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-base font-semibold text-secondary">
                {btcSwap.history as string}
              </span>
              <button
                onClick={fetchRecordList}
                disabled={loading}
                className="w-10 h-10 flex items-center justify-center bg-background-card border border-border rounded-xl hover:border-primary/30 transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 text-text-secondary ${
                    loading ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>

            {recordList.length > 0 ? (
              <div className="space-y-4">
                {recordList.map((record, index) => (
                  <div key={index} className="card space-y-3 text-sm">
                    {record.brc20_txid && (
                      <div className="flex justify-between items-center">
                        <span className="text-text-secondary">
                          {btcSwap.hash as string}
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://www.oklink.com/zh-hans/btc/tx/${record.brc20_txid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-hover transition-colors"
                          >
                            {shortAddress(record.brc20_txid)}
                          </a>
                          <button
                            onClick={() => handleCopy(record.brc20_txid!)}
                            className="opacity-60 hover:opacity-100 transition-opacity"
                          >
                            <Copy className="w-3.5 h-3.5 text-text-secondary" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-text-secondary">
                        From ({record.from_net})
                      </span>
                      <span className="text-secondary">
                        {shortAddress(record.from_net_address)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">
                        To ({record.to_net})
                      </span>
                      <span className="text-secondary">
                        {shortAddress(record.to_net_address)}
                      </span>
                    </div>
                    {record.convert_txid && (
                      <div className="flex justify-between items-center">
                        <span className="text-text-secondary">
                          {btcSwap.convertHash as string}
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://bscscan.com/tx/${record.convert_txid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-hover transition-colors"
                          >
                            {shortAddress(record.convert_txid)}
                          </a>
                          <button
                            onClick={() => handleCopy(record.convert_txid!)}
                            className="opacity-60 hover:opacity-100 transition-opacity"
                          >
                            <Copy className="w-3.5 h-3.5 text-text-secondary" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-text-secondary">
                        {btcSwap.orderStatus as string}
                      </span>
                      <span className="text-primary">
                        {getStatusText(record.order_state)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-12">
                <div className="w-16 h-16 rounded-full bg-background-card flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-text-muted text-sm">
                  {btcSwap.allData as string}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Social Links */}
        <SocialLinks className="mt-10 pb-8" />

        {/* Chain Selection Modal */}
        {showChainModal && (
          <div
            className="fixed inset-0 bg-black/60 flex items-end z-100"
            onClick={() => setShowChainModal(false)}
          >
            <div
              className="bg-background-card w-full rounded-t-3xl border-t border-border animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-text-muted rounded-full mx-auto mt-4" />
              <div className="text-center py-4 font-semibold text-secondary text-lg">
                {btcSwap.select as string}
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-2 pb-6">
                {tokenList.map((token) => (
                  <button
                    key={token.name}
                    onClick={() => handleSelectChain(token.name)}
                    className={`w-full px-4 py-4 flex items-center gap-3 rounded-xl transition-all ${
                      selectedChain === token.name
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "text-secondary hover:bg-card-hover"
                    }`}
                  >
                    <Image
                      src={getTokenIcon(token.name)}
                      alt={token.name}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <span className="font-medium">{token.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Coin Selection Modal */}
        {showCoinModal && (
          <div
            className="fixed inset-0 bg-black/60 flex items-end z-100"
            onClick={() => setShowCoinModal(false)}
          >
            <div
              className="bg-background-card w-full rounded-t-3xl border-t border-border animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-text-muted rounded-full mx-auto mt-4" />
              <div className="text-center py-4 font-semibold text-secondary text-lg">
                {btcSwap.select as string}
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-2 pb-6">
                {coinList.length > 0 ? (
                  coinList.map((coin, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectCoin(coin)}
                      className={`w-full px-4 py-4 flex items-center justify-between rounded-xl transition-all ${
                        selectedCoin.inscriptionNumber ===
                        coin.inscriptionNumber
                          ? "bg-primary/10 text-primary border border-primary/30"
                          : "text-secondary hover:bg-card-hover"
                      }`}
                    >
                      <span className="font-medium">
                        {coin.tokenName}#{coin.inscriptionNumber}
                      </span>
                      <span className="text-text-secondary">{coin.amount}</span>
                    </button>
                  ))
                ) : (
                  <div className="py-12 text-center text-text-muted text-sm">
                    {(btcSwap.tips as string)?.replace(
                      "{selectedChain}",
                      selectedChain
                    ) || `暫無${selectedChain}餘額`}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
