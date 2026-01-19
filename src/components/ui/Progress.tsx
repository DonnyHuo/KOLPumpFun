'use client';

import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
  showLabel?: boolean;
  label?: string;
  color?: 'default' | 'yellow';
}

export function Progress({
  value,
  className,
  indicatorClassName,
  showLabel = false,
  label,
  color = 'default',
}: ProgressProps) {
  const percentage = Math.min(Math.max(value, 0), 100);
  
  const getColorClasses = () => {
    if (color === 'yellow') {
      return {
        track: 'bg-[#2A2A2E]',
        indicator: 'bg-gradient-to-r from-[#FFC519] to-[#FFD54F]',
      };
    }
    return {
      track: 'bg-[#2A2A2E]',
      indicator: 'bg-gradient-to-r from-[#FB8018] to-[#FFC519]',
    };
  };

  const colors = getColorClasses();

  return (
    <div className={cn('relative h-3 w-full rounded-full overflow-hidden', colors.track, className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          colors.indicator,
          indicatorClassName
        )}
        style={{ 
          width: `${percentage}%`,
          boxShadow: percentage > 0 ? '0 0 10px rgba(255, 197, 25, 0.5)' : 'none',
        }}
      />
      {showLabel && label && (
        <div
          className="absolute top-1/2 -translate-y-1/2 text-white text-xs font-medium whitespace-nowrap px-2"
          style={{
            left: `${Math.max(percentage - 5, 5)}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
