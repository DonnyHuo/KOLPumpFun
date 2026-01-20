"use client";

import { useEffect, useState } from "react";
import ConfirmButton from "./ConfirmButton";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "確認",
  cancelText = "取消",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      // 使用微任务避免同步 setState
      queueMicrotask(() => setIsVisible(true));
      // 延迟一帧后开始动画
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      queueMicrotask(() => setIsAnimating(false));
      // 等待动画结束后隐藏
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center transition-all duration-200 ${
        isAnimating ? "bg-black/60 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={onCancel}
    >
      <div
        className={`bg-[#1A1A1E] border border-white/10 rounded-2xl p-6 mx-6 max-w-75 w-full shadow-2xl transition-all duration-200 ${
          isAnimating
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white text-center mb-3">
          {title}
        </h3>
        <p className="text-sm text-gray-400 text-center mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary flex-1 h-10.5 bg-background border border-border rounded-xl text-sm text-text-secondary hover:bg-background-card-hover hover:border-border-hover transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <ConfirmButton
            onClick={onConfirm}
            disabled={loading}
            className=" flex-1 h-10.5 bg-linear-to-r from-[#FFC519] to-[#FFD54F] rounded-xl text-sm font-semibold text-black hover:shadow-lg hover:shadow-[#FFC519]/30 transition-all disabled:opacity-50"
            loading={loading}
          >
            {confirmText}
          </ConfirmButton>
        </div>
      </div>
    </div>
  );
}
