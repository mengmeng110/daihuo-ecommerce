"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutGrid,
  List,
  Search,
  Upload,
  Trash2,
  CheckSquare,
  Square,
  Image as ImageIcon,
  Video,
  Music,
  FileImage,
  X,
  ArrowLeft,
  Eye,
  Download,
  HardDrive,
} from "lucide-react";
import {
  useMaterialStore,
  type MaterialItem,
  type MaterialType,
  saveBlobToIndexedDB,
  deleteBlobFromIndexedDB,
  deleteBlobsFromIndexedDB,
  getBlobFromIndexedDB,
  createThumbnail,
  getMediaDuration,
  getImageDimensions,
  inferMaterialType,
  formatFileSize,
  formatDuration,
  generateId,
} from "@/lib/stores/material-store";

// =========================================================
// 工具函数
// =========================================================

const ACCEPT_TYPES = "image/*,video/*,audio/*";

function isAcceptedFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/")
  );
}

const typeIconMap: Record<MaterialType, React.ReactNode> = {
  image: <ImageIcon className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  audio: <Music className="w-4 h-4" />,
};

const typeLabelMap: Record<MaterialType, string> = {
  image: "图片",
  video: "视频",
  audio: "音频",
};

// =========================================================
// 上传进度状态
// =========================================================

interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: "processing" | "done" | "error";
  error?: string;
}

// =========================================================
// 主页面组件
// =========================================================

