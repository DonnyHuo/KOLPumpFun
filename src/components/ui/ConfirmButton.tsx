"use client";

import { cn } from "@/lib/utils";

interface ConfirmButtonProps {
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  buttonType?: "button" | "submit" | "reset";
  onClick: () => void | Promise<void>;
  children: React.ReactNode;
}

export default function ConfirmButton({
  loading = false,
  disabled = false,
  className,
  buttonType = "button",
  onClick,
  children,
}: ConfirmButtonProps) {
  return (
    <button
      type={buttonType}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn("btn-primary", className)}
    >
      {loading ? <>{children}...</> : <>{children}</>}
    </button>
  );
}
