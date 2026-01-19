'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { useReadContract } from 'wagmi';
import Image from 'next/image';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { CONTRACTS } from '@/constants/contracts';
import { useBalance, useTokenInfo } from '@/hooks/useERC20';
import lpExchangeAbi from '@/constants/abi/lpExchange.json';
import erc20Abi from '@/constants/abi/erc20.json';
import { shortAddress } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import zhCN from '@/i18n/zh-CN';
import enUS from '@/i18n/en-US';
import { getTokenIcon } from '@/assets/images/tokenList';

const COLORS = ['#827eff', '#57d7f7', '#fbdb5f', '#7bffb2', '#f079f6'];

interface TokenInfo {
  id: number;
  address: string;
  name: string;
  decimals: number;
  index: string[];
}

interface PairInfo {
  pairId: string;
  pairName: string;
  disPlayName: string;
  rate: number;
  isOpen: boolean;
  lpToken: string;
  changeToken: string;
  baseTokenIsToken0: boolean;
}

// LP配置数据 - 来自 lpSwap.json
const LP_CONFIG: Record<string, number[]> = {
  '100T': [50, 10, 10, 10, 20],
  'SOS': [50, 30, 10, 10],
  'MASK': [30, 30, 30, 10],
  'ORDI': [50, 30, 2, 18],
  'SATS': [50, 30, 2, 18],
  'RATS': [50, 30, 2, 18],
  'PUPS': [50, 30, 2, 18],
  'WZRD': [50, 30, 2, 18],
  'Π': [50, 30, 2, 18],
  'AINN': [50, 30, 2, 18],
  'BTCS': [50, 30, 2, 18],
  'OXBT': [50, 30, 2, 18],
  'LIGO': [50, 30, 2, 18],
  'SHIB': [50, 30, 2, 18],
  'DEAI': [50, 30, 2, 18],
  'NEWU': [50, 30, 2, 18],
  'MERM': [50, 30, 2, 18],
  'PIZA': [50, 30, 2, 18],
  'SATX': [50, 30, 2, 18],
  'PGID': [50, 30, 2, 18],
  'default': [50, 30, 2, 18],
};

