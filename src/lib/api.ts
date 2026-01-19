const BASE_URL = 'https://smartbtc.io/bridge';

// 通用请求方法
async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  
  // 500 状态码不抛出错误，直接返回响应
  if (!response.ok && response.status !== 500) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

// KOL 相关 API
export const kolApi = {
  // 查询 KOL 信息
  queryKol: (address: string) =>
    request<{ data: KolInfo }>('/kol/query_kol', {
      method: 'POST',
      body: JSON.stringify({ address }),
    }),

  // 提交认证
  certify: (data: CertifyParams) =>
    request<{ message: string }>('/kol/certify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 获取投票中的项目
  getVotingList: () =>
    request<{ data: VotingProject[] }>('/kol/project_voting_list'),

  // 获取已发行项目
  getProjectIssuedList: () =>
    request<{ data: ProjectInfo[] }>('/kol/project_issued_list'),

  // 获取待审核项目列表
  getProjectWaitAgreeList: () =>
    request<{ data: ProjectWaitInfo[] }>('/kol/project_wait_aggree_list'),

  // 投票
  vote: (address: string, projectName: string) =>
    request<{ message: string }>('/kol/vote', {
      method: 'POST',
      body: JSON.stringify({ address, project_name: projectName }),
    }),

  // 检查是否已投票
  isVoted: (kolAddress: string, projectName: string) =>
    request<{ data: boolean }>('/kol/is_voted', {
      method: 'POST',
      body: JSON.stringify({ kol_address: kolAddress, project_name: projectName }),
    }),

  // 获取最低门槛
  getMinThreshold: () =>
    request<{ data: { RepMinThreshold: number; vote_pass_nums: number } }>('/kol/min_threshold'),

  // 获取待审核 KOL 列表
  getKolWaitAgreeList: () =>
    request<{ data: KolWaitInfo[] }>('/kol/kol_wait_aggree_list'),

  // 获取待审核绑定项目列表
  getBindProjectWaitList: () =>
    request<{ data: BindProjectWaitInfo[] }>('/kol/bind_project_wait_aggre_list'),

  // 获取项目私募列表
  getProjectPrivateFundList: (token: string, address?: string) =>
    request<{ data: PrivateFundOrder[] }>('/kol/project_private_fund_list', {
      method: 'POST',
      body: JSON.stringify({ token, ...(address && { address }) }),
    }),

  // 私募购买
  projectPrivateFund: (data: PrivateFundParams) =>
    request<{ message: string }>('/kol/project_private_fund', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 获取代币列表
  getSelectTokenList: () =>
    request<{ data: SelectToken[] }>('/kol/mint_token_list'),

  // 创建新项目
  createProject: (data: CreateProjectParams) =>
    request<{ message: string }>('/kol/new_project', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 认领项目
  bindProject: (data: BindProjectParams) =>
    request<{ message: string }>('/kol/bind_project', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 获取 Meme 订单列表
  getMemeOrders: (address: string) =>
    request<{ data: MemeOrder[] }>('/kol/meme_orders', {
      method: 'POST',
      body: JSON.stringify({ address }),
    }),

  // 创建 Meme 交易记录
  memeTrade: (data: MemeTradeParams) =>
    request<{ message: string }>('/kol/meme_trade', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// 管理员 API
export const adminApi = {
  // 审核 KOL
  agreeKol: (adminAddress: string, kolAddress: string, agree: boolean) =>
    request<{ message?: string }>('/kol_admin/aggree', {
      method: 'POST',
      body: JSON.stringify({
        admin_address: adminAddress,
        kol_address: kolAddress,
        aggree: agree,
      }),
    }),

  // 审核项目
  agreeProject: (adminAddress: string, projectName: string, agree: boolean) =>
    request<{ message?: string }>('/kol_admin/project_aggree', {
      method: 'POST',
      body: JSON.stringify({
        admin_address: adminAddress,
        project_name: projectName,
        aggree: agree,
      }),
    }),

  // 审核绑定项目
  agreeBindProject: (
    adminAddress: string,
    kolAddress: string,
    projectName: string,
    agree: boolean,
    percent: number
  ) =>
    request<{ message?: string }>('/kol_admin/bind_project_aggree', {
      method: 'POST',
      body: JSON.stringify({
        admin_address: adminAddress,
        kol_address: kolAddress,
        project_name: projectName,
        aggree: agree,
        percent,
      }),
    }),

  // 迁移 Token
  migrateToken: (data: MigrateTokenParams) =>
    request<{ message: string }>('/kol_admin/migrate_token', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// 类型定义
export interface KolInfo {
  address: string;
  status: number;
  twitter_account: string;
  tg_account: string;
  discord_account: string;
  project_name?: string;
  created_at: string;
}

export interface CertifyParams {
  address: string;
  twitter_account: string;
  tg_account?: string;
  discord_account?: string;
}

export interface VotingProject {
  project_name: string;
  symbol: string;
  vote_num: number;
  voted?: boolean;
}

export interface ProjectInfo {
  project_name: string;
  name: string;
  symbol: string;
  contract_addr: string;
  total_supply: string;
  cross_percent: number;
  le_percent: number;
  lm_percent: number;
  kol_percent: number;
  logo_url?: string;
  lastPrice?: number;
  twitter_account?: string;
  tg_account?: string;
  project_type?: number;
  details?: string;
  display_name?: string;
  exchange_rate?: number;
  // 池子相关字段
  mint_pool_id?: number;
  mint_pool_create_time?: string;
  mint_process_percent?: string; // 格式: "总量,百分比"
  airdrop_process_percent?: string; // 格式: "总量,百分比"
  coin_mint_token?: string;
}

export interface ProjectWaitInfo {
  project_name: string;
  name: string;
  symbol: string;
  total_supply: string;
  cross_percent: number;
  le_percent: number;
  lm_percent: number;
  kol_percent: number;
  created_at: string;
}

export interface KolWaitInfo {
  address: string;
  status: number;
  twitter_account: string;
  tg_account: string;
  discord_account: string;
  created_at: string;
}

export interface BindProjectWaitInfo {
  address: string;
  project_name: string;
  twitter_account: string;
  tg_account?: string;
  discord_account?: string;
  created_at: string;
}

export interface PrivateFundOrder {
  order_id: string;
  address: string;
  token: string;
  a_amount: string;
  spend_txid: string;
  updated_at: string;
}

export interface PrivateFundParams {
  address: string;
  token: string;
  spent_amount: string;
  spend_txid: string;
}

export interface SelectToken {
  mint_base_token: string;
  mint_base_token_addr: string;
  exchange_rate: number;
}

export interface CreateProjectParams {
  address: string;
  project_name: string;
  symbol: string;
  total_supply: string;
  description: string;
  logo_url: string;
  twitter_account?: string;
  percents: number[];
  project_info: string;
}

export interface BindProjectParams {
  address: string;
  project_name: string;
  twitter_account: string;
}

export interface MigrateTokenParams {
  admin_address: string;
  project_name: string;
  contract_addr: string;
  token_name: string;
  token_symbol: string;
  total_supply: string;
  percents: number[];
}

export interface MemeOrder {
  order_id: string;
  address: string;
  a_amount: string;
  b_amount: string;
  spend_txid: string;
  order_type: number;
  order_state: number;
  created_at: string;
}

export interface MemeTradeParams {
  pool_id: number;
  address: string;
  a_amount: string;
  b_amount: string;
  spend_txid: string;
  order_type: number;
}

