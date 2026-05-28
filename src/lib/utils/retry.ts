/**
 * 重试 & 超时工具
 *
 * 提供三个核心函数，用于在所有 AI API 调用中统一处理：
 *   1. withRetry      — 指数退避重试（可配置重试次数、基础延迟、退避因子、抖动）
 *   2. withTimeout     — 超时控制（基于 AbortController）
 *   3. withRetryAndTimeout — 组合使用：带超时的重试
 *
 * 设计原则：
 *   - 仅在瞬态错误（网络/429/5xx）时重试，业务错误直接抛出
 *   - 退避延迟 = baseDelay * 2^attempt + random jitter，避免惊群
 *   - 每次重试会触发 onRetry 回调，便于日志/监控
 *   - 超时基于 AbortSignal，兼容 OpenAI SDK 及原生 fetch
 */

// ==================== 类型定义 ====================

/** 重试配置 */
export interface RetryOptions {
  /** 最大重试次数（不含首次），默认 3 */
  maxRetries?: number;
  /** 基础延迟（毫秒），默认 1000 */
  baseDelay?: number;
  /** 退避因子，每次重试延迟乘以该值，默认 2 */
  backoffFactor?: number;
  /** 最大延迟上限（毫秒），默认 30000 */
  maxDelay?: number;
  /** 是否添加随机抖动（推荐开启），默认 true */
  jitter?: boolean;
  /** 判断是否可重试的函数，默认对网络/429/5xx 重试 */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** 每次重试前的回调（用于日志） */
  onRetry?: (error: unknown, attempt: number, nextDelay: number) => void;
}

/** 超时配置 */
export interface TimeoutOptions {
  /** 超时时间（毫秒） */
  timeoutMs: number;
  /** 超时错误消息 */
  message?: string;
}

/** 组合配置 */
export interface RetryAndTimeoutOptions extends RetryOptions {
  /** 每次调用的超时时间（毫秒），默认 60000 */
  timeoutMs?: number;
}

/** 扩展的错误类型，携带重试信息 */
export class RetryExhaustedError extends Error {
  /** 最后一次失败的原始错误 */
  readonly lastError: unknown;
  /** 总尝试次数（含首次） */
  readonly attempts: number;
  /** 消耗的总时间（毫秒） */
  readonly totalElapsed: number;

  constructor(lastError: unknown, attempts: number, totalElapsed: number) {
    const lastMsg = lastError instanceof Error ? lastError.message : String(lastError);
    super(`重试已耗尽（${attempts} 次尝试，耗时 ${totalElapsed}ms）：${lastMsg}`);
    this.name = 'RetryExhaustedError';
    this.lastError = lastError;
    this.attempts = attempts;
    this.totalElapsed = totalElapsed;
  }
}

export class TimeoutError extends Error {
  /** 超时毫秒数 */
  readonly timeoutMs: number;

