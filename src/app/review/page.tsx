'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { ExternalLink, X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { adminApi, kolApi, type KolWaitInfo, type ProjectWaitInfo, type BindProjectWaitInfo, type ProjectInfo } from '@/lib/api';
import { CONTRACTS, ADMIN_ADDRESSES } from '@/constants/contracts';
import { shortAddress, formatDate, isValidUrl, getBscScanUrl } from '@/lib/utils';
import { useUserDepositedAmount } from '@/hooks/useDepositContract';
import { useTokenRatiosIndex, useTokenAirdropKols } from '@/hooks/useKolContract';
import { useStore } from '@/store/useStore';
import zhCN from '@/i18n/zh-CN';
import enUS from '@/i18n/en-US';
import { parseUnits, isAddress } from 'viem';
import { usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import erc20Abi from '@/constants/abi/erc20.json';

type Tab = 'kol' | 'project' | 'claim' | 'migrate';

interface MigrateToken {
  project_name: string;
  contract_addr: string;
  token_name: string;
  token_symbol: string;
  total_supply: string;
  percents: string[];
}

export default function ReviewPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { lang, setCurrentProject } = useStore();
  const t = lang === 'zh' ? zhCN : enUS;
  const review = t.review as Record<string, unknown>;
  const tabs = review.tabs as Record<string, string>;
  const statusMap = review.statusMap as Record<number, string>;

  const [activeTab, setActiveTab] = useState<Tab>('kol');
  const [kolList, setKolList] = useState<KolWaitInfo[]>([]);
  const [projectList, setProjectList] = useState<ProjectWaitInfo[]>([]);
  const [claimList, setClaimList] = useState<BindProjectWaitInfo[]>([]);
  const [issuedProjects, setIssuedProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // 认领审核弹窗
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<BindProjectWaitInfo | null>(null);
  const [percent, setPercent] = useState('');

  // 不通过确认弹窗
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectType, setRejectType] = useState<'kol' | 'project' | 'claim' | null>(null);
  const [rejectItem, setRejectItem] = useState<KolWaitInfo | ProjectWaitInfo | BindProjectWaitInfo | null>(null);

  // 迁移表单
  const [migrateToken, setMigrateToken] = useState<MigrateToken>({
    project_name: '',
    contract_addr: '',
    token_name: '',
    token_symbol: '',
    total_supply: '',
    percents: ['', '', '', ''],
  });
  const [migrateLoading, setMigrateLoading] = useState(false);

  // 获取已选项目的质押信息
  const { formatted: userDeposited } = useUserDepositedAmount(
    selectedClaim?.address as `0x${string}`
  );
  const { data: tokenId } = useTokenRatiosIndex(selectedClaim?.project_name || '');
  const { percentage: tokenAirdropKols } = useTokenAirdropKols(
    tokenId !== undefined ? BigInt(tokenId as number) : undefined
  );

  // 转账（用于迁移）
  const publicClient = usePublicClient();
  const { writeContract: writeTransfer, data: transferHash, isPending: transferPending } = useWriteContract();
  const { isLoading: isTransferConfirming, isSuccess: transferSuccess } = useWaitForTransactionReceipt({ hash: transferHash });

  // 检查是否管理员
  const isAdmin = address ? ADMIN_ADDRESSES.includes(address.toLowerCase() as typeof ADMIN_ADDRESSES[number]) : false;

  // 获取 KOL 列表
  const fetchKolList = async () => {
    setDataLoading(true);
    try {
      const res = await kolApi.getKolWaitAgreeList();
      setKolList(res.data || []);
    } catch (error) {
      console.error('Failed to fetch KOL list:', error);
      setKolList([]);
    } finally {
      setDataLoading(false);
    }
  };

  // 获取项目列表
  const fetchProjectList = async () => {
    setDataLoading(true);
    try {
      const res = await kolApi.getProjectWaitAgreeList();
      setProjectList(res.data || []);
    } catch (error) {
      console.error('Failed to fetch project list:', error);
      setProjectList([]);
    } finally {
      setDataLoading(false);
    }
  };

  // 获取认领列表
  const fetchClaimList = async () => {
    setDataLoading(true);
    try {
      const [claimRes, issuedRes] = await Promise.all([
        kolApi.getBindProjectWaitList(),
        kolApi.getProjectIssuedList(),
      ]);
      setClaimList(claimRes.data || []);
      setIssuedProjects(issuedRes.data || []);
    } catch (error) {
      console.error('Failed to fetch claim list:', error);
      setClaimList([]);
      setIssuedProjects([]);
    } finally {
      setDataLoading(false);
    }
  };

  // 跳转到项目详情
  const goToDetail = (projectName: string) => {
    const project = issuedProjects.find(p => p.project_name === projectName);
    if (project) {
      setCurrentProject(project);
      // 根据项目类型跳转到不同页面
      if (project.mint_pool_id) {
        router.push('/pool-detail');
      } else {
        router.push('/early-bird-detail');
      }
    } else {
      toast.error('項目詳情未找到');
    }
  };

  // 初始加载和 tabs 切换时刷新数据
  useEffect(() => {
    if (!isAdmin) return;
    
    switch (activeTab) {
      case 'kol':
        fetchKolList();
        break;
      case 'project':
        fetchProjectList();
        break;
      case 'claim':
        fetchClaimList();
        break;
      case 'migrate':
        // migrate tab 不需要数据
        break;
    }
  }, [activeTab, isAdmin]);

  // 监听迁移转账成功
  useEffect(() => {
    if (transferSuccess && migrateLoading) {
      handleMigrateApi();
    }
  }, [transferSuccess]);

  // 审核 KOL
  const handleKolAgree = async (item: KolWaitInfo, agree: boolean) => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await adminApi.agreeKol(address, item.address, agree);
      if (res.message) {
        toast.error(res.message);
      } else {
        toast.success(agree ? t.common.reviewPass as string : t.common.reviewReject as string);
        fetchKolList();
      }
    } catch (error) {
      toast.error(t.common.operationFailed as string);
    } finally {
      setLoading(false);
    }
  };

  // 审核项目
  const handleProjectAgree = async (item: ProjectWaitInfo, agree: boolean) => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await adminApi.agreeProject(address, item.project_name, agree);
      if (res.message) {
        toast.error(res.message);
      } else {
        toast.success(agree ? t.common.reviewPass as string : t.common.reviewReject as string);
        fetchProjectList();
      }
    } catch (error) {
      toast.error(t.common.operationFailed as string);
    } finally {
      setLoading(false);
    }
  };

  // 打开认领审核弹窗
  const handleOpenClaimModal = (item: BindProjectWaitInfo) => {
    setSelectedClaim(item);
    setPercent('');
    setShowClaimModal(true);
  };

  // 审核认领（直接传入 item）
  const handleClaimAgreeDirect = async (item: BindProjectWaitInfo, agree: boolean) => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await adminApi.agreeBindProject(
        address,
        item.address,
        item.project_name,
        agree,
        200
      );
      if (res.message) {
        toast.error(res.message);
      } else {
        toast.success(agree ? t.common.reviewPass as string : t.common.reviewReject as string);
        fetchClaimList();
      }
    } catch (error) {
      toast.error(t.common.operationFailed as string);
    } finally {
      setLoading(false);
    }
  };

  // 审核认领
  const handleClaimAgree = async (agree: boolean, withPercent?: boolean) => {
    if (!address || !selectedClaim) return;

    if (withPercent) {
      // 验证比例
      const percentNum = parseFloat(percent);
      if (isNaN(percentNum) || percentNum <= 0 || percentNum > 100) {
        toast.error(t.common.fillCorrectRatio as string);
        return;
      }
      if (percentNum > 100 - parseFloat(tokenAirdropKols)) {
        toast.error(t.common.ratioExceed as string);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await adminApi.agreeBindProject(
        address,
        selectedClaim.address,
        selectedClaim.project_name,
        agree,
        withPercent ? Math.round(parseFloat(percent) * 100) : 200
      );
      if (res.message) {
        toast.error(res.message);
      } else {
        toast.success(agree ? t.common.reviewPass as string : t.common.reviewReject as string);
        setShowClaimModal(false);
        fetchClaimList();
      }
    } catch (error) {
      toast.error(t.common.operationFailed as string);
    } finally {
      setLoading(false);
    }
  };

  // 迁移 Token
  const handleMigrate = async () => {
    // 验证表单 - 检查所有必填字段
    if (!migrateToken.project_name || !migrateToken.contract_addr ||
        !migrateToken.token_name || !migrateToken.token_symbol ||
        !migrateToken.total_supply) {
      toast.error(t.common.fillRequired as string);
      return;
    }

    // 验证 percents 数组 - 每个值都必须存在且大于0
    const isPercentsValid = migrateToken.percents.every(p => {
      const value = parseFloat(p);
      return p !== '' && !isNaN(value) && value > 0;
    });
    if (!isPercentsValid) {
      toast.error(t.common.fillAllRatio as string);
      return;
    }

    // 验证合约地址
    if (!isAddress(migrateToken.contract_addr)) {
      toast.error(t.common.fillCorrectRatio as string);
      return;
    }

    setMigrateLoading(true);

    try {
      // 获取 token 的 decimals
      const decimals = await publicClient?.readContract({
        address: migrateToken.contract_addr as `0x${string}`,
        abi: erc20Abi,
        functionName: 'decimals',
      });

      if (!decimals) {
        toast.error('無法獲取代幣精度');
        setMigrateLoading(false);
        return;
      }

      // 计算转账金额
      const kolPercent = parseFloat(migrateToken.percents[3]) / 100;
      const transferAmount = parseFloat(migrateToken.total_supply) * kolPercent;

      // 转账到 KOL 分配合约
      const amount = parseUnits(transferAmount.toString(), Number(decimals));
      writeTransfer({
        address: migrateToken.contract_addr as `0x${string}`,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [CONTRACTS.KOL as `0x${string}`, amount],
        gas: BigInt(100000),
        gasPrice: parseUnits('5', 9), // 5 gwei
      });
    } catch (error) {
      setMigrateLoading(false);
      toast.error(t.common.transferFailed as string);
      console.error('Migration error:', error);
    }
  };

  // 调用迁移 API
  const handleMigrateApi = async () => {
    if (!address) return;

    try {
      const percents = migrateToken.percents.map(p => Math.round(parseFloat(p) * 100));
      await adminApi.migrateToken({
        admin_address: address,
        project_name: migrateToken.project_name,
        contract_addr: migrateToken.contract_addr,
        token_name: migrateToken.token_name,
        token_symbol: migrateToken.token_symbol,
        total_supply: migrateToken.total_supply,
        percents,
      });

      // 与 Vue 项目一致：只要 API 调用成功就显示成功
      toast.success(t.common.migrateSuccess as string);
      setMigrateToken({
        project_name: '',
        contract_addr: '',
        token_name: '',
        token_symbol: '',
        total_supply: '',
        percents: ['', '', '', ''],
      });
    } catch (error) {
      toast.error(t.common.migrateFailed as string);
    } finally {
      setMigrateLoading(false);
    }
  };

  // 更新分配比例
  const updatePercent = (index: number, value: string) => {
    const newPercents = [...migrateToken.percents];
    newPercents[index] = value;
    setMigrateToken({ ...migrateToken, percents: newPercents });
  };

  // 渲染链接
  const renderLink = (url: string | undefined) => {
    if (!url) return <span className="text-gray-500">--</span>;
    if (isValidUrl(url)) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#FFC519] hover:text-[#e6b117] flex items-center gap-1 truncate max-w-[150px] transition-colors"
          title={url}
        >
          {url.length > 30 ? `${url.slice(0, 30)}...` : url}
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      );
    }
    return <span className="truncate max-w-[150px] text-white">{url}</span>;
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-[#0D0D0F]">
        <p className="text-gray-500">無權限訪問</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 min-h-screen bg-[#0D0D0F]">
      <h1 className="text-xl font-semibold mb-6 text-white">{review.title as string}</h1>

      {/* Tabs */}
      <div className="flex bg-[#1A1A1E] border border-white/10 rounded-xl p-1 mb-6">
        {(['kol', 'project', 'claim', 'migrate'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-gradient-to-r from-[#FB8018] to-[#FFC519] text-black font-semibold shadow-md'
                : 'text-gray-400 hover:bg-white/5'
            }`}
          >
            {tabs[tab]}
          </button>
        ))}
      </div>

      {/* KOL 列表 */}
      {activeTab === 'kol' && (
        <div className="space-y-4">
          {dataLoading ? (
            <div className="card text-center py-10">
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span>{t.common.loading as string}</span>
              </div>
            </div>
          ) : kolList.length === 0 ? (
            <div className="card text-center py-10 text-gray-500">暫無數據</div>
          ) : (
            kolList.map((item, index) => (
              <div key={index} className="card">
                <div className="space-y-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.certifyAddress as string}</span>
                    <a
                      href={getBscScanUrl(item.address, 'address')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FFC519] hover:text-[#e6b117] transition-colors"
                    >
                      {shortAddress(item.address)}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.twitterAddress as string}</span>
                    {renderLink(item.twitter_account)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.telegramAddress as string}</span>
                    {renderLink(item.tg_account)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.binanceSquare as string}</span>
                    {renderLink(item.discord_account)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.status as string}</span>
                    <span className="text-white">{statusMap[item.status]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.createTime as string}</span>
                    <span className="text-white">{formatDate(item.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => handleKolAgree(item, true)}
                    disabled={loading || item.status !== 0}
                    className="btn-primary flex-1 text-sm"
                  >
                    {review.approve as string}
                  </button>
                  <button
                    onClick={() => {
                      setRejectType('kol');
                      setRejectItem(item);
                      setShowRejectConfirm(true);
                    }}
                    disabled={loading || item.status !== 0}
                    className="btn-outline flex-1 text-sm"
                  >
                    {review.reject as string}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 项目列表 */}
      {activeTab === 'project' && (
        <div className="space-y-4">
          {dataLoading ? (
            <div className="card text-center py-10">
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span>{t.common.loading as string}</span>
              </div>
            </div>
          ) : projectList.length === 0 ? (
            <div className="card text-center py-10 text-gray-500">暫無數據</div>
          ) : (
            projectList.map((item, index) => (
              <div key={index} className="card">
                <div className="space-y-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.tokenName as string}</span>
                    <span className="text-white">{item.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.tokenSymbol as string}</span>
                    <span className="text-white">{item.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.totalSupply as string}</span>
                    <span className="text-white">{item.total_supply}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-gray-400 mb-3">{review.distribution as string}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between bg-white/5 p-2.5 rounded-lg border border-white/5">
                        <span className="text-gray-400">{review.crossChain as string}</span>
                        <span className="text-white">{item.cross_percent / 100}%</span>
                      </div>
                      <div className="flex justify-between bg-white/5 p-2.5 rounded-lg border border-white/5">
                        <span className="text-gray-400">{review.liquidityIssue as string}</span>
                        <span className="text-white">{item.le_percent / 100}%</span>
                      </div>
                      <div className="flex justify-between bg-white/5 p-2.5 rounded-lg border border-white/5">
                        <span className="text-gray-400">{review.launchPool as string}</span>
                        <span className="text-white">{item.lm_percent / 100}%</span>
                      </div>
                      <div className="flex justify-between bg-white/5 p-2.5 rounded-lg border border-white/5">
                        <span className="text-gray-400">{review.communityAirdrop as string}</span>
                        <span className="text-white">{item.kol_percent / 100}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-gray-400">{review.createTime as string}</span>
                    <span className="text-white">{formatDate(item.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => handleProjectAgree(item, true)}
                    disabled={loading}
                    className="btn-primary flex-1 text-sm"
                  >
                    {review.approve as string}
                  </button>
                  <button
                    onClick={() => {
                      setRejectType('project');
                      setRejectItem(item);
                      setShowRejectConfirm(true);
                    }}
                    disabled={loading}
                    className="btn-outline flex-1 text-sm"
                  >
                    {review.reject as string}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 认领列表 */}
      {activeTab === 'claim' && (
        <div className="space-y-4">
          {dataLoading ? (
            <div className="card text-center py-10">
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span>{t.common.loading as string}</span>
              </div>
            </div>
          ) : claimList.length === 0 ? (
            <div className="card text-center py-10 text-gray-500">暫無數據</div>
          ) : (
            claimList.map((item, index) => (
              <div key={index} className="card">
                <div className="space-y-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.tokenName as string}</span>
                    <button 
                      onClick={() => goToDetail(item.project_name)}
                      className="text-[#FFC519] hover:text-[#e6b117] transition-colors underline"
                    >
                      {item.project_name}
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.claimAddress as string}</span>
                    <a
                      href={getBscScanUrl(item.address, 'address')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FFC519] hover:text-[#e6b117] transition-colors"
                    >
                      {shortAddress(item.address)}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.twitterAddress as string}</span>
                    {renderLink(item.twitter_account)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.telegramAddress as string}</span>
                    {renderLink(item.tg_account)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.binanceSquare as string}</span>
                    {item.discord_account ? (
                      <a
                        href={item.discord_account}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#FFC519] hover:text-[#e6b117] flex items-center gap-1 transition-colors"
                        title={item.discord_account}
                      >
                        @SmartBTCdao
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-gray-500">--</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{review.createTime as string}</span>
                    <span className="text-white">{formatDate(item.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => handleOpenClaimModal(item)}
                    disabled={loading}
                    className="btn-primary flex-1 text-sm"
                  >
                    {review.approve as string}
                  </button>
                  <button
                    onClick={() => {
                      setRejectType('claim');
                      setRejectItem(item);
                      setShowRejectConfirm(true);
                    }}
                    disabled={loading}
                    className="btn-outline flex-1 text-sm"
                  >
                    {review.reject as string}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 迁移 */}
      {activeTab === 'migrate' && (
        <div className="card">
          <div className="space-y-4">
            <div>
              <label className="text-sm mb-2 block text-gray-300 text-left">{review.projectName as string}</label>
              <input
                type="text"
                value={migrateToken.project_name}
                onChange={(e) => setMigrateToken({ ...migrateToken, project_name: e.target.value })}
                className="input"
                placeholder="100T-XXX"
              />
            </div>
            <div>
              <label className="text-sm mb-2 block text-gray-300 text-left">{review.contractAddress as string}</label>
              <input
                type="text"
                value={migrateToken.contract_addr}
                onChange={(e) => setMigrateToken({ ...migrateToken, contract_addr: e.target.value })}
                className="input"
                placeholder="0x..."
              />
            </div>
            <div>
              <label className="text-sm mb-2 block text-gray-300 text-left">{review.tokenName as string}</label>
              <input
                type="text"
                value={migrateToken.token_name}
                onChange={(e) => setMigrateToken({ ...migrateToken, token_name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="text-sm mb-2 block text-gray-300 text-left">{review.tokenSymbol as string}</label>
              <input
                type="text"
                value={migrateToken.token_symbol}
                onChange={(e) => setMigrateToken({ ...migrateToken, token_symbol: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="text-sm mb-2 block text-gray-300 text-left">{review.totalSupply as string}</label>
              <input
                type="text"
                value={migrateToken.total_supply}
                onChange={(e) => setMigrateToken({ ...migrateToken, total_supply: e.target.value })}
                className="input"
              />
            </div>

            <div className="pt-5 border-t border-white/10">
              <p className="text-sm font-medium mb-4 text-white text-left">{review.distribution as string}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-2 block text-left">{review.crossChain as string}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={migrateToken.percents[0]}
                      onChange={(e) => updatePercent(0, e.target.value)}
                      className="input text-sm"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-2 block text-left">{review.liquidityIssue as string}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={migrateToken.percents[1]}
                      onChange={(e) => updatePercent(1, e.target.value)}
                      className="input text-sm"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-2 block text-left">{review.launchPool as string}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={migrateToken.percents[2]}
                      onChange={(e) => updatePercent(2, e.target.value)}
                      className="input text-sm"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-2 block text-left">{review.kolReward as string}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={migrateToken.percents[3]}
                      onChange={(e) => updatePercent(3, e.target.value)}
                      className="input text-sm"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleMigrate}
              disabled={migrateLoading || transferPending}
              className="btn-primary w-full mt-5"
            >
              {migrateLoading || transferPending ? '...' : review.migrateToken as string}
            </button>
          </div>
        </div>
      )}

      {/* 认领审核弹窗 */}
      {showClaimModal && selectedClaim && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-100">
          <div className="bg-[#1A1A1E] rounded-t-3xl w-full max-w-md p-6 animate-slide-up border-t border-white/10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">審核認領項目</h3>
              <button 
                onClick={() => setShowClaimModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">{review.stakeAmount as string}</span>
                <span className="text-white">{parseFloat(userDeposited).toFixed(2)} SOS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{review.currentWeight as string}</span>
                <span className="text-white">{tokenAirdropKols} / 100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{review.allocationRatio as string}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={percent}
                    onChange={(e) => setPercent(e.target.value)}
                    className="input w-20 text-sm text-center"
                    placeholder="0"
                  />
                  <span className="text-gray-400">%</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleClaimAgree(true, true)}
              disabled={loading}
              className="btn-primary w-full mt-6"
            >
              {loading ? '...' : review.approve as string}
            </button>
          </div>
        </div>
      )}

      {/* 不通过确认弹窗 */}
      <ConfirmDialog
        open={showRejectConfirm}
        title={lang === 'zh' ? '確認不通過' : 'Confirm Reject'}
        message={lang === 'zh' ? '確定要審核不通過嗎？' : 'Are you sure you want to reject this review?'}
        confirmText={t.common.confirm as string || '確認'}
        cancelText={t.common.cancel as string || '取消'}
        loading={loading}
        onConfirm={async () => {
          if (!rejectItem || !rejectType) return;
          
          // 先关闭弹窗
          setShowRejectConfirm(false);
          
          // 根据类型执行相应的不通过操作
          if (rejectType === 'kol') {
            await handleKolAgree(rejectItem as KolWaitInfo, false);
          } else if (rejectType === 'project') {
            await handleProjectAgree(rejectItem as ProjectWaitInfo, false);
          } else if (rejectType === 'claim') {
            await handleClaimAgreeDirect(rejectItem as BindProjectWaitInfo, false);
          }
          
          // 清理状态
          setRejectType(null);
          setRejectItem(null);
        }}
        onCancel={() => {
          setShowRejectConfirm(false);
          setRejectType(null);
          setRejectItem(null);
        }}
      />
    </div>
  );
}