export default function MaterialsPage() {
  const {
    materials,
    viewMode,
    filterType,
    searchQuery,
    selectedIds,
    setViewMode,
    setFilterType,
    setSearchQuery,
    toggleSelect,
    selectAll,
    clearSelection,
    addMaterial,
    removeMaterial,
    removeMaterials,
    getFilteredMaterials,
  } = useMaterialStore();

  // 本地 UI 状态
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"single" | "batch">("batch");
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<MaterialItem | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const filteredMaterials = getFilteredMaterials();
  const selectedCount = selectedIds.size;

  // ---- 上传文件逻辑 ----
  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter(isAcceptedFile);
      if (fileArray.length === 0) return;

      setIsUploading(true);
      const queue: UploadProgress[] = fileArray.map((f) => ({
        fileName: f.name,
        progress: 0,
        status: "processing" as const,
      }));
      setUploadQueue(queue);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          setUploadQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, progress: 10 } : q
            )
          );

          // 1. 生成缩略图
          const thumbnailUrl = await createThumbnail(file);
          setUploadQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, progress: 30 } : q
            )
          );

          // 2. 获取媒体元信息
          const type = inferMaterialType(file.type);
          let width: number | undefined;
          let height: number | undefined;
          let duration: number | undefined;

          if (type === "image") {
            const dims = await getImageDimensions(file);
            width = dims?.width;
            height = dims?.height;
          } else if (type === "video" || type === "audio") {
            duration = await getMediaDuration(file);
          }
          setUploadQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, progress: 50 } : q
            )
          );

          // 3. 存入 IndexedDB
          const id = generateId();
          await saveBlobToIndexedDB(id, file);
          setUploadQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, progress: 80 } : q
            )
          );

          // 4. 写入元数据到 zustand store
          const material: MaterialItem = {
            id,
            name: file.name,
            type,
            mimeType: file.type,
            size: file.size,
            width,
            height,
            duration,
            thumbnailUrl,
            createdAt: Date.now(),
          };
          addMaterial(material);

          setUploadQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, progress: 100, status: "done" as const } : q
            )
          );
        } catch (err) {
          setUploadQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? {
                    ...q,
                    status: "error" as const,
                    error: err instanceof Error ? err.message : "上传失败",
                  }
                : q
            )
          );
        }
      }

      // 延迟清空上传队列
      setTimeout(() => {
        setUploadQueue([]);
        setIsUploading(false);
      }, 1500);
    },
    [addMaterial]
  );

  // ---- 拖拽事件 ----
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 只在离开 dropZone 时取消高亮
    if (
      dropZoneRef.current &&
      !dropZoneRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  // ---- 文件选择器 ----
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = ""; // 重置
      }
    },
    [processFiles]
  );

  // ---- 删除 ----
  const handleSingleDelete = useCallback(
    (id: string) => {
      setSingleDeleteId(id);
      setDeleteTarget("single");
      setDeleteConfirmOpen(true);
    },
    []
  );

  const handleBatchDelete = useCallback(() => {
    if (selectedCount === 0) return;
    setDeleteTarget("batch");
    setDeleteConfirmOpen(true);
  }, [selectedCount]);

  const confirmDelete = useCallback(async () => {
    if (deleteTarget === "single" && singleDeleteId) {
      await deleteBlobFromIndexedDB(singleDeleteId);
      removeMaterial(singleDeleteId);
    } else if (deleteTarget === "batch") {
      const ids = Array.from(selectedIds);
      await deleteBlobsFromIndexedDB(ids);
      removeMaterials(ids);
    }
    setDeleteConfirmOpen(false);
    setSingleDeleteId(null);
  }, [deleteTarget, singleDeleteId, selectedIds, removeMaterial, removeMaterials]);

  // ---- 预览 ----
  const handlePreview = useCallback(async (material: MaterialItem) => {
    setPreviewMaterial(material);
    const blob = await getBlobFromIndexedDB(material.id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setPreviewObjectUrl(url);
    }
  }, []);

  const closePreview = useCallback(() => {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
    }
    setPreviewMaterial(null);
    setPreviewObjectUrl(null);
  }, [previewObjectUrl]);

  // ---- 下载 ----
  const handleDownload = useCallback(async (material: MaterialItem) => {
    const blob = await getBlobFromIndexedDB(material.id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = material.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, []);

  // ---- 统计 ----
  const stats = React.useMemo(() => {
    const all = materials;
    return {
      total: all.length,
      images: all.filter((m) => m.type === "image").length,
      videos: all.filter((m) => m.type === "video").length,
      audios: all.filter((m) => m.type === "audio").length,
      totalSize: all.reduce((s, m) => s + m.size, 0),
    };
  }, [materials]);

  // ---- 预览弹窗关闭时清理 ----
  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
      if (e.key === "a" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        selectAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closePreview, selectAll]);

  // =========================================================
  // 渲染
  // =========================================================

  return (
    <div
      ref={dropZoneRef}
      className="min-h-screen bg-background"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 拖拽遮罩 */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-4 p-12 border-2 border-dashed rounded-2xl border-primary bg-primary/5">
            <Upload className="w-16 h-16 text-primary animate-bounce" />
            <p className="text-xl font-semibold text-primary">松开鼠标上传素材</p>
            <p className="text-sm text-muted-foreground">
              支持图片、视频、音频文件
            </p>
          </div>
        </div>
      )}

      {/* 顶部栏 */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">素材库</h1>
              <p className="text-sm text-muted-foreground">
                管理您的图片、视频和音频素材
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 存储统计 */}
            <div className="hidden md:flex items-center gap-1.5 mr-2 px-3 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{stats.total} 个素材</span>
              <span className="text-border">|</span>
              <span>{formatFileSize(stats.totalSize)}</span>
            </div>

            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              上传素材
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_TYPES}
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between gap-4 px-6 pb-3">
          <div className="flex items-center gap-2 flex-1">
            {/* 搜索 */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索素材名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            {/* 类型筛选 */}
            <Select
              value={filterType}
              onValueChange={(v) => setFilterType(v as MaterialType | "all")}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="image">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> 图片 ({stats.images})
                  </span>
                </SelectItem>
                <SelectItem value="video">
                  <span className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> 视频 ({stats.videos})
                  </span>
                </SelectItem>
                <SelectItem value="audio">
                  <span className="flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5" /> 音频 ({stats.audios})
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {/* 批量操作 */}
            {selectedCount > 0 && (
              <>
                <Badge variant="secondary" className="px-3 py-1">
                  已选 {selectedCount} 项
                </Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  删除
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  取消
                </Button>
              </>
            )}

            {/* 全选 */}
            {filteredMaterials.length > 0 && selectedCount === 0 && (
              <Button variant="ghost" size="sm" onClick={selectAll}>
                <CheckSquare className="w-4 h-4 mr-1" />
                全选
              </Button>
            )}

            {/* 视图切换 */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-r-none"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-l-none"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 上传进度 */}
      {uploadQueue.length > 0 && (
        <div className="mx-6 mt-4 p-4 rounded-lg border bg-muted/30">
          <p className="text-sm font-medium mb-2">
            正在上传 {uploadQueue.filter((q) => q.status === "processing").length}{" "}
            个文件...
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {uploadQueue.map((q, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <FileImage className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{q.fileName}</span>
                {q.status === "done" ? (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    ✓
                  </Badge>
                ) : q.status === "error" ? (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    失败
                  </Badge>
                ) : (
                  <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${q.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 内容区 */}
      <div className="p-6">
        {filteredMaterials.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
              <Upload className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery || filterType !== "all"
                ? "没有找到匹配的素材"
                : "素材库为空"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {searchQuery || filterType !== "all"
                ? "试试修改搜索条件或筛选类型"
                : "拖拽文件到此页面，或点击下方按钮上传图片、视频和音频素材"}
            </p>
            {!searchQuery && filterType === "all" && (
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                上传素材
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* 网格视图 */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredMaterials.map((material) => (
              <MaterialGridCard
                key={material.id}
                material={material}
                selected={selectedIds.has(material.id)}
                onSelect={() => toggleSelect(material.id)}
                onPreview={() => handlePreview(material)}
                onDelete={() => handleSingleDelete(material.id)}
                onDownload={() => handleDownload(material)}
              />
            ))}
          </div>
        ) : (
          /* 列表视图 */
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-sm text-muted-foreground">
                  <th className="w-10 px-3 py-2 text-left font-medium">
                    <button
                      onClick={() => {
                        if (selectedCount === filteredMaterials.length) {
                          clearSelection();
                        } else {
                          selectAll();
                        }
                      }}
                      className="hover:text-foreground"
                    >
                      {selectedCount === filteredMaterials.length &&
                      filteredMaterials.length > 0 ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 font-medium">预览</th>
                  <th className="text-left px-3 py-2 font-medium">名称</th>
                  <th className="text-left px-3 py-2 font-medium">类型</th>
                  <th className="text-right px-3 py-2 font-medium">大小</th>
                  <th className="text-right px-3 py-2 font-medium">尺寸/时长</th>
                  <th className="text-left px-3 py-2 font-medium">上传时间</th>
                  <th className="w-24 px-3 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((material) => (
                  <MaterialListRow
                    key={material.id}
                    material={material}
                    selected={selectedIds.has(material.id)}
                    onSelect={() => toggleSelect(material.id)}
                    onPreview={() => handlePreview(material)}
                    onDelete={() => handleSingleDelete(material.id)}
                    onDownload={() => handleDownload(material)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {deleteTarget === "single"
                ? "确定要删除这个素材吗？此操作无法撤销。"
                : `确定要删除选中的 ${selectedCount} 个素材吗？此操作无法撤销。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预览弹窗 */}
      <Dialog
        open={!!previewMaterial}
        onOpenChange={(open) => !open && closePreview()}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">
              {previewMaterial?.name}
            </DialogTitle>
            <DialogDescription>
              {previewMaterial &&
                `${typeLabelMap[previewMaterial.type]} · ${formatFileSize(previewMaterial.size)}`}
              {previewMaterial?.width &&
                previewMaterial?.height &&
                ` · ${previewMaterial.width} × ${previewMaterial.height}`}
              {previewMaterial?.duration &&
                ` · ${formatDuration(previewMaterial.duration)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center min-h-[300px] bg-muted/30 rounded-lg overflow-hidden">
            {!previewObjectUrl ? (
              <p className="text-muted-foreground">加载中...</p>
            ) : previewMaterial?.type === "image" ? (
              <img
                src={previewObjectUrl}
                alt={previewMaterial.name}
                className="max-h-[60vh] object-contain"
              />
            ) : previewMaterial?.type === "video" ? (
              <video
                src={previewObjectUrl}
                controls
                className="max-h-[60vh] max-w-full"
              />
            ) : previewMaterial?.type === "audio" ? (
              <div className="flex flex-col items-center gap-4 p-8">
                <Music className="w-20 h-20 text-muted-foreground" />
                <audio src={previewObjectUrl} controls />
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => previewMaterial && handleDownload(previewMaterial)}
            >
              <Download className="w-4 h-4 mr-2" />
              下载
            </Button>
            <Button variant="ghost" onClick={closePreview}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =========================================================
// 网格卡片组件
// =========================================================

function MaterialGridCard({
  material,
  selected,
  onSelect,
  onPreview,
  onDelete,
  onDownload,
}: {
  material: MaterialItem;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  return (
    <div
      className={`group relative rounded-lg border bg-card overflow-hidden transition-all hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      {/* 选中复选框 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
        style={{
          backgroundColor: selected ? "hsl(var(--primary))" : "hsl(var(--background))",
          borderColor: selected ? "hsl(var(--primary))" : "hsl(var(--border))",
        }}
      >
        {selected && (
          <svg
            className="w-3 h-3 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* 缩略图/类型图标 */}
      <div
        className="aspect-square flex items-center justify-center bg-muted/50 cursor-pointer"
        onClick={onPreview}
      >
        {material.thumbnailUrl ? (
          <img
            src={material.thumbnailUrl}
            alt={material.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {typeIconMap[material.type]}
            <span className="text-xs">{typeLabelMap[material.type]}</span>
          </div>
        )}
      </div>

      {/* 信息栏 */}
      <div className="p-2.5">
        <p className="text-sm font-medium truncate" title={material.name}>
          {material.name}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {formatFileSize(material.size)}
          </span>
          {material.duration && (
            <span className="text-xs text-muted-foreground">
              {formatDuration(material.duration)}
            </span>
          )}
        </div>
      </div>

      {/* 悬浮操作按钮 */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="w-7 h-7 rounded-md bg-background/90 border flex items-center justify-center hover:bg-accent"
          title="预览"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className="w-7 h-7 rounded-md bg-background/90 border flex items-center justify-center hover:bg-accent"
          title="下载"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-7 h-7 rounded-md bg-background/90 border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// =========================================================
// 列表行组件
// =========================================================

function MaterialListRow({
  material,
  selected,
  onSelect,
  onPreview,
  onDelete,
  onDownload,
}: {
  material: MaterialItem;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  return (
    <tr
      className={`border-b last:border-0 hover:bg-muted/50 transition-colors ${
        selected ? "bg-primary/5" : ""
      }`}
    >
      {/* 选择 */}
      <td className="px-3 py-2">
        <button onClick={onSelect} className="hover:text-foreground">
          {selected ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </td>

      {/* 缩略图 */}
      <td className="px-3 py-2">
        <div
          className="w-12 h-12 rounded border overflow-hidden flex items-center justify-center bg-muted/50 cursor-pointer"
          onClick={onPreview}
        >
          {material.thumbnailUrl ? (
            <img
              src={material.thumbnailUrl}
              alt={material.name}
              className="w-full h-full object-cover"
            />
          ) : (
            typeIconMap[material.type]
          )}
        </div>
      </td>

      {/* 名称 */}
      <td className="px-3 py-2">
        <p
          className="text-sm font-medium truncate max-w-[250px] cursor-pointer hover:underline"
          onClick={onPreview}
          title={material.name}
        >
          {material.name}
        </p>
      </td>

      {/* 类型 */}
      <td className="px-3 py-2">
        <Badge variant="outline" className="text-xs font-normal">
          {typeLabelMap[material.type]}
        </Badge>
      </td>

      {/* 大小 */}
      <td className="px-3 py-2 text-right text-sm text-muted-foreground">
        {formatFileSize(material.size)}
      </td>

      {/* 尺寸/时长 */}
      <td className="px-3 py-2 text-right text-sm text-muted-foreground">
        {material.width && material.height
          ? `${material.width}×${material.height}`
          : material.duration
            ? formatDuration(material.duration)
            : "—"}
      </td>

      {/* 上传时间 */}
      <td className="px-3 py-2 text-sm text-muted-foreground">
        {new Date(material.createdAt).toLocaleDateString("zh-CN")}
      </td>

      {/* 操作 */}
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onPreview}
            className="w-7 h-7 rounded hover:bg-accent flex items-center justify-center"
            title="预览"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDownload}
            className="w-7 h-7 rounded hover:bg-accent flex items-center justify-center"
            title="下载"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded hover:bg-destructive/10 hover:text-destructive flex items-center justify-center"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