  constructor(timeoutMs: number, message?: string) {
    super(message ?? `操作超时（${timeoutMs}ms）`);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

// ==================== 错误分类 ====================

/**
 * 判断错误是否为可重试的瞬态错误
 * - 网络错误（ECONNRESET / ETIMEDOUT / fetch 失败等）
 * - HTTP 429 限流
 * - HTTP 5xx 服务端错误
 * - OpenAI SDK 特有错误码（429 / 500 / 502 / 503 / 连接超时）
 * - AbortError 但不是由我们的超时控制触发的（即外部中断）
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  // --- HTTP 响应状态码 ---
  const statusCode = extractStatusCode(error);
  if (statusCode !== undefined) {
    // 429 限流 / 5xx 服务端错误 → 可重试
    if (statusCode === 429 || statusCode >= 500) return true;
    // 4xx 客户端错误（不含 429）→ 不重试
    if (statusCode >= 400) return false;
  }

  // --- OpenAI SDK 错误类型 ---
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    // OpenAI APIError 的 status 字段
    if (typeof err.status === 'number') {
      if (err.status === 429 || err.status >= 500) return true;
    }
    // code 字段
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND'
      || err.code === 'ECONNREFUSED' || err.code === 'EPIPE' || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
      return true;
    }
    // type 字段（OpenAI SDK）
    if (err.type === 'timeout' || err.type === 'connection_error') return true;
  }

  // --- Error.name / message ---
  if (error instanceof Error) {
    const name = error.name.toLowerCase();
    const msg = error.message.toLowerCase();

    // AbortError（非超时触发的）→ 可重试（例如服务器断开）
    // 注意：我们自己的 TimeoutError 不走这里，因为它是 TimeoutError 实例
    if (name === 'aborterror' && !(error instanceof TimeoutError)) {
      // 只在网络中断导致的 abort 时重试
      return true;
    }

    // 网络相关
    if (name === 'typeerror' && (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch'))) {
      return true;
    }

    // 超时相关
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('etimedout')) {
      return true;
    }

    // 连接相关
    if (msg.includes('econnreset') || msg.includes('econnrefused') || msg.includes('socket hang up')) {
      return true;
    }
  }

  return false;
}

/**
 * 从各种错误对象中提取 HTTP 状态码
 */
function extractStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const err = error as Record<string, unknown>;

  // 直接的 statusCode / status 字段
  if (typeof err.statusCode === 'number') return err.statusCode;
  if (typeof err.status === 'number') return err.status;

  // 嵌套的 response.status
  const response = err.response as Record<string, unknown> | undefined;
  if (response && typeof response.status === 'number') return response.status;

  return undefined;
}

// ==================== 延迟计算 ====================

/**
 * 计算指数退避延迟
 * delay = min(baseDelay * backoffFactor^attempt + jitter, maxDelay)
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  backoffFactor: number,
  maxDelay: number,
  jitter: boolean,
): number {
  let delay = baseDelay * Math.pow(backoffFactor, attempt);
  if (jitter) {
    // 增加 0 ~ baseDelay 的随机抖动
    delay += Math.random() * baseDelay;
  }
  return Math.min(Math.floor(delay), maxDelay);
}

/** Promise 版本的 sleep */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================== 核心函数 ====================

/**
 * withRetry — 指数退避重试
 *
 * 对任意异步函数执行重试，仅在瞬态错误时重试。
 *
 * @param fn      要执行的异步函数
 * @param options 重试配置
 * @returns fn 的返回值
 * @throws 最后一次重试的原始错误（包装在 RetryExhaustedError 中）
 *
 * @example
 * ```ts
 * const scripts = await withRetry(
 *   () => client.chat.completions.create({ ... }),
 *   { maxRetries: 3, baseDelay: 1000, onRetry: (err, attempt) => console.warn(`第${attempt}次重试`, err) }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    backoffFactor = 2,
    maxDelay = 30_000,
    jitter = true,
    shouldRetry = isRetryableError,
    onRetry,
  } = options;

  const startTime = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 最后一次尝试失败 → 抛出
      if (attempt >= maxRetries) break;

      // 判断是否可重试
      if (!shouldRetry(error, attempt)) break;

      // 计算退避延迟
      const delay = calculateDelay(attempt, baseDelay, backoffFactor, maxDelay, jitter);

      // 通知回调
      onRetry?.(error, attempt + 1, delay);

      // 等待后重试
      await sleep(delay);
    }
  }

  throw new RetryExhaustedError(lastError, maxRetries + 1, Date.now() - startTime);
}

/**
 * withTimeout — 超时控制
 *
 * 为任意异步函数添加超时保护，基于 AbortController 实现。
 * 返回的 promise 在超时后会 reject 为 TimeoutError。
 *
 * 支持两种使用方式：
 *   1. 包裹异步函数：withTimeout(() => fetch(url), { timeoutMs: 5000 })
 *   2. 提供外部 AbortSignal 来源（用于串联取消）：
 *      withTimeout(fn, { timeoutMs: 5000, externalSignal })
 *
 * @param fn      要执行的异步函数，接收 AbortSignal 参数
 * @param options 超时配置
 * @returns fn 的返回值
 * @throws TimeoutError 超时
 *
 * @example
 * ```ts
 * const result = await withTimeout(
 *   (signal) => client.chat.completions.create({ ... }, { signal }),
 *   { timeoutMs: 30_000 }
 * );
 * ```
 */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: TimeoutOptions & { externalSignal?: AbortSignal },
): Promise<T> {
  const { timeoutMs, message, externalSignal } = options;

  const controller = new AbortController();
  const { signal } = controller;

  // 如果外部有 signal，监听其 abort 事件
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    controller.abort(new TimeoutError(timeoutMs, message));
  }, timeoutMs);

  try {
    return await fn(signal);
  } catch (error) {
    // 如果是我们超时触发的 abort，转为 TimeoutError
    if (error instanceof DOMException && error.name === 'AbortError') {
      // 检查是否由我们的超时触发
      if (signal.aborted && !externalSignal?.aborted) {
        throw new TimeoutError(timeoutMs, message);
      }
    }
    // AbortController.abort(reason) 会直接抛出 reason
    if (error instanceof TimeoutError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TimeoutError(timeoutMs, message);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * withRetryAndTimeout — 带超时的重试
 *
 * 每次尝试（含重试）都有独立的超时控制。
 * 超时会被视为可重试的瞬态错误。
 *
 * @param fn      要执行的异步函数，接收 AbortSignal 参数
 * @param options 组合配置（重试 + 超时）
 * @returns fn 的返回值
 *
 * @example
 * ```ts
 * // 3 次重试，每次 60s 超时，指数退避
 * const result = await withRetryAndTimeout(
 *   (signal) => client.chat.completions.create(
 *     { model: 'gpt-4', messages: [...] },
 *     { signal }
 *   ),
 *   { maxRetries: 3, timeoutMs: 60_000 }
 * );
 * ```
 */
export async function withRetryAndTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: RetryAndTimeoutOptions = {},
): Promise<T> {
  const {
    timeoutMs = 60_000,
    maxRetries = 3,
    baseDelay = 1000,
    backoffFactor = 2,
    maxDelay = 30_000,
    jitter = true,
    shouldRetry = isRetryableError,
    onRetry,
  } = options;

  // 将 TimeoutError 纳入可重试范围
  const shouldRetryWithTimeout = (error: unknown, attempt: number): boolean => {
    if (error instanceof TimeoutError) return true;
    return shouldRetry(error, attempt);
  };

  return withRetry(
    () => withTimeout(fn, { timeoutMs }),
    {
      maxRetries,
      baseDelay,
      backoffFactor,
      maxDelay,
      jitter,
      shouldRetry: shouldRetryWithTimeout,
      onRetry,
    },
  );
}

// ==================== 便捷预设 ====================

/** OpenAI LLM 调用推荐配置（3 次重试、60s 超时、指数退避） */
export const LLM_RETRY_PRESET: RetryAndTimeoutOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  backoffFactor: 2,
  maxDelay: 30_000,
  timeoutMs: 60_000,
  jitter: true,
};