export default function LpSwapPage() {
  const { address } = useAccount();
  const { lang } = useStore();
  const t = lang === 'zh' ? zhCN : enUS;
  const lpSwap = t.lpSwap as Record<string, unknown>;
  const publicClient = usePublicClient();

  const [loading, setLoading] = useState(true);
  const [pairsLoading, setPairsLoading] = useState(false);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [pairs, setPairs] = useState<PairInfo[]>([]);
  const [showTokenSelect, setShowTokenSelect] = useState(false);

  // 获取所有交换代币
  const { data: exchangeTokens } = useReadContract({
    address: CONTRACTS.LP_EXCHANGE as `0x${string}`,
    abi: lpExchangeAbi,
    functionName: 'getExchangeTokens',
  });

  // 获取选中代币的余额和总供应量
  const { formatted: lpBalance } = useBalance(
    selectedToken?.address as `0x${string}`,
    CONTRACTS.LP_EXCHANGE as `0x${string}`
  );

  const { totalSupply, decimals } = useTokenInfo(
    selectedToken?.address as `0x${string}` || '0x0000000000000000000000000000000000000000'
  );

  // 获取用户余额
  const { formatted: userBalance } = useBalance(
    selectedToken?.address as `0x${string}`,
    address
  );

  // 获取代币的交换对索引
  const getExchangePairs = useCallback(async (tokenAddress: string) => {
    if (!publicClient) return [];
    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.LP_EXCHANGE as `0x${string}`,
        abi: lpExchangeAbi,
        functionName: 'getExchangePairs',
        args: [tokenAddress],
      });
      return (result as bigint[]).map((v) => v.toString());
    } catch (error) {
      console.error('getExchangePairs error:', error);
      return [];
    }
  }, [publicClient]);

  // 获取单个交换对详情
  // pairs 函数返回值顺序: lpToken, pairName, disPlayNmae, baseTokenIsToken0, changeToken, rate, isOpen
  const getPairInfo = useCallback(async (pairIndex: string) => {
    if (!publicClient) return null;
    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.LP_EXCHANGE as `0x${string}`,
        abi: lpExchangeAbi,
        functionName: 'pairs',
        args: [BigInt(pairIndex)],
      }) as readonly [string, string, string, boolean, string, bigint, boolean];
      
      // 返回值顺序: [lpToken, pairName, disPlayNmae, baseTokenIsToken0, changeToken, rate, isOpen]
      const [lpToken, pairName, disPlayNmae, baseTokenIsToken0, changeToken, rate, isOpen] = result;
      
      return {
        pairId: pairIndex,
        lpToken,
        pairName,
        disPlayName: disPlayNmae, // 注意合约中是 disPlayNmae (拼写错误)
        baseTokenIsToken0,
        changeToken,
        rate: Number(rate) / 200, // 费率转换
        isOpen,
      };
    } catch (error) {
      console.error('getPairInfo error:', error);
      return null;
    }
  }, [publicClient]);

  // 初始化代币列表
  useEffect(() => {
    const initTokens = async () => {
      if (!exchangeTokens || !Array.isArray(exchangeTokens) || !publicClient) {
        setLoading(false);
        return;
      }

      // 从 localStorage 获取缓存
      const cached = localStorage.getItem('exchangeTokens');
      if (cached) {
        try {
          const cachedTokens = JSON.parse(cached);
          setTokens(cachedTokens);
          if (cachedTokens.length > 0) {
            setSelectedToken(cachedTokens[0]);
          }
          setLoading(false);
        } catch {
          // 缓存解析失败，继续获取
        }
      }

      // 过滤目标 token (SOS)
      const targetToken = '0x1d887f723f77b2f8c99bed8b94f4e3ba71baf70e';
      const filteredTokens = (exchangeTokens as string[]).filter(
        (addr) => addr.toLowerCase() === targetToken
      );

      if (filteredTokens.length > 0) {
        // 获取代币信息
        const tokensInfo = await Promise.all(
          filteredTokens.map(async (tokenAddr, i) => {
            try {
              // 获取代币 symbol 和 decimals
              const [symbol, tokenDecimals, pairIndexes] = await Promise.all([
                publicClient.readContract({
                  address: tokenAddr as `0x${string}`,
                  abi: erc20Abi,
                  functionName: 'symbol',
                }),
                publicClient.readContract({
                  address: tokenAddr as `0x${string}`,
                  abi: erc20Abi,
                  functionName: 'decimals',
                }),
                getExchangePairs(tokenAddr),
              ]);

              return {
                id: i,
                address: tokenAddr,
                name: symbol as string,
                decimals: Number(tokenDecimals),
                index: pairIndexes,
              };
            } catch (error) {
              console.error('Get token info error:', error);
              return {
                id: i,
                address: tokenAddr,
                name: 'SOS',
                decimals: 18,
                index: [],
              };
            }
          })
        );

        setTokens(tokensInfo);
        if (tokensInfo.length > 0) {
          setSelectedToken(tokensInfo[0]);
        }
        localStorage.setItem('exchangeTokens', JSON.stringify(tokensInfo));
      }

      setLoading(false);
    };

    initTokens();
  }, [exchangeTokens, publicClient, getExchangePairs]);

  // 计算进度和用户余额比例
  const { percentage, myBalance, myBalanceRate } = useMemo(() => {
    if (!totalSupply || !lpBalance || !selectedToken) {
      return { percentage: '0', myBalance: '0', myBalanceRate: '0' };
    }
    
    const dec = decimals ? Number(decimals) : 18;
    const total = parseFloat(formatUnits(totalSupply, dec));
    const balance = parseFloat(lpBalance);
    const config = LP_CONFIG[selectedToken.name.toUpperCase()] || LP_CONFIG['default'];
    const lpPercent = config[1] / 100;
    const lpTotal = total * lpPercent;
    const exchanged = lpTotal - balance;
    const pct = (exchanged * 100) / lpTotal;
    
    let myBal = '0';
    let myRate = '0';
    if (userBalance && total > 0) {
      const bal = parseFloat(userBalance);
      myBal = bal.toFixed(4);
      myRate = ((bal * 100) / total).toFixed(4);
    }
    
    return {
      percentage: pct > 0 ? pct.toFixed(4) : '0',
      myBalance: myBal,
      myBalanceRate: myRate,
    };
  }, [totalSupply, lpBalance, selectedToken, decimals, userBalance]);

  // 获取交换对信息
  useEffect(() => {
    const fetchPairs = async () => {
      if (!selectedToken?.index?.length) {
        setPairs([]);
        return;
      }

      setPairsLoading(true);
      try {
        // 并行获取所有交换对详情
        const pairsInfo = await Promise.all(
          selectedToken.index.map((pairIndex) => getPairInfo(pairIndex))
        );
        
        // 过滤掉 null 值和未开放的交换对
        const validPairs = pairsInfo.filter(
          (pair): pair is PairInfo => pair !== null && pair.isOpen
        );
        
        setPairs(validPairs);
      } catch (error) {
        console.error('fetchPairs error:', error);
        setPairs([]);
      } finally {
        setPairsLoading(false);
      }
    };

    fetchPairs();
  }, [selectedToken, getPairInfo]);

  // 饼图数据
  const chartData = useMemo(() => {
    const config = selectedToken
      ? LP_CONFIG[selectedToken.name.toUpperCase()] || LP_CONFIG['default']
      : LP_CONFIG['default'];

    const labels = (selectedToken?.name === '100T' ? lpSwap.list1 : lpSwap.list) as string[];

    return labels.map((label, index) => ({
      name: label,
      value: config[index] || 0,
    }));
  }, [selectedToken, lpSwap]);

  // 总供应量显示
  const totalDisplay = useMemo(() => {
    if (!totalSupply || !selectedToken) return '--';
    const dec = decimals ? Number(decimals) : 18;
    const total = parseFloat(formatUnits(totalSupply, dec));
    if (selectedToken.name === 'SOS') {
      return (total / 100000).toFixed(0);
    }
    return (total / 10000).toFixed(0);
  }, [totalSupply, decimals, selectedToken]);

  // getTokenIcon is now imported from @/assets/images/tokenList

  // 骨架屏
  if (loading) {
    return (
      <div className="px-5 py-6 space-y-4 bg-[var(--background)] min-h-screen">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 rounded-2xl" />
        <div className="space-y-3">
          <div className="skeleton h-24 rounded-xl" />
          <div className="skeleton h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-5 bg-[var(--background)] bg-grid bg-gradient-radial min-h-screen text-left text-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-base font-semibold text-[var(--foreground)]">{lpSwap.title as string}</h1>
        
        {/* 代币选择器 */}
        <button
          onClick={() => setShowTokenSelect(true)}
          className="flex items-center gap-2 bg-[var(--background-card)] border border-[var(--border-color)] px-4 py-2 rounded-xl transition-all duration-200 hover:bg-[var(--background-card-hover)] hover:border-[var(--border-color-hover)]"
        >
          {selectedToken && selectedToken.name !== '--' && (
            <Image
              src={getTokenIcon(selectedToken.name)}
              alt={selectedToken.name}
              width={20}
              height={20}
              className="rounded-full"
            />
          )}
          <span className="text-sm text-[var(--foreground)]">{selectedToken?.name || '--'}</span>
          <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* 描述 */}
      {selectedToken && (
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {selectedToken.name !== 'SOS'
            ? (lpSwap.desc as string).replace('{name}', selectedToken.name).replace('{total}', totalDisplay)
            : (lpSwap.desc2 as string).replace('{total}', totalDisplay)}
        </p>
      )}

      {/* 饼图 */}
      <div className="card mb-6">
        <div className="h-[280px] [&_.recharts-sector]:outline-none [&_.recharts-pie]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={40}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                style={{ outline: 'none' }}
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    stroke="none"
                    style={{ outline: 'none' }}
                  />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                height={50}
                formatter={(value, entry) => (
                  <span className="text-xs text-[var(--text-secondary)]">
                    {value} ({(entry.payload as { value: number }).value}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 合约地址和持仓 */}
      {selectedToken && (
        <div className="card mb-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">{lpSwap.address as string}</span>
            <a
              href={`https://bscscan.com/token/${selectedToken.address}#balances`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
            >
              {shortAddress(selectedToken.address)} ↗
            </a>
          </div>
          {address && (
            <>
              <div className="h-px bg-[var(--border-color)]" />
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">{lpSwap.shares as string}</span>
                <span className="text-[var(--primary)]">
                  {myBalance} <span className="text-[var(--primary)]">{selectedToken.name}</span>
                  <span className="ml-2 text-[var(--text-secondary)]">({myBalanceRate}%)</span>
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* 进度条 */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[var(--foreground)]">{lpSwap.navTitle as string}</h3>
          <span className="text-sm text-[var(--primary)] font-semibold">{percentage}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-indicator"
            style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
          />
        </div>
      </div>

      {/* 交换对列表 */}
      {pairsLoading ? (
        <div className="space-y-3">
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
        </div>
      ) : pairs.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-[var(--text-muted)] text-sm">{lpSwap.noData as string}</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {pairs.map((pair) => (
            <div key={pair.pairId} className="card flex items-center justify-between hover:bg-[var(--background-card-hover)] transition-colors">
              <div>
                <h4 className="text-lg text-[var(--foreground)] font-semibold mb-1">{pair.disPlayName}</h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  {lpSwap.timely as string} <span className="text-[var(--primary)]">{pair.rate}%</span>
                </p>
              </div>
              <Link
                href={`/lp-swap/detail?pairId=${pair.pairId}`}
                className="btn-primary px-6 leading-7 text-sm font-semibold"
              >
                {lpSwap.swap as string}
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* 代币选择弹窗 */}
      {showTokenSelect && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-[100]"
          onClick={() => setShowTokenSelect(false)}
        >
          <div 
            className="bg-[var(--background-card)] border-t border-[var(--border-color)] rounded-t-3xl w-full max-w-md p-5 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-[var(--text-muted)] rounded-full mx-auto mb-6" />
            <div className="text-center text-sm font-semibold text-[var(--foreground)] mb-6">
              {lpSwap.select as string}
            </div>

            {tokens.length > 0 ? (
              <div className="space-y-2">
                {tokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => {
                      setSelectedToken(token);
                      setShowTokenSelect(false);
                    }}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200 ${
                      selectedToken?.address === token.address 
                        ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/30' 
                        : 'bg-[var(--background-secondary)] border border-transparent hover:border-[var(--border-color)]'
                    }`}
                  >
                    <Image
                      src={getTokenIcon(token.name)}
                      alt={token.name}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <span className={`text-sm font-medium ${
                      selectedToken?.address === token.address ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'
                    }`}>
                      {token.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-[var(--text-muted)] text-sm">
                No Exchange Token
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
