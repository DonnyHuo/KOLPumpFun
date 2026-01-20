'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';
import zhCN from '@/i18n/zh-CN';
import enUS from '@/i18n/en-US';
import {
  dao, daoAct,
  share, shareAct,
  lp, lpAct,
  swap, swapAct,
} from '@/assets/images';

export function Footer() {
  const pathname = usePathname();
  const { lang, theme } = useStore();
  const t = lang === 'zh' ? zhCN : enUS;
  const footer = t.footer as Record<string, string>;

  const navList = [
    {
      name: 'home',
      route: '/',
      text: footer.mine,
      icon: dao,
      iconAct: daoAct,
    },
    {
      name: 'share',
      route: '/share',
      text: footer.community,
      icon: share,
      iconAct: shareAct,
    },
    {
      name: 'lpSwap',
      route: '/lp-swap',
      text: footer.swap,
      icon: lp,
      iconAct: lpAct,
    },
    {
      name: 'btcSwap',
      route: '/btc-swap',
      text: footer.bridge,
      icon: swap,
      iconAct: swapAct,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-[500px] mx-auto bg-[var(--background)]/95 backdrop-blur-xl border-t border-[var(--border-color)] pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="flex items-center justify-around">
        {navList.map((item) => {
          const isActive = pathname === item.route;
          return (
            <Link
              key={item.name}
              href={item.route}
              className={`flex flex-col items-center text-xs no-underline transition-all duration-200 ${
                isActive 
                  ? 'text-[var(--primary)]' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <div className={`p-2 rounded-xl transition-all ${
                isActive ? 'bg-[var(--primary)]/10' : ''
              }`}>
                <Image
                  src={item.iconAct}
                  alt={item.name}
                  width={22}
                  height={22}
                  className={`w-[22px] h-[22px] transition-all ${
                    !isActive ? `grayscale ${theme === 'light' ? 'opacity-85' : 'opacity-65'}` : ''
                  }`}
                />
              </div>
              <div className={`pt-1 text-[11px] font-medium ${isActive ? 'text-[var(--primary)]' : ''}`}>
                {item.text}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
