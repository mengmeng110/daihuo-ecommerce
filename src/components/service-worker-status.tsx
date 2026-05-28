'use client';

import { useEffect, useState } from 'react';
import { useServiceWorker } from '@/hooks/use-service-worker';
import { Wifi, WifiOff, RefreshCw, Download, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ServiceWorkerStatusProps {
  /**
   * 是否显示在线/离线状态
   * @default true
   */
  showOnlineStatus?: boolean;

  /**
   * 是否显示更新通知
   * @default true
   */
  showUpdateNotification?: boolean;

  /**
   * 位置
   * @default 'bottom-right'
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /**
   * 自定义类名
   */
  className?: string;
}

export function ServiceWorkerStatus({
  showOnlineStatus = true,
  showUpdateNotification = true,
  position = 'bottom-right',
  className = '',
}: ServiceWorkerStatusProps) {
  const {
    state,
    hasUpdate,
    isSyncing,
    applyUpdate,
    checkForUpdate,
  } = useServiceWorker({
    autoRegister: true,
    autoCheckUpdate: true,
  });

  const [showStatus, setShowStatus] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 显示状态变化通知
  useEffect(() => {
    if (!state.isOnline || hasUpdate) {
      setShowStatus(true);
    } else {
      // 在线状态显示 3 秒后隐藏
      const timer = setTimeout(() => setShowStatus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.isOnline, hasUpdate]);

  // 网络状态变化时重置 dismissed
  useEffect(() => {
    setDismissed(false);
  }, [state.isOnline]);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const handleUpdate = () => {
    applyUpdate();
    window.location.reload();
  };

  const handleCheckUpdate = async () => {
    await checkForUpdate();
  };

  if (dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed ${positionClasses[position]} z-50 ${className}`}
        >
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-lg shadow-xl p-4 max-w-sm">
            {/* 离线状态 */}
            {showOnlineStatus && !state.isOnline && (
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <WifiOff className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">网络已断开</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    部分功能暂时不可用
                  </p>
                </div>
                <button
                  onClick={() => setDismissed(true)}
                  className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* 在线恢复 */}
            {showOnlineStatus && state.isOnline && showStatus && (
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Wifi className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">已恢复连接</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    网络已恢复正常
                  </p>
                </div>
              </div>
            )}

            {/* 更新通知 */}
            {showUpdateNotification && hasUpdate && (
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Download className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">新版本可用</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    点击更新以获取最新功能
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    更新
                  </button>
                  <button
                    onClick={() => setDismissed(true)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    稍后
                  </button>
                </div>
              </div>
            )}

            {/* 同步状态 */}
            {isSyncing && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-800">
                <div className="flex-shrink-0">
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                </div>
                <p className="text-xs text-gray-400">正在同步数据...</p>
              </div>
            )}

            {/* 调试信息（开发环境） */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">SW 状态</span>
                  <div className="flex items-center gap-1.5">
                    {state.isRegistered ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-gray-600" />
                    )}
                    <span className="text-xs text-gray-500">
                      {state.isRegistered ? '已注册' : '未注册'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleCheckUpdate}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-400 transition-colors"
                >
                  检查更新
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 简单的在线状态指示器
 */
export function OnlineStatusIndicator({ className = '' }: { className?: string }) {
  const { state } = useServiceWorker();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${
          state.isOnline ? 'bg-green-500' : 'bg-orange-500'
        }`}
      />
      <span className="text-sm text-gray-400">
        {state.isOnline ? '在线' : '离线'}
      </span>
    </div>
  );
}

export default ServiceWorkerStatus;