import { http, createConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  okxWallet,
  binanceWallet,
  walletConnectWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';

const projectId = '47880ce5545390f0d42c6c86de184feb';

const connectors = connectorsForWallets(
  [
    {
      groupName: '推薦錢包',
      wallets: [
        injectedWallet,
        binanceWallet,
        metaMaskWallet,
        okxWallet,
      ],
    },
    {
      groupName: '其他錢包',
      wallets: [
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: 'KOLPumpFun',
    projectId,
  }
);

export const config = createConfig({
  connectors,
  chains: [bsc],
  transports: {
    [bsc.id]: http('https://bsc-dataseed.binance.org/'),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}

