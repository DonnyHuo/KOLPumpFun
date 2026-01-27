"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { kolApi, type ProjectInfo } from "@/lib/api";
import { copyToClipboard, formatLargeNumber } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import zhCN from "@/i18n/zh-CN";
import enUS from "@/i18n/en-US";
import { Send } from "lucide-react";
import { brc20_100t } from "@/assets/images";

export default function SharePage() {
  const router = useRouter();
  const { lang } = useStore();
  const t = lang === "zh" ? zhCN : enUS;
  const newData = t.newData as Record<string, string>;
  const shareProject = t.shareProject as Record<string, unknown>;

  const [searchValue, setSearchValue] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");

  const { setCurrentProject } = useStore();

  // 跳转到池子详情页(公平发射/搶購)
  const goToPoolDetail = (item: ProjectInfo) => {
    setCurrentProject(item);
    router.push("/pool-detail");
  };

  // 跳转到早鸟详情页
  const goToEarlyBirdDetail = (item: ProjectInfo) => {
    setCurrentProject(item);
    router.push("/early-bird-detail");
  };

  const { data: projectList = [], isLoading } = useQuery<ProjectInfo[]>({
    queryKey: ["projectIssuedList"],
    queryFn: async () => {
      const res = await kolApi.getProjectIssuedList();
      return res.data || [];
    },
  });

  const searchList = useMemo(() => {
    let list = [...projectList];
    if (searchValue) {
      list = list.filter((item) =>
        item.symbol.toLowerCase().includes(searchValue.toLowerCase()),
      );
    }

    // 按内盘进度排序
    list.sort((a, b) => {
      const progressA = a.mint_process_percent
        ? Number(a.mint_process_percent.split(",")[1])
        : 0;
      const progressB = b.mint_process_percent
        ? Number(b.mint_process_percent.split(",")[1])
        : 0;
      return sort === "asc" ? progressA - progressB : progressB - progressA;
    });

    return list;
  }, [projectList, searchValue, sort]);

  // 复制地址
  const handleCopy = async (address: string) => {
    const success = await copyToClipboard(address);
    if (success) {
      toast.success(t.common.copySuccess as string);
    }
  };

  // 排序
  const handleSort = () => {
    const newSort = sort === "desc" ? "asc" : "desc";
    setSort(newSort);
  };

  // 获取项目类型文字
  const getProjectType = (type: number | undefined) => {
    if (type === undefined) return "";
    const types = shareProject.projectTypes as Record<string, string>;
    switch (type) {
      case 0:
        return types.joint;
      case 1:
        return types.single;
      case 2:
        return types.marketMaking;
      default:
        return "";
    }
  };

  return (
    <div className="bg-background bg-grid min-h-screen px-5 py-5">
      {/* Header: 排序 + 搜索 */}
      <div className="flex items-center justify-between gap-4 text-sm mb-5">
        <button
          onClick={handleSort}
          className="flex items-center gap-2 bg-background-card border border-border px-4 py-2.5 rounded-xl hover:bg-card-hover transition-colors"
        >
          <span className="text-secondary text-sm">內盤進度</span>
          <div className="flex flex-col gap-0.5">
            <div
              className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent"
              style={{
                borderBottomColor:
                  sort === "asc" ? "var(--primary)" : "var(--text-muted)",
              }}
            />
            <div
              className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"
              style={{
                borderTopColor:
                  sort === "desc" ? "var(--primary)" : "var(--text-muted)",
              }}
            />
          </div>
        </button>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={newData.search}
          className="input flex-1 max-w-50 text-sm"
        />
      </div>

      {/* 加载中 */}
      {isLoading && (
        <div className="h-100 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* 项目列表 */}
      {!isLoading && searchList.length > 0 && (
        <div className="space-y-4">
          {searchList.map((item, index) => (
            <div
              key={index}
              className="card hover:bg-card-hover transition-colors"
            >
              {/* 项目头部 */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-card-hover ring-2 ring-border overflow-hidden">
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
                    <span className="text-secondary font-semibold">
                      {item.symbol}
                    </span>
                  </div>
                </div>
              </div>

              {/* 社交链接和标签 */}
              <div className="flex items-center gap-2 mt-4 text-xs flex-wrap">
                <a
                  href={item.twitter_account || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-background-card border border-border px-2 py-1 rounded-lg flex items-center gap-1.5 hover:border-hover transition-colors text-text-secondary hover:text-secondary"
                  onClick={(e) => !item.twitter_account && e.preventDefault()}
                >
                  {/* X (Twitter) Icon */}
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>Twitter</span>
                </a>
                <a
                  href={item.tg_account || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-background-card border border-border px-2 py-1 rounded-lg flex items-center gap-1.5 hover:border-hover transition-colors text-text-secondary hover:text-secondary"
                  onClick={(e) => !item.tg_account && e.preventDefault()}
                >
                  <Send className="w-3 h-3" />
                  <span>
                    {(shareProject.social as Record<string, string>).telegram}
                  </span>
                </a>
                <div className="bg-primary/10 border border-primary/30 text-primary px-2 py-1 rounded-lg">
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

              {/* 项目数据字段（仅联合KOL和单一KOL显示） */}
              {(item.project_type === 0 || item.project_type === 1) && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {/* 开盘涨幅 */}
                  {item.cross_percent !== undefined &&
                    item.lm_percent !== undefined &&
                    item.lm_percent > 100 && (
                      <div className="flex justify-between bg-background-card-hover border border-border rounded-lg p-2">
                        <span className="text-text-secondary">開盤漲幅</span>
                        <span className="text-primary font-medium">
                          {(
                            (item.cross_percent * 0.9) /
                            (item.lm_percent - 100)
                          ).toFixed(2)}
                          %
                        </span>
                      </div>
                    )}

                  {/* 早鸟进度 */}
                  {item.airdrop_process_percent && (
                    <div className="flex justify-between bg-background-card-hover border border-border rounded-lg p-2">
                      <span className="text-text-secondary">早鳥進度</span>
                      <span className="text-secondary font-medium">
                        {item.airdrop_process_percent.split(",")[1]}%
                      </span>
                    </div>
                  )}

                  {/* 内盘进度 */}
                  {item.mint_process_percent && (
                    <div className="flex justify-between bg-background-card-hover border border-border rounded-lg p-2">
                      <span className="text-text-secondary">內盤進度</span>
                      <span className="text-secondary font-medium">
                        {Number(
                          item.mint_process_percent.split(",")[1],
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  )}

                  {/* 内盘额度 */}
                  {item.mint_process_percent && (
                    <div className="flex justify-between bg-background-card-hover border border-border rounded-lg p-2">
                      <span className="text-text-secondary">內盤額度</span>
                      <span className="text-secondary font-medium">
                        {(() => {
                          const rawAmount =
                            item.mint_process_percent.split(",")[0];
                          const formatted = formatUnits(BigInt(rawAmount), 18);
                          return formatLargeNumber(Number(formatted));
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 项目描述 */}
              {item.details && (
                <div className="flex items-center justify-between gap-4 mt-4">
                  <div className="text-text-secondary text-xs">
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
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-sm mb-3 text-left">
                    <span className="text-secondary">
                      {shareProject.fairLaunch as string}
                    </span>
                    <span className="text-primary ml-2">
                      1 {item.display_name?.split("-")[0] || "BNB"} ={" "}
                      {item.exchange_rate} {item.symbol}
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
              ) : null}

              {/* 无公平发射但有mint_pool_id时也显示入口 */}
              {!item.exchange_rate && item.mint_pool_id ? (
                <div className="mt-4 pt-4 border-t border-border">
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
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* 无数据 */}
      {!isLoading && searchList.length === 0 && (
        <div className="h-100 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-background-card flex items-center justify-center mb-4">
            <span className="text-2xl">📭</span>
          </div>
          <p className="text-text-muted">{newData.noData}</p>
        </div>
      )}
    </div>
  );
}
