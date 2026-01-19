'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { Toaster } from 'sonner';
import { config } from '@/lib/wagmi';

import '@rainbow-me/rainbowkit/styles.css';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 分钟
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#FFC519',
            accentColorForeground: '#000',
            borderRadius: 'medium',
          })}
          locale="zh-CN"
        >
          {children}
          <Toaster 
            position="top-center" 
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1A1A1E',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                padding: '14px 18px',
                fontSize: '14px',
                color: '#fff',
              },
              classNames: {
                toast: 'font-medium',
                success: '!bg-[#1A1A1E] !border-[#10B981]/30 !text-[#10B981]',
                error: '!bg-[#1A1A1E] !border-[#EF4444]/30 !text-[#EF4444]',
                warning: '!bg-[#1A1A1E] !border-[#F59E0B]/30 !text-[#F59E0B]',
                info: '!bg-[#1A1A1E] !border-[#3B82F6]/30 !text-[#3B82F6]',
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