/** TTS / 图片生成等较长耗时操作推荐配置（2 次重试、120s 超时） */
export const MEDIA_RETRY_PRESET: RetryAndTimeoutOptions = {
  maxRetries: 2,
  baseDelay: 2000,
  backoffFactor: 2,
  maxDelay: 30_000,
  timeoutMs: 120_000,
  jitter: true,
};

/** 快速查询类 API 推荐配置（3 次重试、15s 超时） */
export const FAST_RETRY_PRESET: RetryAndTimeoutOptions = {
  maxRetries: 3,
  baseDelay: 500,
  backoffFactor: 2,
  maxDelay: 10_000,
  timeoutMs: 15_000,
  jitter: true,
};

// ==================== 辅助：可重试的 fetch ====================

/**
 * 带重试和超时的 fetch 封装
 *
 * @param url     请求 URL
 * @param init    fetch 初始化参数
 * @param options 重试 + 超时配置
 * @returns Response
 *
 * @example
 * ```ts
 * const res = await retryFetch('/api/ai/script-generate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(payload),
 * }, { maxRetries: 2, timeoutMs: 30_000 });
 * ```
 */
export async function retryFetch(
  url: string,
  init: RequestInit = {},
  options: RetryAndTimeoutOptions = {},
): Promise<Response> {
  return withRetryAndTimeout(
    (signal) => {
      // 合并外部 signal 和超时 signal
      const mergedInit: RequestInit = { ...init, signal };
      return fetch(url, mergedInit);
    },
    {
      ...options,
      // fetch 返回后还要检查 HTTP 状态码
      shouldRetry: (error, attempt) => {
        // Response 不是错误，但我们在下面处理
        if (error instanceof Error && error.message.startsWith('HTTP ')) {
          const statusMatch = error.message.match(/HTTP (\d+)/);
          if (statusMatch) {
            const status = parseInt(statusMatch[1], 10);
            return status === 429 || status >= 500;
          }
        }
        return isRetryableError(error, attempt);
      },
    },
  );
}

// ==================== 导出工具函数（供高级用例） ====================

export { isRetryableError, calculateDelay, sleep as delay };
