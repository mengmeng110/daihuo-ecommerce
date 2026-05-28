'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getServiceWorkerManager, type ServiceWorkerState, type SyncMessage } from '@/lib/sw-register';

interface UseServiceWorkerOptions {
  /**
   * 是否自动注册 Service Worker
   * @default true
   */
  autoRegister?: boolean;

  /**
   * 是否自动检查更新
   * @default true
   */
  autoCheckUpdate?: boolean;

  /**
   * 更新检查间隔（毫秒）
   * @default 3600000 (1 hour)
   */
  updateCheckInterval?: number;

  /**
   * 当有新版本可用时的回调
   */
  onUpdateAvailable?: () => void;

  /**
   * 当 Service Worker 激活时的回调
   */
  onActivated?: () => void;

  /**
   * 当同步完成时的回调
   */
  onSyncComplete?: () => void;

  /**
   * 当网络状态变化时的回调
   */
  onOnline?: () => void;
  onOffline?: () => void;
}

interface UseServiceWorkerReturn {
  /**
   * Service Worker 状态
   */
  state: ServiceWorkerState;

  /**
   * 是否有新版本可用
   */
  hasUpdate: boolean;

  /**
   * 是否正在同步
   */
  isSyncing: boolean;

  /**
   * 最后同步时间
   */
  lastSyncTime: Date | null;

  /**
   * 检查更新
   */
  checkForUpdate: () => Promise<boolean>;

  /**
   * 应用更新（跳过等待）
   */
  applyUpdate: () => void;

  /**
   * 清除缓存
   */
  clearCache: (cacheName?: string) => Promise<void>;

  /**
   * 获取缓存大小
   */
  getCacheSize: () => Promise<Record<string, number> | null>;

  /**
   * 注册后台同步
   */
  registerBackgroundSync: (tag: string) => Promise<boolean>;

  /**
   * 手动缓存 URL
   */
  cacheUrls: (urls: string[]) => Promise<void>;

  /**
   * 将失败的请求加入队列
   */
  queueFailedRequest: (requestData: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
  }) => Promise<void>;
}

export function useServiceWorker(options: UseServiceWorkerOptions = {}): UseServiceWorkerReturn {
  const {
    autoRegister = true,
    autoCheckUpdate = true,
    onUpdateAvailable,
    onActivated,
    onSyncComplete,
    onOnline,
    onOffline,
  } = options;

  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    registration: null,
    controller: null,
  });

  const [hasUpdate, setHasUpdate] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const managerRef = useRef(getServiceWorkerManager());
  const mountedRef = useRef(true);

  // 检查更新
  const checkForUpdate = useCallback(async (): Promise<boolean> => {
    try {
      return await managerRef.current.checkForUpdate();
    } catch (error) {
      console.error('useServiceWorker: Failed to check for update:', error);
      return false;
    }
  }, []);

  // 应用更新
  const applyUpdate = useCallback(() => {
    managerRef.current.skipWaiting();
    setHasUpdate(false);
  }, []);

  // 清除缓存
  const clearCache = useCallback(async (cacheName?: string) => {
    await managerRef.current.clearCache(cacheName);
  }, []);

  // 获取缓存大小
  const getCacheSize = useCallback(async () => {
    return await managerRef.current.getCacheSize();
  }, []);

  // 注册后台同步
  const registerBackgroundSync = useCallback(async (tag: string) => {
    return await managerRef.current.registerBackgroundSync(tag);
  }, []);

  // 手动缓存 URL
  const cacheUrls = useCallback(async (urls: string[]) => {
    await managerRef.current.cacheUrls(urls);
  }, []);

  // 将失败的请求加入队列
  const queueFailedRequest = useCallback(async (requestData: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
  }) => {
    await managerRef.current.queueFailedRequest(requestData);
  }, []);

  useEffect(() => {
    const manager = managerRef.current;
    mountedRef.current = true;

    // 注册 Service Worker
    if (autoRegister) {
      manager.register().then((success) => {
        if (mountedRef.current && success) {
          setState(manager.getState());
        }
      });
    }

    // 监听同步消息
    const unsubscribers = [
      manager.onSync('UPDATE_AVAILABLE', () => {
        if (mountedRef.current) {
          setHasUpdate(true);
          onUpdateAvailable?.();
        }
      }),

      manager.onSync('ACTIVATED', () => {
        if (mountedRef.current) {
          setState(manager.getState());
          setHasUpdate(false);
          onActivated?.();
        }
      }),

      manager.onSync('SYNC_START', () => {
        if (mountedRef.current) {
          setIsSyncing(true);
        }
      }),

      manager.onSync('SYNC_COMPLETE', () => {
        if (mountedRef.current) {
          setIsSyncing(false);
          setLastSyncTime(new Date());
          onSyncComplete?.();
        }
      }),

      manager.onSync('SYNC_ERROR', () => {
        if (mountedRef.current) {
          setIsSyncing(false);
        }
      }),

      manager.onSync('ONLINE', () => {
        if (mountedRef.current) {
          setState(manager.getState());
          onOnline?.();
        }
      }),

      manager.onSync('OFFLINE', () => {
        if (mountedRef.current) {
          setState(manager.getState());
          onOffline?.();
        }
      }),

      manager.onSync('INSTALLED', () => {
        if (mountedRef.current) {
          setState(manager.getState());
        }
      }),
    ];

    // 更新状态
    setState(manager.getState());

    // 清理函数
    return () => {
      mountedRef.current = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [autoRegister, onUpdateAvailable, onActivated, onSyncComplete, onOnline, onOffline]);

  return {
    state,
    hasUpdate,
    isSyncing,
    lastSyncTime,
    checkForUpdate,
    applyUpdate,
    clearCache,
    getCacheSize,
    registerBackgroundSync,
    cacheUrls,
    queueFailedRequest,
  };
}

/**
 * 简化的 hook，只返回常用的状态
 */
export function useServiceWorkerStatus() {
  const { state, hasUpdate, isSyncing } = useServiceWorker({
    autoRegister: true,
  });

  return {
    isSupported: state.isSupported,
    isRegistered: state.isRegistered,
    isOnline: state.isOnline,
    hasUpdate,
    isSyncing,
  };
}

export default useServiceWorker;