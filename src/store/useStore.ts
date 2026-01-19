import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectInfo } from '@/lib/api';

interface AppState {
  // 语言
  lang: 'zh' | 'en';
  setLang: (lang: 'zh' | 'en') => void;
  
  // 主题
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  
  // KOL 状态
  activeAmount: number;
  setActiveAmount: (amount: number) => void;
  
  accountInfoStatus: number;
  setAccountInfoStatus: (status: number) => void;
  
  // 交易设置
  slippage: number;
  setSlippage: (slippage: number) => void;
  
  tradeTime: number;
  setTradeTime: (time: number) => void;
  
  // Token 选择
  selectedCoin: Record<string, unknown>;
  setSelectedCoin: (coin: Record<string, unknown>) => void;
  
  selectedList: unknown[];
  setSelectedList: (list: unknown[]) => void;
  
  // 当前选中的项目（用于详情页）
  currentProject: ProjectInfo | null;
  setCurrentProject: (project: ProjectInfo | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // 语言
      lang: 'en',
      setLang: (lang) => set({ lang }),
      
      // 主题
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      
      // KOL 状态
      activeAmount: 0,
      setActiveAmount: (amount) => set({ activeAmount: amount }),
      
      accountInfoStatus: 0,
      setAccountInfoStatus: (status) => set({ accountInfoStatus: status }),
      
      // 交易设置
      slippage: 3,
      setSlippage: (slippage) => set({ slippage }),
      
      tradeTime: 1,
      setTradeTime: (time) => set({ tradeTime: time }),
      
      // Token 选择
      selectedCoin: {},
      setSelectedCoin: (coin) => set({ selectedCoin: coin }),
      
      selectedList: [],
      setSelectedList: (list) => set({ selectedList: list }),
      
      // 当前选中的项目
      currentProject: null,
      setCurrentProject: (project) => set({ currentProject: project }),
    }),
    {
      name: 'smartbtc-storage',
      partialize: (state) => ({
        lang: state.lang,
        theme: state.theme,
        slippage: state.slippage,
        tradeTime: state.tradeTime,
      }),
    }
  )
);

