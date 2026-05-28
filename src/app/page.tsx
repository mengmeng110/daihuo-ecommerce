"use client";

import { useMemo } from "react";
import Link from "next/link";
import { 
  LuSettings, LuPlus, LuZap, LuVideo, LuFilm, LuPackage, 
  LuTriangleAlert, LuBarChart3, LuClock, LuCheckCircle2, 
  LuLoader2, LuFileText, LuLayoutTemplate, LuImage, LuArrowRight
} from "react-icons/lu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useProjectStore } from "@/lib/stores/project-store";

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-zinc-500/20 text-zinc-400" },
  script: { label: "脚本中", color: "bg-blue-500/20 text-blue-400" },
  storyboard: { label: "分镜中", color: "bg-purple-500/20 text-purple-400" },
  generating: { label: "生成中", color: "bg-cyan-500/20 text-cyan-400" },
  video: { label: "合成中", color: "bg-amber-500/20 text-amber-400" },
  done: { label: "已完成", color: "bg-emerald-500/20 text-emerald-400" },
  failed: { label: "失败", color: "bg-red-500/20 text-red-400" },
};

export default function HomePage() {
  const { projects } = useProjectStore();
  const { llm, providers } = useSettingsStore();
  
  // 系统状态检测
  const isLLMConfigured = llm.apiKey.length > 0;
  const hasAnyProvider = Object.values(providers).some(p => p.enabled && p.apiKey.length > 0);
  const isSystemReady = isLLMConfigured && hasAnyProvider;

  // 项目统计
  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter(p => p.status === "done").length;
    const inProgress = projects.filter(p => p.status !== "done").length;
    return { total, completed, inProgress };
  }, [projects]);

  // 最近项目（按更新时间排序，取前5个）
  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [projects]);

  return (
    <div className="min-h-screen grid-bg">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg brand-gradient">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">带货剪手</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/products">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <LuPackage className="w-4 h-4" />
                <span className="ml-1.5">商品库</span>
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <LuSettings className="w-4 h-4" />
                <span className="ml-1.5">设置</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            <span className="brand-gradient-text">AI 驱动</span>的电商带货视频
          </h1>
          <p className="text-muted-foreground text-base">
            上传商品图，AI 生成脚本，一键产出高转化带货短视频
          </p>
        </div>

        {/* 系统状态检测横幅 */}
        {!isSystemReady && (
          <Link href="/settings">
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-4 cursor-pointer hover:bg-amber-100 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <LuTriangleAlert className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 text-sm">
                  {!isLLMConfigured ? "请先配置 LLM 服务" : "请配置至少一个 AI 平台"}
                </h3>
                <p className="text-xs text-amber-700 mt-1">
                  {!isLLMConfigured 
                    ? "LLM 用于生成脚本和分析商品，是核心功能的基础" 
                    : "AI 平台用于生成图片和视频素材"}
                </p>
              </div>
              <LuArrowRight className="w-5 h-5 text-amber-600 shrink-0" />
            </div>
          </Link>
        )}

        {/* 快速统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                <LuBarChart3 className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">总项目数</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <LuCheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">已完成</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                <LuLoader2 className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">进行中</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快速操作入口 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">快速操作</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/project/new">
              <Card className="card-hover glass-card cursor-pointer group h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl brand-gradient shadow-lg group-hover:scale-105 transition-transform">
                    <LuPlus className="w-[22px] h-[22px] text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">新建项目</h3>
                    <p className="text-sm text-muted-foreground">创建带货视频项目</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/templates">
              <Card className="card-hover glass-card cursor-pointer group h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg group-hover:scale-105 transition-transform">
                    <LuLayoutTemplate className="w-[22px] h-[22px] text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">模板库</h3>
                    <p className="text-sm text-muted-foreground">使用预设模板快速开始</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/materials">
              <Card className="card-hover glass-card cursor-pointer group h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg group-hover:scale-105 transition-transform">
                    <LuImage className="w-[22px] h-[22px] text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">素材库</h3>
                    <p className="text-sm text-muted-foreground">管理图片和视频素材</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* 最近项目列表 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">最近项目</h2>
            {projects.length > 5 && (
              <Link href="/projects" className="text-sm text-primary hover:underline">
                查看全部
              </Link>
            )}
          </div>
          
          {recentProjects.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <LuFileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">还没有项目</p>
                <Link href="/project/new">
                  <Button className="mt-4" size="sm">
                    <LuPlus className="w-4 h-4 mr-2" />
                    创建第一个项目
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <Link key={project.id} href={`/project/${project.id}`}>
                  <Card className="card-hover glass-card cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <LuFilm className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium">{project.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {project.productName && (
                              <span className="text-xs text-muted-foreground">{project.productName}</span>
                            )}
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${statusMap[project.status]?.color || "bg-zinc-500/20 text-zinc-400"}`}
                            >
                              {statusMap[project.status]?.label || project.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LuClock className="w-4 h-4" />
                        <span>{new Date(project.updatedAt).toLocaleDateString("zh-CN")}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
