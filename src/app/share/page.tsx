'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { kolApi, type ProjectInfo } from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import zhCN from '@/i18n/zh-CN';
import enUS from '@/i18n/en-US';
import { Send } from 'lucide-react';
import { brc20_100t } from '@/assets/images';

export default function SharePage() {
  const router = useRouter();
  const { lang } = useStore();
  const t = lang === 'zh' ? zhCN : enUS;
  const newData = t.newData as Record<string, string>;
  const shareProject = t.shareProject as Record<string, unknown>;

  const [loading, setLoading] = useState(true);
  const [projectList, setProjectList] = useState<ProjectInfo[]>([]);
  const [searchList, setSearchList] = useState<ProjectInfo[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');

  const { setCurrentProject } = useStore();

  // 跳转到池子详情页(公平发射/搶購)
  const goToPoolDetail = (item: ProjectInfo) => {
    setCurrentProject(item);
    router.push('/pool-detail');
  };

  // 跳转到早鸟详情页
  const goToEarlyBirdDetail = (item: ProjectInfo) => {
    setCurrentProject(item);
    router.push('/early-bird-detail');
  };

  // 获取项目列表
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const res = await kolApi.getProjectIssuedList();
        if (res.data?.length > 0) {
          setProjectList(res.data);
          setSearchList(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // 搜索过滤
  useEffect(() => {
    if (searchValue) {
      const filtered = projectList.filter((item) =>
        item.symbol.toLowerCase().includes(searchValue.toLowerCase())
      );
      setSearchList(filtered);
    } else {
      setSearchList(projectList);
    }
  }, [searchValue, projectList]);

  // 复制地址
  const handleCopy = async (address: string) => {
    const success = await copyToClipboard(address);
    if (success) {
      toast.success(t.common.copySuccess as string);
    }
  };

  // 排序
  const handleSort = () => {
    const newSort = sort === 'desc' ? 'asc' : 'desc';
    setSort(newSort);

    const sorted = [...searchList].sort((a, b) => {
      const marketCapA = Number(a.total_supply) * Number(a.lastPrice || 0);
      const marketCapB = Number(b.total_supply) * Number(b.lastPrice || 0);
      return newSort === 'asc' ? marketCapA - marketCapB : marketCapB - marketCapA;
    });
    setSearchList(sorted);
  };

  // 获取项目类型文字
  const getProjectType = (type: number | undefined) => {
    if (type === undefined) return '';
    const types = shareProject.projectTypes as Record<string, string>;
    switch (type) {
      case 0:
        return types.joint;
      case 1:
        return types.single;
      case 2:
        return types.marketMaking;
      default:
        return '';
    }
  };

  return (
    <div className="bg-[var(--background)] bg-grid min-h-screen px-5 py-5">
      {/* Header: 排序 + 搜索 */}
      <div className="flex items-center justify-between gap-4 text-sm mb-5">
        <button 
          onClick={handleSort} 
          className="flex items-center gap-2 bg-[var(--background-card)] border border-[var(--border-color)] px-4 py-2.5 rounded-xl hover:bg-[var(--background-card-hover)] transition-colors"
        >
          <span className="text-[var(--foreground)] text-sm">{newData.marketCap}</span>
          <div className="flex flex-col gap-[2px]">
            <div
              className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent"
              style={{ borderBottomColor: sort === 'asc' ? 'var(--primary)' : 'var(--text-muted)' }}
            />
            <div
              className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"
              style={{ borderTopColor: sort === 'desc' ? 'var(--primary)' : 'var(--text-muted)' }}
            />
          </div>
        </button>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={newData.search}
          className="input flex-1 max-w-[200px] text-sm"
        />
      </div>

      {/* 加载中 */}
      {loading && (
        <div className="h-[400px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-[var(--border-color)] border-t-[var(--primary)] rounded-full animate-spin" />
        </div>
      )}

      {/* 项目列表 */}
      {!loading && searchList.length > 0 && (
        <div className="space-y-4">
          {searchList.map((item, index) => (
            <div
              key={index}
              className="card hover:bg-[var(--background-card-hover)] transition-colors"
            >
              {/* 项目头部 */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--background-card-hover)] ring-2 ring-[var(--border-color)] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.logo_url || brc20_100t.src}
                      alt={item.symbol}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = brc20_100t.src;
                      }}
                    />
                  </div>
                  <div className="text-left">
                    <span className="text-[var(--foreground)] font-semibold">{item.symbol}</span>
                    <div className="text-[var(--text-secondary)] text-xs mt-0.5">
                      {newData.marketCap}: <span className="text-[var(--foreground)]">${(Number(item.total_supply) * Number(item.lastPrice || 0)).toFixed(0)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[var(--primary)] font-semibold">${Number(item.lastPrice || 0).toFixed(6)}</div>
              </div>

              {/* 社交链接和标签 */}
              <div className="flex items-center gap-2 mt-4 text-xs flex-wrap">
                <a
                  href={item.twitter_account || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[var(--background-card)] border border-[var(--border-color)] px-2 py-1 rounded-lg flex items-center gap-1.5 hover:border-[var(--border-color-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                  onClick={(e) => !item.twitter_account && e.preventDefault()}
                >
                  {/* X (Twitter) Icon */}
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span>X</span>
                </a>
                <a
                  href={item.tg_account || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[var(--background-card)] border border-[var(--border-color)] px-2 py-1 rounded-lg flex items-center gap-1.5 hover:border-[var(--border-color-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                  onClick={(e) => !item.tg_account && e.preventDefault()}
                >
                  <Send className="w-3 h-3" />
                  <span>{(shareProject.social as Record<string, string>).telegram}</span>
                </a>
                <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] px-2 py-1 rounded-lg">
                  {getProjectType(item.project_type)}
                </div>

                {/* 复制按钮 */}
                {!item.details && (
                  <button
                    onClick={() => handleCopy(item.contract_addr)}
                    className="ml-auto btn-primary h-auto py-2 px-4 text-xs"
                  >
                    {newData.copy}
                  </button>
                )}
              </div>

              {/* 项目描述 */}
              {item.details && (
                <div className="flex items-center justify-between gap-4 mt-4">
                  <div className="text-[var(--text-secondary)] text-xs">
                    {item.details}
                  </div>
                  <button
                    onClick={() => handleCopy(item.contract_addr)}
                    className="btn-primary h-auto py-2 px-4 text-xs shrink-0"
                  >
                    {newData.copy}
                  </button>
                </div>
              )}

              {/* 公平发射信息 */}
              {item.exchange_rate ? (
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <div className="text-sm mb-3 text-left">
                    <span className="text-[var(--foreground)]">{shareProject.fairLaunch as string}</span>
                    <span className="text-[var(--primary)] ml-2">
                      1{item.display_name?.split('-')[0] || 'BNB'} = {item.exchange_rate}{item.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button 
                      onClick={() => goToPoolDetail(item)}
                      className="btn-outline h-auto py-2 px-4 text-xs"
                    >
                      {shareProject.buyNow as string}
                    </button>
                    <button 
                      onClick={() => goToEarlyBirdDetail(item)}
                      className="btn-outline h-auto py-2 px-4 text-xs"
                    >
                      {shareProject.earlyBird as string}
                    </button>
                  </div>
                </div>
              ): null}

              {/* 无公平发射但有mint_pool_id时也显示入口 */}
              {!item.exchange_rate && item.mint_pool_id ? (
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-2 justify-end">
                    <button 
                      onClick={() => goToPoolDetail(item)}
                      className="btn-outline h-auto py-2 px-4 text-xs"
                    >
                      {shareProject.buyNow as string}
                    </button>
                    <button 
                      onClick={() => goToEarlyBirdDetail(item)}
                      className="btn-outline h-auto py-2 px-4 text-xs"
                    >
                      {shareProject.earlyBird as string}
                    </button>
                  </div>
                </div>
              ): null}
            </div>
          ))}
        </div>
      )}

      {/* 无数据 */}
      {!loading && searchList.length === 0 && (
        <div className="h-[400px] flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[var(--background-card)] flex items-center justify-center mb-4">
            <span className="text-2xl">📭</span>
          </div>
          <p className="text-[var(--text-muted)]">{newData.noData}</p>
        </div>
      )}
    </div>
  );
}
