import { create } from "zustand";
import { persist } from "zustand/middleware";

// 素材类型
export type MaterialType = "image" | "video" | "audio";

// 素材元数据（存储在 localStorage）
export interface MaterialItem {
  id: string;
  name: string;
  type: MaterialType;
  mimeType: string;
  size: number; // 字节
  width?: number;
  height?: number;
  duration?: number; // 音视频时长（秒）
  thumbnailUrl?: string; // 缩略图 data URL
  createdAt: number; // timestamp
}

// 素材库状态
interface MaterialState {
  materials: MaterialItem[];
  viewMode: "grid" | "list";
  filterType: MaterialType | "all";
  searchQuery: string;
  selectedIds: Set<string>;

  // Actions
  setViewMode: (mode: "grid" | "list") => void;
  setFilterType: (type: MaterialType | "all") => void;
  setSearchQuery: (query: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  addMaterial: (material: MaterialItem) => void;
  removeMaterial: (id: string) => void;
  removeMaterials: (ids: string[]) => void;
  getFilteredMaterials: () => MaterialItem[];
}

export const useMaterialStore = create<MaterialState>()(
  persist(
    (set, get) => ({
      materials: [],
      viewMode: "grid",
      filterType: "all",
      searchQuery: "",
      selectedIds: new Set<string>(),

      setViewMode: (mode) => set({ viewMode: mode }),

      setFilterType: (type) => set({ filterType: type, selectedIds: new Set() }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      toggleSelect: (id) =>
        set((state) => {
          const next = new Set(state.selectedIds);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return { selectedIds: next };
        }),

      selectAll: () =>
        set((state) => {
          const filtered = get().getFilteredMaterials();
          return { selectedIds: new Set(filtered.map((m) => m.id)) };
        }),

      clearSelection: () => set({ selectedIds: new Set() }),

      addMaterial: (material) =>
        set((state) => ({
          materials: [material, ...state.materials],
        })),

      removeMaterial: (id) =>
        set((state) => ({
          materials: state.materials.filter((m) => m.id !== id),
          selectedIds: (() => {
            const next = new Set(state.selectedIds);
            next.delete(id);
            return next;
          })(),
        })),

      removeMaterials: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({
          materials: state.materials.filter((m) => !idSet.has(m.id)),
          selectedIds: new Set(),
        }));
      },

      getFilteredMaterials: () => {
        const { materials, filterType, searchQuery } = get();
        let result = materials;
        if (filterType !== "all") {
          result = result.filter((m) => m.type === filterType);
        }
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          result = result.filter((m) => m.name.toLowerCase().includes(q));
        }
        return result;
      },
    }),
    {
      name: "daihuo-materials",
      // 只持久化数据字段，不持久化 UI 状态
      partialize: (state) => ({
        materials: state.materials,
        viewMode: state.viewMode,
      }),
      // Date 修正 —— createdAt 是 number 所以不需要特殊处理
    }
  )
);

// ========================
// IndexedDB 工具函数
// ========================

const DB_NAME = "daihuo-materials-db";
const DB_VERSION = 1;
const STORE_NAME = "blobs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB not available on server"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 将文件 Blob 存入 IndexedDB，key = material id */
export async function saveBlobToIndexedDB(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 从 IndexedDB 读取文件 Blob */
export async function getBlobFromIndexedDB(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** 从 IndexedDB 删除文件 Blob */
export async function deleteBlobFromIndexedDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 批量从 IndexedDB 删除 */
export async function deleteBlobsFromIndexedDB(ids: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    ids.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 创建缩略图（图片 → 缩小 canvas → dataURL；视频 → 第一帧；音频 → null） */
export function createThumbnail(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 200;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        } else {
          resolve(undefined);
        }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve(undefined);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } else if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      const url = URL.createObjectURL(file);
      video.onloadeddata = () => {
        video.currentTime = 0.1;
      };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 200;
        const ratio = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight, 1);
        canvas.width = video.videoWidth * ratio;
        canvas.height = video.videoHeight * ratio;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        } else {
          resolve(undefined);
        }
        URL.revokeObjectURL(url);
      };
      video.onerror = () => {
        resolve(undefined);
        URL.revokeObjectURL(url);
      };
      video.src = url;
    } else {
      resolve(undefined);
    }
  });
}

/** 获取音视频时长 */
export function getMediaDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
      const el = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
      el.preload = "metadata";
      const url = URL.createObjectURL(file);
      el.onloadedmetadata = () => {
        resolve(el.duration);
        URL.revokeObjectURL(url);
      };
      el.onerror = () => {
        resolve(undefined);
        URL.revokeObjectURL(url);
      };
      el.src = url;
    } else {
      resolve(undefined);
    }
  });
}

/** 获取图片尺寸 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve(undefined);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } else {
      resolve(undefined);
    }
  });
}

/** 从 MIME 推断素材类型 */
export function inferMaterialType(mimeType: string): MaterialType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "image"; // fallback
}

/** 格式化文件大小 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

/** 格式化时长 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** 生成唯一 ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
