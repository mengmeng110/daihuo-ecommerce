// Service Worker 注册和管理脚本
// 用于在客户端应用中注册和管理 Service Worker

'use client';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
  controller: ServiceWorker | null;
}

interface SyncMessage {
  type: string;
  timestamp?: number;
  url?: string;
  error?: string;
  total?: number;
  successful?: number;
}

type SyncListener = (message: SyncMessage) => void;

class ServiceWorkerManager {
  private state: ServiceWorkerState = {
    isSupported: false,
    isRegistered: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    registration: null,
    controller: null,
  };

  private listeners: Map<string, Set<SyncListener>> = new Map();
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.state.isSupported = 'serviceWorker' in navigator;
      this.setupOnlineOfflineListeners();
    }
  }

  /**
   * 注册 Service Worker
   */
  async register(): Promise<boolean> {
    if (!this.state.isSupported) {
      console.warn('ServiceWorkerManager: Service Workers not supported');
      return false;
    }

    try {
      console.log('ServiceWorkerManager: Registering service worker...');

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      this.state.registration = registration;
      this.state.isRegistered = true;

      // 监听更新
      registration.addEventListener('updatefound', () => {
        this.handleUpdateFound(registration);
      });

      // 检查是否有活跃的 worker
      if (registration.active) {
        this.state.controller = registration.active;
        this.setupMessageListener(registration.active);
      }

      // 设置定期更新检查
      this.startUpdateCheck();

      console.log('ServiceWorkerManager: Service worker registered successfully');
      return true;
    } catch (error) {
      console.error('ServiceWorkerManager: Registration failed:', error);
      return false;
    }
  }

  /**
   * 注销 Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.state.registration) {
      return false;
    }

    try {
      const result = await this.state.registration.unregister();
      this.state.isRegistered = false;
      this.state.registration = null;
      this.state.controller = null;
      this.stopUpdateCheck();
      console.log('ServiceWorkerManager: Service worker unregistered');
      return result;
    } catch (error) {
      console.error('ServiceWorkerManager: Unregistration failed:', error);
      return false;
    }
  }

  /**
   * 检查更新
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.state.registration) {
      return false;
    }

    try {
      await this.state.registration.update();
      return true;
    } catch (error) {
      console.error('ServiceWorkerManager: Update check failed:', error);
      return false;
    }
  }

  /**
   * 跳过等待，立即激活新的 Service Worker
   */
  skipWaiting(): void {
    if (this.state.controller) {
      this.state.controller.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  /**
   * 获取当前状态
   */
  getState(): Readonly<ServiceWorkerState> {
    return { ...this.state };
  }

  /**
   * 监听同步消息
   */
  onSync(type: string, listener: SyncListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    // 返回取消监听函数
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /**
   * 清除指定缓存
   */
  async clearCache(cacheName?: string): Promise<void> {
    if (this.state.controller) {
      this.state.controller.postMessage({
        type: 'CLEAR_CACHE',
        cacheName,
      });
    }
  }

  /**
   * 手动缓存 URL
   */
  async cacheUrls(urls: string[]): Promise<void> {
    if (this.state.controller) {
      this.state.controller.postMessage({
        type: 'CACHE_URLS',
        urls,
      });
    }
  }

  /**
   * 获取缓存大小
   */
  async getCacheSize(): Promise<Record<string, number> | null> {
    return new Promise((resolve) => {
      if (!this.state.controller) {
        resolve(null);
        return;
      }

      const timeout = setTimeout(() => resolve(null), 5000);

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'CACHE_SIZE') {
          clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener('message', handler);
          resolve(event.data.data);
        }
      };

      navigator.serviceWorker.addEventListener('message', handler);
      this.state.controller.postMessage({ type: 'GET_CACHE_SIZE' });
    });
  }

  /**
   * 注册后台同步
   */
  async registerBackgroundSync(tag: string): Promise<boolean> {
    if (!this.state.registration || !('sync' in this.state.registration)) {
      console.warn('ServiceWorkerManager: Background sync not supported');
      return false;
    }

    try {
      // @ts-ignore - sync API 类型定义
      await this.state.registration.sync.register(tag);
      console.log(`ServiceWorkerManager: Background sync registered: ${tag}`);
      return true;
    } catch (error) {
      console.error('ServiceWorkerManager: Background sync registration failed:', error);
      return false;
    }
  }

  /**
   * 将失败的请求加入队列
   */
  async queueFailedRequest(requestData: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
  }): Promise<void> {
    if (this.state.controller) {
      this.state.controller.postMessage({
        type: 'QUEUE_FAILED_REQUEST',
        request: requestData,
      });
    }
  }

  // ============ 私有方法 ============

  private setupOnlineOfflineListeners(): void {
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.emitSync({ type: 'ONLINE', timestamp: Date.now() });
      console.log('ServiceWorkerManager: Back online');
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.emitSync({ type: 'OFFLINE', timestamp: Date.now() });
      console.log('ServiceWorkerManager: Gone offline');
    });
  }

  private setupMessageListener(worker: ServiceWorker): void {
    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
      const message = event.data;
      console.log('ServiceWorkerManager: Message received:', message.type);

      switch (message.type) {
        case 'API_CACHE_UPDATED':
          this.emitSync({
            type: 'API_CACHE_UPDATED',
            url: message.url,
            timestamp: message.timestamp,
          });
          break;

        case 'SYNC_START':
          this.emitSync({
            type: 'SYNC_START',
            timestamp: message.timestamp,
          });
          break;

        case 'SYNC_COMPLETE':
          this.emitSync({
            type: 'SYNC_COMPLETE',
            timestamp: message.timestamp,
          });
          break;

        case 'SYNC_ERROR':
          this.emitSync({
            type: 'SYNC_ERROR',
            error: message.error,
            timestamp: message.timestamp,
          });
          break;

        case 'FAILED_REQUESTS_PROCESSED':
          this.emitSync({
            type: 'FAILED_REQUESTS_PROCESSED',
            total: message.total,
            successful: message.successful,
            timestamp: message.timestamp,
          });
          break;

        default:
          // 转发其他消息
          this.emitSync(message);
      }
    });
  }

  private handleUpdateFound(registration: ServiceWorkerRegistration): void {
    const newWorker = registration.installing;
    if (!newWorker) return;

    console.log('ServiceWorkerManager: New worker installing...');

    newWorker.addEventListener('statechange', () => {
      console.log('ServiceWorkerManager: Worker state:', newWorker.state);

      switch (newWorker.state) {
        case 'installed':
          if (navigator.serviceWorker.controller) {
            // 新的 Service Worker 已安装，等待激活
            console.log('ServiceWorkerManager: New content available');
            this.emitSync({
              type: 'UPDATE_AVAILABLE',
              timestamp: Date.now(),
            });
          } else {
            // 首次安装
            console.log('ServiceWorkerManager: Content cached for offline use');
            this.emitSync({
              type: 'INSTALLED',
              timestamp: Date.now(),
            });
          }
          break;

        case 'activating':
          console.log('ServiceWorkerManager: New worker activating...');
          break;

        case 'activated':
          console.log('ServiceWorkerManager: New worker activated');
          this.state.controller = newWorker;
          this.setupMessageListener(newWorker);
          this.emitSync({
            type: 'ACTIVATED',
            timestamp: Date.now(),
          });
          break;
      }
    });
  }

  private emitSync(message: SyncMessage): void {
    this.listeners.get(message.type)?.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('ServiceWorkerManager: Listener error:', error);
      }
    });

    // 通用监听器
    this.listeners.get('*')?.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('ServiceWorkerManager: Wildcard listener error:', error);
      }
    });
  }

  private startUpdateCheck(): void {
    // 每小时检查一次更新
    this.updateCheckInterval = setInterval(
      () => {
        this.checkForUpdate();
      },
      60 * 60 * 1000
    );
  }

  private stopUpdateCheck(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }
}

// 单例模式
let instance: ServiceWorkerManager | null = null;

export function getServiceWorkerManager(): ServiceWorkerManager {
  if (typeof window === 'undefined') {
    // 服务端返回空对象
    return {
      register: async () => false,
      unregister: async () => false,
      checkForUpdate: async () => false,
      skipWaiting: () => {},
      getState: () => ({
        isSupported: false,
        isRegistered: false,
        isOnline: true,
        registration: null,
        controller: null,
      }),
      onSync: () => () => {},
      clearCache: async () => {},
      cacheUrls: async () => {},
      getCacheSize: async () => null,
      registerBackgroundSync: async () => false,
      queueFailedRequest: async () => {},
    } as any;
  }

  if (!instance) {
    instance = new ServiceWorkerManager();
  }
  return instance;
}

export type { ServiceWorkerState, SyncMessage, SyncListener };
export default getServiceWorkerManager();