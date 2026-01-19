/**
 * 主题工具函数
 * 用于在代码中动态获取主题相关的颜色值
 */

export const themeColors = {
  // 背景色
  background: 'var(--background)',
  backgroundSecondary: 'var(--background-secondary)',
  backgroundCard: 'var(--background-card)',
  backgroundCardHover: 'var(--background-card-hover)',
  
  // 文字颜色
  foreground: 'var(--foreground)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  
  // 主色
  primary: 'var(--primary)',
  primaryHover: 'var(--primary-hover)',
  
  // 边框
  borderColor: 'var(--border-color)',
  borderColorHover: 'var(--border-color-hover)',
  
  // 状态颜色
  success: 'var(--success)',
  error: 'var(--error)',
  warning: 'var(--warning)',
  info: 'var(--info)',
} as const;

/**
 * 获取主题相关的 Tailwind 类名
 * 这些类名会使用 CSS 变量，自动适配主题切换
 */
export const themeClasses = {
  bg: 'bg-[var(--background)]',
  bgSecondary: 'bg-[var(--background-secondary)]',
  bgCard: 'bg-[var(--background-card)]',
  bgCardHover: 'bg-[var(--background-card-hover)]',
  
  text: 'text-[var(--foreground)]',
  textSecondary: 'text-[var(--text-secondary)]',
  textMuted: 'text-[var(--text-muted)]',
  
  border: 'border-[var(--border-color)]',
  borderHover: 'border-[var(--border-color-hover)]',
  
  primary: 'text-[var(--primary)]',
  primaryBg: 'bg-[var(--primary)]',
} as const;

