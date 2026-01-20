"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

type TipPosition = "top" | "bottom" | "left" | "right";

interface TipProps {
  content: string;
  className?: string;
  position?: TipPosition;
  width?: string;
  delayDuration?: number;
  sideOffset?: number;
  trigger?: React.ReactNode;
}

export function Tip({
  content,
  className,
  position = "top",
  width,
  delayDuration = 200,
  sideOffset = 10,
  trigger,
}: TipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    place: TipPosition;
    arrowLeft?: number;
    arrowTop?: number;
  }>({
    top: 0,
    left: 0,
    place: position,
  });
  // 客户端组件，直接渲染即可，无需 mounted 标记

  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isClickRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let place = position;

    // 基础定位计算
    const calculateCoords = (p: TipPosition) => {
      switch (p) {
        case "top":
          return {
            top:
              triggerRect.top -
              tooltipRect.height -
              sideOffset +
              window.scrollY,
            left:
              triggerRect.left +
              triggerRect.width / 2 -
              tooltipRect.width / 2 +
              window.scrollX,
          };
        case "bottom":
          return {
            top: triggerRect.bottom + sideOffset + window.scrollY,
            left:
              triggerRect.left +
              triggerRect.width / 2 -
              tooltipRect.width / 2 +
              window.scrollX,
          };
        case "left":
          return {
            top:
              triggerRect.top +
              triggerRect.height / 2 -
              tooltipRect.height / 2 +
              window.scrollY,
            left:
              triggerRect.left -
              tooltipRect.width -
              sideOffset +
              window.scrollX,
          };
        case "right":
          return {
            top:
              triggerRect.top +
              triggerRect.height / 2 -
              tooltipRect.height / 2 +
              window.scrollY,
            left: triggerRect.right + sideOffset + window.scrollX,
          };
      }
    };

    let { top: calculatedTop, left: calculatedLeft } = calculateCoords(place);

    // 边界检查与翻转逻辑
    const padding = 10;

    // 垂直方向检查
    if (place === "top" && calculatedTop < window.scrollY + padding) {
      place = "bottom";
      const result = calculateCoords(place);
      calculatedTop = result.top;
      calculatedLeft = result.left;
    } else if (
      place === "bottom" &&
      calculatedTop + tooltipRect.height >
        window.scrollY + viewportHeight - padding
    ) {
      place = "top";
      const result = calculateCoords(place);
      calculatedTop = result.top;
      calculatedLeft = result.left;
    }

    // 水平方向检查 (简单平移而非翻转，防止左右都放不下的情况)
    if (calculatedLeft < padding + window.scrollX) {
      calculatedLeft = padding + window.scrollX;
    } else if (
      calculatedLeft + tooltipRect.width >
      viewportWidth - padding + window.scrollX
    ) {
      calculatedLeft =
        viewportWidth - padding - tooltipRect.width + window.scrollX;
    }

    // 箭头与触发点中心对齐计算
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;
    const triggerCenterX =
      triggerRect.left + triggerRect.width / 2 + window.scrollX;
    const triggerCenterY =
      triggerRect.top + triggerRect.height / 2 + window.scrollY;

    let arrowLeft: number | undefined;
    let arrowTop: number | undefined;
    const arrowPadding = 4;

    if (place === "top" || place === "bottom") {
      arrowLeft = triggerCenterX - calculatedLeft;
      arrowLeft = Math.max(
        arrowPadding,
        Math.min(tooltipWidth - arrowPadding, arrowLeft)
      );
    } else {
      arrowTop = triggerCenterY - calculatedTop;
      arrowTop = Math.max(
        arrowPadding,
        Math.min(tooltipHeight - arrowPadding, arrowTop)
      );
    }

    setCoords({
      top: calculatedTop,
      left: calculatedLeft,
      place,
      arrowLeft,
      arrowTop,
    });
    setIsReady(true);
  }, [position, sideOffset]);

  // 监听滚动和大小变化
  useEffect(() => {
    if (isOpen) {
      // 使用 requestAnimationFrame 避免同步更新 state 导致的警告，并确保在渲染后执行
      requestAnimationFrame(() => updatePosition());

      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsReady(false);
      setIsOpen(true);
      // 给一点时间让DOM渲染，然后计算位置
      requestAnimationFrame(() => {
        updatePosition();
      });
    }, delayDuration);
  };

  const handleMouseLeave = () => {
    // 如果是点击触发的，不执行鼠标离开的逻辑，交由点击外部关闭
    if (isClickRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsReady(false);
    }, 150);
  };

  const theme = useStore((s) => s.theme);
  const tooltipBg = theme === "dark" ? "#FFFFFF" : "#000000";
  const tooltipText = theme === "dark" ? "#000000" : "#FFFFFF";
  const tooltipBorder =
    theme === "dark" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.25)";

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      if (tooltipRef.current && tooltipRef.current.contains(target)) return;
      setIsOpen(false);
    };
    const handleScroll = () => {
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  // 箭头样式
  const getArrowStyle = (place: TipPosition) => {
    switch (place) {
      case "top":
        return "bottom-[-4px] border-b-0 border-r-0";
      case "bottom":
        return "top-[-4px] border-t-0 border-l-0";
      case "left":
        return "right-[-4px] border-l-0 border-b-0";
      case "right":
        return "left-[-4px] border-t-0 border-r-0";
    }
  };

  return (
    <>
      <span
        ref={triggerRef}
        className={cn(
          "inline-flex items-center justify-center cursor-help",
          className
        )}
        onMouseEnter={() => {
          isClickRef.current = false;
          handleMouseEnter();
        }}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          // 阻止事件冒泡，防止立即触发 document 的点击关闭
          e.stopPropagation();
          e.preventDefault();

          if (timerRef.current) clearTimeout(timerRef.current);

          if (!isOpen) {
            isClickRef.current = true;
            setIsOpen(true);
            setIsReady(false); // 重新计算位置
          } else {
            setIsOpen(false);
            isClickRef.current = false;
          }
        }}
        role="button"
        aria-label="Show info"
      >
        {trigger || (
          <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" />
        )}
      </span>

      {isOpen &&
        createPortal(
          <div
            ref={tooltipRef}
            className={cn(
              "absolute z-[9999] px-3 py-2 text-xs rounded-lg shadow-xl border",
              "transition-opacity duration-200",
              isReady ? "opacity-100" : "opacity-0",
              "whitespace-pre-line wrap-break-word max-w-[90vw]"
            )}
            style={{
              top: coords.top,
              left: coords.left,
              width: width || "auto",
              maxWidth: width || "280px",
              background: tooltipBg,
              color: tooltipText,
              borderColor: tooltipBorder,
            }}
            onMouseEnter={handleMouseEnter} // 允许鼠标移动到 tooltip 上
            onMouseLeave={handleMouseLeave}
          >
            {content}

            {/* 纯 CSS 箭头 (旋转的正方形) */}
            <div
              className={cn(
                "absolute w-2 h-2 border transform rotate-45",
                getArrowStyle(coords.place)
              )}
              style={{
                background: "transparent",
                borderColor: tooltipBorder,
                boxShadow:
                  theme === "dark"
                    ? "0 1px 0 rgba(0,0,0,0.25)"
                    : "0 1px 0 rgba(255,255,255,0.15)",
                left:
                  (coords.place === "top" || coords.place === "bottom") &&
                  typeof coords.arrowLeft === "number"
                    ? `${coords.arrowLeft - 4}px`
                    : undefined,
                top:
                  (coords.place === "left" || coords.place === "right") &&
                  typeof coords.arrowTop === "number"
                    ? `${coords.arrowTop - 4}px`
                    : undefined,
              }}
            />
            <div
              className={cn(
                "absolute w-2 h-2 transform rotate-45",
                getArrowStyle(coords.place)
              )}
              style={{
                background: tooltipBg,
                left:
                  (coords.place === "top" || coords.place === "bottom") &&
                  typeof coords.arrowLeft === "number"
                    ? `${coords.arrowLeft - 4}px`
                    : undefined,
                top:
                  (coords.place === "left" || coords.place === "right") &&
                  typeof coords.arrowTop === "number"
                    ? `${coords.arrowTop - 4}px`
                    : undefined,
                ...(coords.place === "top"
                  ? { bottom: "-3px" }
                  : coords.place === "bottom"
                  ? { top: "-3px" }
                  : coords.place === "left"
                  ? { right: "-3px" }
                  : { left: "-3px" }),
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}
