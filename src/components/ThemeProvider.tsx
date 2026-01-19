'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  return <>{children}</>;
}

