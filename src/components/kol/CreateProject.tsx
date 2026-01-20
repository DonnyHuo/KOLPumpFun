"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useConnection } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Upload, X, Copy, Check, Send } from "lucide-react";
import { Tip } from "@/components/ui/Tip";
import { kolApi, type SelectToken, type ProjectInfo } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { shortAddress, copyToClipboard, cn } from "@/lib/utils";
import { getTokenIcon } from "@/assets/images/tokenList";

import Image from "next/image";

interface CreateProjectProps {
  activeAmount: number;
  onSuccess: () => void;
  t: Record<string, unknown>;
  kolInfo?: {
    status?: number;
    project_name?: string;
  } | null;
}

type KolMode = "joint" | "single" | "marketMaking";
type ProjectTab = "create" | "claim";

const MODE_REQUIREMENTS = {
  joint: { min: 100, max: 2099 },
  single: { min: 10000, max: Infinity },
  marketMaking: { min: 2100, max: 9999 },
};

// 分配比例显示组件 - 移到外部避免重新创建导致失去焦点
function PercentBox({
  label,
  value,
  editable = false,
  onChange,
  tooltip,
}: {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (value: string) => void;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between bg-background-card border border-border h-12 px-4 rounded-xl">
      <div className="flex items-center gap-1">
        <span className="text-xs text-text-secondary">{label}</span>
        {tooltip && <Tip content={tooltip} />}
      </div>
      {editable ? (
        <div className="flex items-center">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder="> 0"
            className="w-12.5 h-7.5 text-xs text-right bg-background-card border border-border rounded-lg px-2 text-foreground focus:outline-none focus:border-primary"
          />
          <span className="ml-2 text-text-secondary">%</span>
        </div>
      ) : (
        <span className="font-semibold text-primary">{value}%</span>
      )}
    </div>
  );
}

