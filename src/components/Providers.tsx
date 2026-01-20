"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
  type Locale,
} from "@rainbow-me/rainbowkit";
import { Toaster } from "sonner";
import { config } from "@/lib/wagmi";
import { useStore } from "@/store/useStore";

import "@rainbow-me/rainbowkit/styles.css";

interface ProvidersProps {
  children: ReactNode;
}

// RainbowKit 语言映射
const localeMap: Record<"zh" | "en", Locale> = {
  zh: "zh-CN",
  en: "en-US",
};

// 内部组件用于读取 store 中的语言和主题设置
function RainbowKitWrapper({ children }: { children: ReactNode }) {
  const lang = useStore((state) => state.lang);
  const theme = useStore((state) => state.theme);
  const rainbowKitLocale = localeMap[lang] || "zh-CN";

  return (
    <RainbowKitProvider
      theme={
        theme === "dark"
          ? darkTheme({
              accentColor: "#FFC519",
              accentColorForeground: "#000",
              borderRadius: "medium",
            })
          : lightTheme({
              accentColor: "#FFC519",
              accentColorForeground: "#000",
              borderRadius: "medium",
            })
      }
      locale={rainbowKitLocale}
    >
      {children}
      <Toaster
        position="top-center"
        duration={3000}
        mobileOffset={{
          top: "max(env(safe-area-inset-top), 16px)",
          right: "max(env(safe-area-inset-right), 16px)",
          bottom: "max(env(safe-area-inset-bottom), 16px)",
          left: "max(env(safe-area-inset-left), 16px)",
        }}
        toastOptions={{
          duration: 3000,
          style: {
            width: "fit-content",
            maxWidth:
              "calc(100vw - var(--mobile-offset-left) - var(--mobile-offset-right))",
            minWidth: "unset",
            left: "50%",
            translate: "-50% 0",
            marginLeft: "-16px",
            background: theme === "dark" ? "#1A1A1E" : "#FFFFFF",
            border:
              theme === "dark"
                ? "1px solid rgba(255, 255, 255, 0.1)"
                : "1px solid rgba(0, 0, 0, 0.1)",
            borderRadius: "16px",
            boxShadow:
              theme === "dark"
                ? "0 20px 60px rgba(0, 0, 0, 0.5)"
                : "0 20px 60px rgba(0, 0, 0, 0.1)",
            padding: "14px 18px",
            fontSize: "14px",
            color: theme === "dark" ? "#fff" : "#1A1A1E",
          },
          classNames: {
            toast: "font-medium",
            success:
              theme === "dark"
                ? "!bg-[#1A1A1E] !border-[#10B981]/30 !text-[#10B981]"
                : "!bg-[#FFFFFF] !border-[#10B981]/30 !text-[#10B981]",
            error:
              theme === "dark"
                ? "!bg-[#1A1A1E] !border-[#EF4444]/30 !text-[#EF4444]"
                : "!bg-[#FFFFFF] !border-[#EF4444]/30 !text-[#EF4444]",
            warning:
              theme === "dark"
                ? "!bg-[#1A1A1E] !border-[#F59E0B]/30 !text-[#F59E0B]"
                : "!bg-[#FFFFFF] !border-[#F59E0B]/30 !text-[#F59E0B]",
            info:
              theme === "dark"
                ? "!bg-[#1A1A1E] !border-[#3B82F6]/30 !text-[#3B82F6]"
                : "!bg-[#FFFFFF] !border-[#3B82F6]/30 !text-[#3B82F6]",
          },
        }}
      />
    </RainbowKitProvider>
  );
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 1000, // 10s
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitWrapper>{children}</RainbowKitWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
