"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { logo } from "@/assets/images";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showLogo?: boolean;
  rightContent?: React.ReactNode;
}

/**
 * 简单的页面标题 Header
 * - 可显示居中标题或 Logo
 * - 可选返回按钮
 * - 可自定义右侧内容
 */
export function Header({
  title,
  showBack = false,
  showLogo = false,
  rightContent,
}: HeaderProps) {
  const router = useRouter();

  const goBack = () => {
    router.back();
  };

  return (
    <header className="h-12.5 flex items-center justify-center bg-white px-5 font-medium text-base relative">
      {showBack && (
        <button onClick={goBack} className="absolute left-4 p-1">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {showLogo ? (
        <Image
          src={logo}
          alt="SmartBTC"
          width={120}
          height={30}
          className="h-8 w-auto"
        />
      ) : (
        <span>{title}</span>
      )}

      {rightContent && <div className="absolute right-4">{rightContent}</div>}
    </header>
  );
}