export function CreateProject({
  activeAmount,
  onSuccess,
  t,
  kolInfo,
}: CreateProjectProps) {
  const router = useRouter();
  const { address } = useConnection();
  const { accountInfoStatus, setCurrentProject, theme } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从 t 中解构翻译
  const review = t.review as Record<string, unknown>;

  // 获取状态文本
  const reviewStatusMap = (review?.statusMap as Record<string, string>) || {};
  const getStatusText = (status: number) => {
    return reviewStatusMap[status] || "";
  };

  // 是否已认领项目（status 不是 0 或 1）
  const hasClaimedProject = kolInfo && ![0, 1].includes(kolInfo.status || 0);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectTab>("create");
  const [activeMode, setActiveMode] = useState<KolMode>("joint");
  const [showTokenList, setShowTokenList] = useState(false);
  const [tokenList, setTokenList] = useState<SelectToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<SelectToken | null>(null);
  const [, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  // 认领项目相关状态
  const [projectList, setProjectList] = useState<ProjectInfo[]>([]);
  const [filteredList, setFilteredList] = useState<ProjectInfo[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [selectedProject, setSelectedProject] = useState<ProjectInfo | null>(
    null
  );
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimChecked, setClaimChecked] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // 联合KOL模式表单数据 (比例固定)
  const [typeOne, setTypeOne] = useState({
    brc20_name: "",
    symbol: "",
    details: "",
    percents: ["45", "20", "15", "20"], // 公平发射, LP添加, 启动池, KOL奖励
  });

  // 单一KOL模式表单数据 (LP添加和KOL奖励可编辑)
  const [typeTwo, setTypeTwo] = useState({
    brc20_name: "",
    symbol: "",
    details: "",
    percents: ["45", "", "15", ""], // 公平发射固定45%, 启动池固定15%, LP添加和KOL奖励可编辑
  });

  // 铭文做市商模式表单数据 (所有比例可编辑)
  const [typeThree, setTypeThree] = useState({
    brc20_name: "",
    brc20_supply: "",
    brc20_id: "",
    details: "",
    percents: ["", "", "", ""], // 铭文跨链, LP添加, 启动池, KOL奖励
  });

  const createProject = t.createProject as Record<string, unknown>;
  const home = t.home as Record<string, unknown>;
  const kol = t.kol as Record<string, unknown>;
  const kolTypes = (createProject?.kolTypes as Record<string, string>) || {
    joint: "聯合KOL模式",
    single: "單一KOL模式",
    marketMaking: "銘文做市商模式",
  };
  const common = t.common as Record<string, unknown>;
  const newData = (t.newData as Record<string, string>) || {};
  const shareProject = (t.shareProject as Record<string, unknown>) || {};

  // 认领规则文案
  const contentDesc = kol?.contentDesc as string[];

  // 默认代币列表
  const defaultTokens = useMemo(() => {
    return [
      {
        mint_base_token: "BNB",
        mint_base_token_addr: "0x55d398326f99059ff775485246999027b3197955",
        exchange_rate: 9000000,
      },
      {
        mint_base_token: "USDT",
        mint_base_token_addr: "0x55d398326f99059ff775485246999027b3197955",
        exchange_rate: 10000,
      },
      {
        mint_base_token: "BTCB",
        mint_base_token_addr: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
        exchange_rate: 900000000,
      },
    ];
  }, []);

  useEffect(() => {
    setTokenList(defaultTokens);
    setSelectedToken(defaultTokens[0]);
  }, [defaultTokens]);

  const { data: issuedProjects = [] } = useQuery<ProjectInfo[]>({
    queryKey: ["projectIssuedList"],
    queryFn: async () => {
      const res = await kolApi.getProjectIssuedList();
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    setProjectList(issuedProjects);
    setFilteredList(issuedProjects);
  }, [issuedProjects]);

  // 搜索过滤
  useEffect(() => {
    if (searchValue) {
      const filtered = projectList.filter((item) =>
        item.project_name?.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredList(filtered);
    } else {
      setFilteredList(projectList);
    }
  }, [searchValue, projectList]);

  // 生成推文文案
  const getTweetText = () => {
    if (!selectedProject || !address) return "";
    const projectName =
      selectedProject.project_name?.split("100T-")[1] ||
      selectedProject.project_name;
    return kol?.tweet
      ? (kol.tweet as string)
          .replace("{address}", shortAddress(address))
          .replace(/{name}/g, projectName)
      : `我的錢包${shortAddress(
          address
        )}已經質押SOS，正在SmartBTC.io平台提交KOL認證，參與推廣${projectName}銘文，請大家幫忙點讚、轉發這則推文，助力${projectName}銘文上SmartBTC熱門！`;
  };

  // 复制推文
  const handleCopyTweet = async () => {
    const success = await copyToClipboard(getTweetText());
    if (success) {
      setCopied(true);
      toast.success((common?.copySuccess as string) || "複製成功");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 排序项目列表
  const handleSort = () => {
    const newOrder = sortOrder === "desc" ? "asc" : "desc";
    setSortOrder(newOrder);
    const sorted = [...filteredList].sort((a, b) => {
      const marketCapA = Number(a.total_supply || 0) * Number(a.lastPrice || 0);
      const marketCapB = Number(b.total_supply || 0) * Number(b.lastPrice || 0);
      return newOrder === "asc"
        ? marketCapA - marketCapB
        : marketCapB - marketCapA;
    });
    setFilteredList(sorted);
  };

  // 点击项目
  const handleClickProject = (project: ProjectInfo) => {
    if (activeAmount <= 0) {
      toast.error((kol?.pleaseStakeSOS as string) || "請先質押SOS");
      return;
    }
    setSelectedProject(project);
    setClaimChecked(false);
    setShowClaimModal(true);
  };

  // 认领项目
  const handleClaim = async () => {
    if (!address || !selectedProject) return;

    setClaimLoading(true);
    try {
      await kolApi.bindProject({
        kol_address: address,
        project_name: selectedProject.project_name,
      });

      // 与 Vue 项目一致：只要请求成功就显示成功提示
      toast.success((kol?.claimSuccess as string) || "認領成功");
      setShowClaimModal(false);
      onSuccess();
    } catch (error) {
      toast.error("認領失敗");
      console.error(error);
    } finally {
      setClaimLoading(false);
    }
  };

  // 检查模式是否可选
  const canSelectMode = (mode: KolMode): boolean => {
    const req = MODE_REQUIREMENTS[mode];
    return (
      (activeAmount >= req.min && activeAmount <= req.max) || activeAmount === 0
    );
  };

  // 切换模式
  const handleModeChange = (mode: KolMode) => {
    // 铭文做市商模式暂未开放
    if (mode === "marketMaking") {
      toast.info((common?.notOpenYet as string) || "暫未開放");
      return;
    }
    if (canSelectMode(mode)) {
      setActiveMode(mode);
    }
  };

  // 选择代币
  const handleSelectToken = (token: SelectToken) => {
    setSelectedToken(token);
    setShowTokenList(false);
  };

  // 处理图片上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("圖片大小不能超過 5MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 单一KOL模式：KOL奖励改变时自动计算LP添加
  // 单一KOL模式：LP和KOL总共40%
  const handleTypeTwoLpChange = (value: string) => {
    const lpPercent = parseInt(value) || 0;
    const kolPercent = Math.max(0, 40 - lpPercent); // 总共40%分给LP和KOL
    setTypeTwo((prev) => ({
      ...prev,
      percents: ["45", value, "15", kolPercent.toString()],
    }));
  };

  const handleTypeTwoKolChange = (value: string) => {
    const kolPercent = parseInt(value) || 0;
    const lpPercent = Math.max(0, 40 - kolPercent); // 总共40%分给LP和KOL
    setTypeTwo((prev) => ({
      ...prev,
      percents: ["45", lpPercent.toString(), "15", value],
    }));
  };

  // 提交创建项目
  const handleSubmit = async () => {
    if (!address) return;

    // 检查认证状态
    if (accountInfoStatus !== 1) {
      toast.error("請先完成KOL認證");
      return;
    }

    // 检查质押金额
    const req = MODE_REQUIREMENTS[activeMode];
    if (
      activeAmount < req.min ||
      (req.max !== Infinity && activeAmount > req.max)
    ) {
      const tip =
        activeMode === "single"
          ? `${kolTypes[activeMode]}需要質押至少 ${req.min} SOS`
          : `${kolTypes[activeMode]}需要質押 ${req.min} - ${req.max} SOS`;
      toast.error(tip);
      return;
    }

    // 检查图片
    if (!logoPreview) {
      toast.error("請上傳項目Logo");
      return;
    }

    let projectInfo: Record<string, unknown>;

    if (activeMode === "joint") {
      if (!typeOne.brc20_name || !typeOne.symbol) {
        toast.error("請填寫完整項目信息");
        return;
      }
      projectInfo = {
        brc20_name: typeOne.brc20_name,
        brc20_supply: "1000000000",
        symbol: typeOne.symbol,
        total_supply: "1000000000",
        details: typeOne.details,
        percents: typeOne.percents.map((p) => parseInt(p) * 100),
        project_type: 0,
        logo_url: logoPreview,
        ...selectedToken,
      };
    } else if (activeMode === "single") {
      if (!typeTwo.brc20_name || !typeTwo.symbol) {
        toast.error("請填寫完整項目信息");
        return;
      }
      if (!typeTwo.percents[1] || !typeTwo.percents[3]) {
        toast.error("請填寫LP添加和KOL獎勵比例");
        return;
      }
      projectInfo = {
        brc20_name: typeTwo.brc20_name,
        brc20_supply: "1000000000",
        symbol: typeTwo.symbol,
        total_supply: "1000000000",
        details: typeTwo.details,
        percents: typeTwo.percents.map((p) => parseInt(p) * 100),
        project_type: 1,
        logo_url: logoPreview,
        ...selectedToken,
      };
    } else {
      // 铭文做市商模式
      if (
        !typeThree.brc20_name ||
        !typeThree.brc20_supply ||
        !typeThree.brc20_id
      ) {
        toast.error("請填寫完整項目信息");
        return;
      }
      if (typeThree.percents.some((p) => !p)) {
        toast.error("請填寫所有比例");
        return;
      }
      projectInfo = {
        brc20_name: typeThree.brc20_name,
        brc20_supply: typeThree.brc20_supply,
        symbol: typeThree.brc20_name,
        total_supply: typeThree.brc20_supply,
        details: typeThree.details,
        percents: typeThree.percents.map((p) => parseInt(p) * 100),
        project_type: 2,
        logo_url: logoPreview,
        brc20_id: typeThree.brc20_id,
      };
    }

    setLoading(true);
    try {
      const res = await kolApi.createProject({
        address,
        project_name: projectInfo.brc20_name as string,
        symbol: projectInfo.symbol as string,
        total_supply: projectInfo.total_supply as string,
        description: projectInfo.details as string,
        logo_url: projectInfo.logo_url as string,
        twitter_account: "",
        percents: projectInfo.percents as number[],
        project_info: JSON.stringify(projectInfo),
      });

      if (res.message === "success") {
        toast.success("創建成功");
        onSuccess();
      } else {
        toast.error(res.message || "創建失敗");
      }
    } catch (error) {
      toast.error("創建失敗");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 代币选择器组件
  const TokenSelector = () => (
    <div className="relative my-4">
      <button
        onClick={() => setShowTokenList(!showTokenList)}
        className="w-full flex items-center justify-between bg-background-card border border-border rounded-xl px-4 py-3 hover:border-border-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-foreground">
            {selectedToken?.mint_base_token || "BNB"}
          </span>
          <span className="text-xs text-text-secondary">
            1 {selectedToken?.mint_base_token || "BNB"} ={" "}
            <span className="text-primary">
              {selectedToken?.exchange_rate || "9000000"}
            </span>{" "}
            代幣
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-primary transition-transform ${
            showTokenList ? "rotate-180" : ""
          }`}
        />
      </button>

      {showTokenList && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background-card border border-border rounded-xl shadow-2xl z-10 max-h-48 overflow-y-auto">
          {tokenList.map((token, index) => (
            <button
              key={index}
              onClick={() => handleSelectToken(token)}
              className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                selectedToken?.mint_base_token === token.mint_base_token
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-background-card-hover"
              }`}
            >
              {token.mint_base_token} - 1 {token.mint_base_token} ={" "}
              {token.exchange_rate} 代幣
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Tab 切换 */}
      <div className="tab-container mb-6">
        <button
          onClick={() => setActiveTab("create")}
          className={
            activeTab === "create" ? "tab-item-active" : "tab-item-inactive"
          }
        >
          {home?.createProject as string}
        </button>
        <button
          onClick={() => setActiveTab("claim")}
          className={
            activeTab === "claim" ? "tab-item-active" : "tab-item-inactive"
          }
        >
          {home?.claimProject as string}
        </button>
      </div>

      {activeTab === "create" ? (
        <>
          {/* 图片上传区域 */}
          <div className="flex justify-center mb-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-50 h-37.5 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-background-card"
            >
              {logoPreview ? (
                <div className="relative w-full h-full">
                  <Image
                    src={logoPreview}
                    alt="Logo"
                    fill
                    sizes="200px"
                    className="w-full h-full object-contain rounded-xl p-2"
                    unoptimized={!!logoPreview}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLogoFile(null);
                      setLogoPreview("");
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 mb-3 flex items-center justify-center rounded-xl bg-background-card-hover">
                    <Upload className="w-6 h-6 text-text-muted" />
                  </div>
                  <p className="text-xs text-text-secondary">
                    PNG-JPEG-WEBP-GIF
                  </p>
                  <p className="text-xs text-text-muted">Max Size: 5MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* 模式选择 */}
          <div className="h-11 bg-background-card border border-border flex items-center rounded-xl p-1 text-xs mb-6">
            {(["joint", "single", "marketMaking"] as KolMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                disabled={!canSelectMode(mode)}
                className={`flex-1 h-full flex items-center justify-center cursor-pointer rounded-lg transition-all ${
                  activeMode === mode
                    ? "bg-linear-to-r from-primary to-primary-hover text-black font-semibold"
                    : canSelectMode(mode)
                    ? "text-text-secondary hover:text-foreground"
                    : "text-text-muted cursor-not-allowed opacity-40"
                }`}
              >
                {kolTypes[mode]}
              </button>
            ))}
          </div>

          {/* ========== 联合KOL模式表单 ========== */}
          {activeMode === "joint" && (
            <div className="text-left">
              {/* 代币名称和股票代码 */}
              <div className="flex items-center justify-between gap-3">
                <div className="w-1/2">
                  <div className="text-text-secondary font-medium text-xs mb-2">
                    {createProject.tokenFullName as string}
                  </div>
                  <input
                    type="text"
                    value={typeOne.brc20_name}
                    onChange={(e) =>
                      setTypeOne({ ...typeOne, brc20_name: e.target.value })
                    }
                    placeholder={createProject.custom as string}
                    className="input text-sm"
                  />
                </div>
                <div className="w-1/2">
                  <div className="text-text-secondary font-medium text-xs mb-2">
                    {createProject.tickerSymbol as string}
                  </div>
                  <input
                    type="text"
                    value={typeOne.symbol}
                    onChange={(e) =>
                      setTypeOne({ ...typeOne, symbol: e.target.value })
                    }
                    placeholder={createProject.custom as string}
                    className="input text-sm"
                  />
                </div>
              </div>

              {/* 分配比例（固定） */}
              <div className="mt-5">
                <div className="text-text-secondary font-medium text-xs mb-3">
                  {createProject.tokenSupplyNote as string}
                </div>
                <div className="space-y-2">
                  <PercentBox
                    label={createProject.fairLaunchContract as string}
                    value={typeOne.percents[0]}
                  />
                  <PercentBox
                    label={createProject.lpAddContract as string}
                    value={typeOne.percents[1]}
                  />
                  <PercentBox
                    label={createProject.launchPoolContract as string}
                    value={typeOne.percents[2]}
                  />
                  <PercentBox
                    label={createProject.kolUnlockContract as string}
                    value={typeOne.percents[3]}
                  />
                </div>
              </div>

              <TokenSelector />

              <div className="text-xs text-red-500 mt-4 leading-5">
                {createProject.fairLaunchTip as string}
              </div>

              {/* 代币描述 */}
              <div className="mt-5">
                <div className="text-text-secondary font-medium text-xs mb-2">
                  {createProject.tokenDescription as string}
                </div>
                <input
                  type="text"
                  value={typeOne.details}
                  onChange={(e) =>
                    setTypeOne({ ...typeOne, details: e.target.value })
                  }
                  placeholder={createProject.descriptionPlaceholder as string}
                  className="input text-sm"
                />
              </div>
            </div>
          )}

          {/* ========== 单一KOL模式表单 ========== */}
          {activeMode === "single" && (
            <div className="text-left">
              {/* 代币名称和股票代码 */}
              <div className="flex items-center justify-between gap-3">
                <div className="w-1/2">
                  <div className="text-text-secondary font-medium text-xs mb-2">
                    {createProject.tokenFullName as string}
                  </div>
                  <input
                    type="text"
                    value={typeTwo.brc20_name}
                    onChange={(e) =>
                      setTypeTwo({ ...typeTwo, brc20_name: e.target.value })
                    }
                    placeholder={createProject.custom as string}
                    className="input text-sm"
                  />
                </div>
                <div className="w-1/2">
                  <div className="text-text-secondary font-medium text-xs mb-2">
                    {createProject.tickerSymbol as string}
                  </div>
                  <input
                    type="text"
                    value={typeTwo.symbol}
                    onChange={(e) =>
                      setTypeTwo({ ...typeTwo, symbol: e.target.value })
                    }
                    placeholder={createProject.custom as string}
                    className="input text-sm"
                  />
                </div>
              </div>

              {/* 分配比例（部分可编辑） */}
              <div className="mt-5">
                <div className="text-text-secondary font-medium text-xs mb-3">
                  {createProject.tokenSupplyNote as string}
                </div>
                <div className="space-y-2">
                  <PercentBox
                    label={createProject.fairLaunchContract as string}
                    value={typeTwo.percents[0]}
                  />
                  <PercentBox
                    label={createProject.lpAddContract as string}
                    value={typeTwo.percents[1]}
                    editable
                    onChange={handleTypeTwoLpChange}
                  />
                  <PercentBox
                    label={createProject.launchPoolContract as string}
                    value={typeTwo.percents[2]}
                  />
                  <PercentBox
                    label={
                      (newData.kolRewardsContract as string) || "KOL奖励合约"
                    }
                    value={typeTwo.percents[3]}
                    editable
                    onChange={handleTypeTwoKolChange}
                    tooltip={newData.kolRewardsContractTooltip as string}
                  />
                </div>
              </div>

              <TokenSelector />

              <div className="text-xs text-red-500 mt-4 leading-5">
                {createProject.fairLaunchTip as string}
              </div>

              {/* 代币描述 */}
              <div className="mt-5">
                <div className="text-text-secondary font-medium text-xs mb-2">
                  {createProject.tokenDescription as string}
                </div>
                <input
                  type="text"
                  value={typeTwo.details}
                  onChange={(e) =>
                    setTypeTwo({ ...typeTwo, details: e.target.value })
                  }
                  placeholder={createProject.descriptionPlaceholder as string}
                  className="input text-sm"
                />
              </div>
            </div>
          )}

          {/* ========== 铭文做市商模式表单 ========== */}
          {activeMode === "marketMaking" && (
            <div className="text-left">
              {/* 代币和总量 */}
              <div className="flex items-center justify-between gap-3">
                <div className="w-1/2">
                  <div className="text-text-secondary font-medium text-xs mb-2">
                    {newData.token || "代幣"}
                  </div>
                  <input
                    type="text"
                    value={typeThree.brc20_name}
                    onChange={(e) =>
                      setTypeThree({ ...typeThree, brc20_name: e.target.value })
                    }
                    placeholder={newData.sameNameAsInscription || "與銘文同名"}
                    className="input text-sm"
                  />
                </div>
                <div className="w-1/2">
                  <div className="text-text-secondary font-medium text-xs mb-2">
                    {newData.totalSupply || "總量"}
                  </div>
                  <input
                    type="text"
                    value={typeThree.brc20_supply}
                    onChange={(e) =>
                      setTypeThree({
                        ...typeThree,
                        brc20_supply: e.target.value,
                      })
                    }
                    placeholder={
                      newData.equalAmountToInscription || "與銘文等量"
                    }
                    className="input text-sm"
                  />
                </div>
              </div>

              {/* 部署铭文ID */}
              <div className="mt-5">
                <div className="text-text-secondary font-medium text-xs mb-2">
                  {newData.deployInscriptionId || "部署銘文ID"}
                </div>
                <input
                  type="text"
                  value={typeThree.brc20_id}
                  onChange={(e) =>
                    setTypeThree({ ...typeThree, brc20_id: e.target.value })
                  }
                  className="input text-sm"
                />
              </div>

              {/* 分配比例（全部可编辑） */}
              <div className="mt-5">
                <div className="text-text-secondary font-medium text-xs mb-3">
                  {newData.tokenRatio || "代幣比例"}
                </div>
                <div className="space-y-2">
                  <PercentBox
                    label={newData.inscriptionCrossChain || "銘文跨鏈"}
                    value={typeThree.percents[0]}
                    editable
                    onChange={(v) =>
                      setTypeThree({
                        ...typeThree,
                        percents: [
                          v,
                          typeThree.percents[1],
                          typeThree.percents[2],
                          typeThree.percents[3],
                        ],
                      })
                    }
                  />
                  <PercentBox
                    label={newData.lpAddition || "LP添加"}
                    value={typeThree.percents[1]}
                    editable
                    onChange={(v) =>
                      setTypeThree({
                        ...typeThree,
                        percents: [
                          typeThree.percents[0],
                          v,
                          typeThree.percents[2],
                          typeThree.percents[3],
                        ],
                      })
                    }
                  />
                  <PercentBox
                    label={newData.launchPool || "啟動池"}
                    value={typeThree.percents[2]}
                    editable
                    onChange={(v) =>
                      setTypeThree({
                        ...typeThree,
                        percents: [
                          typeThree.percents[0],
                          typeThree.percents[1],
                          v,
                          typeThree.percents[3],
                        ],
                      })
                    }
                  />
                  <PercentBox
                    label={newData.kolRewards || "KOL獎勵"}
                    value={typeThree.percents[3]}
                    editable
                    onChange={(v) =>
                      setTypeThree({
                        ...typeThree,
                        percents: [
                          typeThree.percents[0],
                          typeThree.percents[1],
                          typeThree.percents[2],
                          v,
                        ],
                      })
                    }
                  />
                </div>
              </div>

              {/* 提示 */}
              <div className="text-red-500 text-xs mt-5 pb-1 leading-5">
                {newData.launchPoolNote ||
                  "啟動池份額由創建人自定義，創建代幣時自動轉入其錢包，應全部用於創建 LP（Pancake V2，基礎代幣可選 USDT、BNB、BTCB 或 SOS），LP 應全部兌換為代幣（全額歸屬創建人）。"}
              </div>

              {/* 代币描述 */}
              <div className="mt-5">
                <div className="text-text-secondary font-medium text-xs mb-2">
                  {newData.tokenDescription || "代幣描述"}
                </div>
                <input
                  type="text"
                  value={typeThree.details}
                  onChange={(e) =>
                    setTypeThree({ ...typeThree, details: e.target.value })
                  }
                  placeholder={newData.description || "描述"}
                  className="input text-sm"
                />
              </div>
            </div>
          )}

          {/* 提交按钮 */}
          <div className="w-full text-center my-6">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading
                ? (common?.loading as string) || "加載中..."
                : (home?.createProject as string) || "創建項目"}
            </button>
          </div>

          {/* 底部提示 */}
          <p className="text-xs text-red-500 text-left leading-5">
            {(createProject?.twitterTip as string) ||
              "創建項目時請同步關注官方推特@kolpump_fun，並轉發官推置頂推文，這關乎您的KOL指數和代幣分配。"}
          </p>
        </>
      ) : (
        /* 认领项目 Tab */
        <div>
          {/* 已认领项目展示 */}
          {hasClaimedProject ? (
            <div className="bg-background-card border border-border rounded-xl p-5 my-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-1">
                  <Image
                    src={getTokenIcon("100t").src}
                    alt="project"
                    className="w-7 h-7 rounded-full"
                    width={28}
                    height={28}
                  />
                  <span className="font-semibold text-foreground text-sm">
                    {kolInfo?.project_name?.split("100T-")[1] ||
                      kolInfo?.project_name}
                  </span>
                </div>
                <span className="badge-success inline-block w-fit">
                  {getStatusText(kolInfo?.status || 0)}
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* 顶部：市值排序 + 搜索框 */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <button
                  onClick={() => handleSort()}
                  className="flex items-center gap-2 bg-background-card border border-border px-4 py-2.5 rounded-xl hover:bg-background-card-hover transition-colors"
                >
                  <span className="text-foreground text-sm">
                    {newData.marketCap || "市值"}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div
                      className={cn(
                        "w-0 h-0 border-l border-l-transparent border-r border-r-transparent border-b",
                        sortOrder === "asc"
                          ? "border-b-primary"
                          : "border-b-text-muted"
                      )}
                    />
                    <div
                      className={cn(
                        "w-0 h-0 border-l border-l-transparent border-r border-r-transparent border-t",
                        sortOrder === "desc"
                          ? "border-t-primary"
                          : "border-t-text-muted"
                      )}
                    />
                  </div>
                </button>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={newData.search || "搜索"}
                  className="input flex-1 max-w-45 text-sm"
                />
              </div>

              {/* 项目列表 */}
              {filteredList.length > 0 ? (
                <div className="max-h-125 overflow-y-auto space-y-3">
                  {filteredList.map((project, index) => {
                    const marketCap =
                      project.total_supply && project.lastPrice
                        ? (
                            Number(project.total_supply) *
                            Number(project.lastPrice)
                          ).toFixed(0)
                        : "0";
                    const projectTypes =
                      (shareProject?.projectTypes as Record<string, string>) ||
                      {};
                    const projectTypeName =
                      project.project_type === 2
                        ? projectTypes.marketMaking || "銘文做市"
                        : project.project_type === 0
                        ? projectTypes.joint || "聯合模式"
                        : projectTypes.single || "單獨模式";

                    return (
                      <div
                        key={index}
                        className="bg-background-card border border-border rounded-xl p-4 text-left hover:border-border-hover transition-colors"
                      >
                        {/* 头部：Logo、Symbol、价格 */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Image
                              src={
                                project?.logo_url || getTokenIcon("100t").src
                              }
                              alt={project?.symbol || "token"}
                              width={36}
                              height={36}
                              className="rounded-full"
                              unoptimized={!!project?.logo_url}
                            />

                            <div>
                              <div className="text-sm font-semibold text-foreground">
                                {project.symbol}
                              </div>
                              <div className="text-text-secondary text-xs mt-0.5">
                                {newData.marketCap || "市值"}:{" "}
                                <span className="text-foreground">
                                  ${marketCap}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-primary font-semibold">
                            ${Number(project.lastPrice || 0).toFixed(6)}
                          </div>
                        </div>

                        {/* 标签：X、Telegram、项目类型 */}
                        <div className="flex items-center gap-2 mt-3 text-xs flex-wrap">
                          <a
                            href={project.twitter_account || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-background-card-hover border border-border p-1.5 px-2.5 rounded-lg flex items-center gap-1.5 hover:border-border-hover transition-colors text-text-secondary hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
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
                            href={project.tg_account || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-background-card-hover border border-border p-1.5 px-2.5 rounded-lg flex items-center gap-1.5 hover:border-border-hover transition-colors text-text-secondary hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Send className="w-3 h-3" />
                            <span>Telegram</span>
                          </a>
                          <div className="bg-primary/10 border border-primary/30 text-primary p-1.5 px-2.5 rounded-lg">
                            {projectTypeName}
                          </div>
                          {!project.details && (
                            <button
                              onClick={() => handleClickProject(project)}
                              className="ml-auto btn-primary h-auto py-2 px-4 text-xs"
                            >
                              {newData.approve || "認領綁定"}
                            </button>
                          )}
                        </div>

                        {/* 描述和认领按钮 */}
                        {project.details && (
                          <div className="flex items-center justify-between gap-4 mt-3">
                            <div className="text-text-secondary text-xs text-left flex-1">
                              {project.details}
                            </div>
                            <button
                              onClick={() => handleClickProject(project)}
                              className="btn-primary h-auto py-2 px-4 text-xs shrink-0"
                            >
                              {newData.approve || "認領綁定"}
                            </button>
                          </div>
                        )}

                        {/* 公平发射信息 */}
                        {project.exchange_rate ? (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="text-sm mb-2">
                              <span className="text-secondary">
                                {(shareProject?.fairLaunch as string) ||
                                  "公平發射"}
                              </span>
                              <span className="text-primary ml-2">
                                1{project.display_name?.split("-")[0] || "BNB"}{" "}
                                = {project.exchange_rate || 0}
                                {project.symbol}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentProject(project);
                                  router.push("/pool-detail");
                                }}
                                className="btn-outline h-auto py-2 px-4 text-xs"
                              >
                                {(shareProject?.buyNow as string) || "搶購"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentProject(project);
                                  router.push("/early-bird-detail");
                                }}
                                className="btn-outline h-auto py-2 px-4 text-xs"
                              >
                                {(shareProject?.earlyBird as string) || "早鳥"}
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {/* 无公平发射但有mint_pool_id时也显示入口 */}
                        {!project.exchange_rate && project.mint_pool_id ? (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentProject(project);
                                  router.push("/pool-detail");
                                }}
                                className="btn-outline h-auto py-2 px-4 text-xs"
                              >
                                {(shareProject?.buyNow as string) || "搶購"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentProject(project);
                                  router.push("/early-bird-detail");
                                }}
                                className="btn-outline h-auto py-2 px-4 text-xs"
                              >
                                {(shareProject?.earlyBird as string) || "早鳥"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-background-card-hover flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📭</span>
                  </div>
                  <p className="text-text-muted text-sm">
                    {newData.noData || "暫無數據"}
                  </p>
                </div>
              )}
            </>
          )}

          {/* 认领规则弹窗 */}
          {showClaimModal && selectedProject && (
            <div
              className={`fixed inset-0 z-100 flex items-end justify-center bg-black/60 ${
                theme === "dark" ? "backdrop-blur-sm" : ""
              }`}
              onClick={() => setShowClaimModal(false)}
            >
              <div
                className="bg-background-card border-t border-border w-full max-w-md max-h-[90vh] rounded-t-3xl p-5 pb-8 animate-slide-up overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 拖动条 */}
                <div className="w-12 h-1 bg-text-muted rounded-full mx-auto mb-6 shrink-0" />

                {/* 标题 */}
                <h3 className="text-center font-semibold text-sm text-secondary mb-6 shrink-0">
                  {(kol?.claimRule as string) || "認領規則"}
                </h3>

                {/* 规则内容 */}
                <div className="text-left text-sm leading-6 mb-5 flex-1 overflow-y-auto text-text-secondary">
                  {contentDesc.map((desc, i) => (
                    <p key={i} className="mb-3">
                      {desc}
                    </p>
                  ))}

                  {/* 推文文案 */}
                  <div className="mt-5 p-4 bg-background border border-border rounded-xl">
                    <div
                      className="flex items-start gap-2 cursor-pointer"
                      onClick={handleCopyTweet}
                    >
                      <span className="text-primary font-bold">*</span>
                      <span className="text-secondary font-medium flex-1 break-all text-sm">
                        {getTweetText()}
                      </span>
                      {copied ? (
                        <Check className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <Copy className="w-4 h-4 text-text-muted shrink-0 hover:text-primary" />
                      )}
                    </div>
                    <p className="text-text-muted mt-3 text-xs">
                      {(kol?.tweetTips as string) ||
                        "复制以上文案发布推特并@smartbtcdao"}
                    </p>
                  </div>
                </div>

                {/* 确认勾选 */}
                <label className="flex items-start gap-3 text-left mb-5 cursor-pointer shrink-0 group">
                  <input
                    type="checkbox"
                    checked={claimChecked}
                    onChange={(e) => setClaimChecked(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-border bg-background checked:bg-primary checked:border-primary"
                  />
                  <span className="text-sm text-text-secondary group-hover:text-text-secondary transition-colors">
                    {(kol?.sure as string) ||
                      "我已閱讀並認可認領規則，同意認領此項目。"}
                  </span>
                </label>

                {/* 认领按钮 */}
                <button
                  onClick={handleClaim}
                  disabled={!claimChecked || claimLoading}
                  className="btn-primary w-full shrink-0"
                >
                  {claimLoading
                    ? (common?.loading as string) || "加載中..."
                    : (kol?.claim as string) || "認領"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
