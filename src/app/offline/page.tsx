"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  WifiOff,
  RefreshCw,
  Wifi,
  FileText,
  Image,
  History,
  Settings,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  离线可用功能列表                                                     */
/* ------------------------------------------------------------------ */
const offlineFeatures = [
  {
    icon: FileText,
    title: "查看已保存的脚本",
    description: "之前生成的脚本文案仍可浏览",
  },
  {
    icon: Image,
    title: "浏览本地素材",
    description: "已上传的商品图片仍然可用",
  },
  {
    icon: History,
    title: "查看历史记录",
    description: "离线期间可查看历史项目",
  },
  {
    icon: Settings,
    title: "修改应用设置",
    description: "个性化配置随时可调整",
  },
];

/* ------------------------------------------------------------------ */
/*  离线页面组件                                                        */
/* ------------------------------------------------------------------ */
export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  /* 监听网络状态变化 */
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /* 重试连接 */
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    try {
      // 尝试请求一个轻量级资源来检测网络
      const response = await fetch("/manifest.json", {
        method: "HEAD",
        cache: "no-store",
      });
      if (response.ok) {
        setIsOnline(true);
        // 网络恢复后跳转回首页
        window.location.href = "/";
      }
    } catch {
      // 仍然离线
    } finally {
      setIsRetrying(false);
    }
  }, []);

  /* 网络恢复后的自动跳转 */
  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => {
        window.location.href = "/";
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      {/* 网络恢复成功提示 */}
      {isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-x-0 top-4 z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-green-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm"
        >
          <CheckCircle2 className="h-4 w-4" />
          网络已恢复，正在跳转...
        </motion.div>
      )}

      {/* 离线图标动画 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mb-8"
      >
        {/* 背景光晕 */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-muted"
        />

        {/* 图标容器 */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-muted/80 backdrop-blur-sm">
          <motion.div
            animate={{
              rotate: [0, -5, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <WifiOff className="h-10 w-10 text-muted-foreground" />
          </motion.div>
        </div>
      </motion.div>

      {/* 标题与描述 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 text-center"
      >
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          网络连接已断开
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          没有检测到网络连接，部分功能暂时无法使用。
          <br />
          请检查网络设置后重试。
        </p>
      </motion.div>

      {/* 重试按钮 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-10"
      >
        <button
          onClick={handleRetry}
          disabled={isRetrying || isOnline}
          className="group relative flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
        >
          <motion.div
            animate={isRetrying ? { rotate: 360 } : {}}
            transition={
              isRetrying
                ? { duration: 1, repeat: Infinity, ease: "linear" }
                : {}
            }
          >
            {isOnline ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </motion.div>
          {isOnline
            ? "已连接"
            : isRetrying
              ? "正在重试..."
              : "重新连接"}

          {/* 按钮光效 */}
          <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>

        {/* 重试次数提示 */}
        {retryCount > 0 && !isOnline && !isRetrying && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground"
          >
            <AlertCircle className="h-3 w-3" />
            已尝试 {retryCount} 次，请检查网络设置
          </motion.p>
        )}
      </motion.div>

      {/* 离线可用功能 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm"
      >
        <h2 className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          离线可用功能
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {offlineFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <Link
                href="/"
                className="group flex flex-col items-center rounded-xl border border-border/50 bg-card/50 p-4 text-center transition-all hover:border-border hover:bg-card hover:shadow-sm"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 transition-colors group-hover:bg-primary/10">
                  <feature.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <h3 className="mb-1 text-xs font-medium text-foreground">
                  {feature.title}
                </h3>
                <p className="text-[10px] leading-tight text-muted-foreground">
                  {feature.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 底部提示 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-center text-[10px] text-muted-foreground/60"
      >
        连接恢复后将自动跳转 ·{" "}
        <Link href="/" className="underline underline-offset-2">
          返回首页
        </Link>
      </motion.p>
    </div>
  );
}
