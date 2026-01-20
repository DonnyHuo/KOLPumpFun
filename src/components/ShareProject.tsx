"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { kolApi, type ProjectInfo } from "@/lib/api";
import { copyToClipboard } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import zhCN from "@/i18n/zh-CN";
import enUS from "@/i18n/en-US";

// 扩展 ProjectInfo 类型，添加 API 返回的额外字段
interface ExtendedProjectInfo extends ProjectInfo {
  logo_url?: string;
  twitter_account?: string;
  tg_account?: string;
  project_type?: number;
  details?: string;
  lastPrice?: number;
  display_name?: string;
  exchange_rate?: number;
  // mint_pool_id 已在 ProjectInfo 中定义为 number
}

interface ShareProjectProps {
  page?: string; // 'noShare' 时显示认领按钮
  activeAmount?: number;
  onClickItem?: (item: ExtendedProjectInfo) => void;
}

export default function ShareProject({
  page,
  activeAmount = 0,
  onClickItem,
}: ShareProjectProps) {
  const { lang } = useStore();
  const t = lang === "zh" ? zhCN : enUS;
  const newData = t.newData as Record<string, string>;

  const [searchValue, setSearchValue] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");

  const { data: projectList = [], isLoading } = useQuery<ExtendedProjectInfo[]>(
    {
      queryKey: ["projectIssuedList"],
      queryFn: async () => {
        const res = await kolApi.getProjectIssuedList();
        return (res.data || []) as ExtendedProjectInfo[];
      },
    }
  );

  // 搜索和排序后的列表
  const filteredList = useMemo(() => {
    let list = [...projectList];

    // 搜索
    if (searchValue) {
      list = list.filter((item) =>
        item.symbol.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    // 排序 by 市值
    list.sort((a, b) => {
      const aValue = Number(a.total_supply) * (a.lastPrice || 0);
      const bValue = Number(b.total_supply) * (b.lastPrice || 0);
      return sort === "desc" ? bValue - aValue : aValue - bValue;
    });

    return list;
  }, [projectList, searchValue, sort]);

  // 排序切换
  const handleSort = () => {
    setSort((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  // 复制合约地址
  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(lang === "zh" ? "複製成功" : "Copied");
    }
  };

  // 点击项目
  const handleClickItem = (item: ExtendedProjectInfo) => {
    if (page === "noShare") {
      if (activeAmount > 0) {
        onClickItem?.(item);
      } else {
        toast.error(lang === "zh" ? "請先質押SOS" : "Please stake SOS first");
      }
    }
  };

  // 获取项目类型文字
  const getProjectType = (type?: number) => {
    if (type === 2) return lang === "zh" ? "銘文做市" : "Market Making";
    if (type === 0) return lang === "zh" ? "聯合KOL" : "Joint KOL";
    return lang === "zh" ? "單一KOL" : "Single KOL";
  };

  return (
    <div className="bg-white min-h-100 p-4 rounded-xl">
      {/* 搜索和排序 */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span>{lang === "zh" ? "市值" : "Market Cap"}</span>
          <button onClick={handleSort} className="flex flex-col gap-px">
            <ChevronUp
              className={`w-3 h-3 ${
                sort === "asc" ? "text-black" : "text-gray-400"
              }`}
            />
            <ChevronDown
              className={`w-3 h-3 -mt-1 ${
                sort === "desc" ? "text-black" : "text-gray-400"
              }`}
            />
          </button>
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={lang === "zh" ? "搜索" : "Search"}
          className="border border-gray-300 px-3 py-2 rounded-full text-xs w-32"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="h-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC519]"></div>
        </div>
      )}

      {/* 项目列表 */}
      {!isLoading && filteredList.length > 0 && (
        <div className="divide-y divide-gray-100">
          {filteredList.map((item, index) => (
            <div key={index} className="py-4">
              {/* 项目信息 */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Image
                      src={item.logo_url || "/tokenList/brc20-100t.png"}
                      alt={item.symbol}
                      width={30}
                      height={30}
                      className="rounded-full"
                    />
                    <span className="font-medium">{item.symbol}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {lang === "zh" ? "市值" : "Market Cap"}: $
                    {(
                      Number(item.total_supply) * (item.lastPrice || 0)
                    ).toFixed(0)}
                  </div>
                </div>
                <span className="text-sm font-medium">
                  ${(item.lastPrice || 0).toFixed(6)}
                </span>
              </div>

              {/* 社交链接和类型 */}
              <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
                {item.twitter_account && (
                  <a
                    href={item.twitter_account}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1 hover:border-white/20 transition-colors text-gray-400 hover:text-white"
                  >
                    {/* X (Twitter) Icon */}
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>X</span>
                  </a>
                )}
                {item.tg_account && (
                  <a
                    href={item.tg_account}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1 hover:border-white/20 transition-colors text-gray-400 hover:text-white"
                  >
                    <Send className="w-3 h-3" />
                    <span>Telegram</span>
                  </a>
                )}
                <span className="bg-gray-100 px-2 py-1 rounded">
                  {getProjectType(item.project_type)}
                </span>

                {/* 按钮 */}
                <div className="ml-auto">
                  {page !== "noShare" ? (
                    <button
                      onClick={() => handleCopy(item.contract_addr)}
                      className="btn-primary text-xs px-3 py-1"
                    >
                      {newData.copy || "Copy"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClickItem(item)}
                      className="btn-primary text-xs px-3 py-1"
                    >
                      {newData.approve}
                    </button>
                  )}
                </div>
              </div>

              {/* 项目详情 */}
              {item.details && (
                <p className="text-gray-500 text-xs">{item.details}</p>
              )}

              {/* Fair Launch 信息（仅联合/单一 KOL） */}
              {[0, 1].includes(item.project_type || -1) && (
                <div className="flex items-center justify-between mt-2 text-sm">
                  <div>
                    <span className="text-gray-900">Fair Launch: </span>
                    <span className="text-gray-500">
                      1{item.display_name?.split("-")[0]} = {item.exchange_rate}
                      {item.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/pool-detail?id=${item.mint_pool_id}&symbol=${item.symbol}`}
                    >
                      <button className="text-xs px-3 py-1 border border-gray-300 rounded-full hover:bg-gray-50">
                        {lang === "zh" ? "立即購買" : "Buy Now"}
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 无数据 */}
      {!isLoading && filteredList.length === 0 && (
        <div className="h-75 flex items-center justify-center text-gray-400">
          {lang === "zh" ? "暫無數據" : "No Data"}
        </div>
      )}
    </div>
  );
}
