import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Shot, CharacterVoiceProfile } from "@/lib/db/schema";

// ==================== 人物/角色 ====================

export interface Character {
  id: string;
  name: string;
  description?: string;
  /** 外貌特征描述（英文，用于注入 AI prompt） */
  appearance?: string;
  /** 参考图 URL 列表 */
  referenceImages: string[];
  /** 声音偏好 */
  voiceProfile?: CharacterVoiceProfile;
  /** 是否为默认出镜人物 */
  isDefault?: boolean;
}

// ==================== 项目状态 ====================

/**
 * 项目生命周期状态（对齐流水线阶段）
 *
 * 流转路径：
 *   draft → script → storyboard → generating → video → done
 *                                                          ↘ failed（任何阶段均可）
 */
export type ProjectStatus =
  | "draft" // 刚创建，未开始
  | "script" // 脚本撰写中
  | "storyboard" // 分镜编排中
  | "generating" // AI 素材生成中（图片/视频）
  | "video" // 合成视频中
  | "done" // 完成
  | "failed"; // 失败

/** 合法的状态流转映射：当前状态 → 允许流转到的下一状态列表 */
const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["script", "failed"],
  script: ["storyboard", "draft", "failed"],
  storyboard: ["generating", "script", "failed"],
  generating: ["video", "storyboard", "failed"],
  video: ["done", "failed", "generating"],
  done: [], // 终态
  failed: ["draft", "script", "generating"], // 允许重试/回退
};

/** 状态流转是否合法 */
export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ==================== 项目 UI 步骤 ====================

export type Step = "upload" | "script" | "storyboard" | "assets" | "video" | "export";

// ==================== 项目模型 ====================

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  productName?: string;
  productCategory?: string;
  productDescription?: string;
  productImages: string[];
  productAnalysis?: string;
  /** 关联商品库 ID */
  productId?: string;
  /** 关联品牌设置 ID */
  brandId?: string;
  /** 使用的脚本模板 ID */
  templateId?: string;
  /** 视频模式 */
  videoMode?: "product_closeup" | "graphic_montage" | "scene_demo" | "live_presenter";
  /** 来源类型：手动创建 / 爆款复刻 */
  sourceType?: "manual" | "clone";
  /** 爆款复刻来源视频 URL */
  sourceVideoUrl?: string;
  /** 项目绑定的出镜人物 */
  characterId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Script {
  id: string;
  projectId: string;
  version: number;
  styleType: string;
  title?: string;
  totalDuration?: number;
  shots: Shot[];
  selected: boolean;
}

// ==================== 创建项目参数 ====================

export type CreateProjectInput = Pick<Project, "name"> &
  Partial<
    Pick<
      Project,
      | "productName"
      | "productCategory"
      | "productDescription"
      | "productImages"
      | "productAnalysis"
      | "productId"
      | "brandId"
      | "templateId"
      | "videoMode"
      | "sourceType"
      | "sourceVideoUrl"
      | "characterId"
    >
  >;

// ==================== 排序选项 ====================

export type SortField = "name" | "status" | "createdAt" | "updatedAt";
export type SortOrder = "asc" | "desc";

export interface SortOption {
  field: SortField;
  order: SortOrder;
}

// ==================== Store 接口 ====================

interface ProjectState {
  // ---- 数据 ----
  projects: Project[];
  currentProject: Project | null;
  currentStep: Step;
  /** 当前项目使用的人物 */
  currentCharacter: Character | null;

  // ---- 筛选 / 搜索 / 排序 ----
  searchQuery: string;
  filterStatus: ProjectStatus | "all";
  sortOption: SortOption;

  // ---- CRUD Actions ----
  /** 创建项目，自动生成 id/时间戳，状态默认 draft */
  addProject: (input: CreateProjectInput) => Project;
  /** 按 ID 读取 */
  getProject: (id: string) => Project | undefined;
  /** 按 ID 更新部分字段，自动刷新 updatedAt */
  updateProjectById: (id: string, updates: Partial<Omit<Project, "id" | "createdAt">>) => void;
  /** 按 ID 删除 */
  removeProject: (id: string) => void;
  /** 批量删除 */
  removeProjects: (ids: string[]) => void;

  // ---- 状态流转 ----
  /** 推进项目状态，校验合法性 */
  transitionStatus: (id: string, to: ProjectStatus) => boolean;

  // ---- 兼容旧 API ----
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setCurrentStep: (step: Step) => void;
  updateProject: (updates: Partial<Project>) => void;
  setCurrentCharacter: (character: Character | null) => void;

  // ---- 搜索 / 筛选 / 排序 ----
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: ProjectStatus | "all") => void;
  setSortOption: (option: SortOption) => void;
  /** 获取经过筛选、搜索、排序后的项目列表 */
  getFilteredProjects: () => Project[];
}

// ==================== 辅助函数 ====================

function generateId(): string {
  // 兼容 SSR / 非安全上下文
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ==================== Store 实现 ====================

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // ---- 初始值 ----
      projects: [],
      currentProject: null,
      currentStep: "upload",
      currentCharacter: null,
      searchQuery: "",
      filterStatus: "all",
      sortOption: { field: "updatedAt", order: "desc" },

      // ---- CRUD ----
      addProject: (input) => {
        const now = new Date();
        const project: Project = {
          id: generateId(),
          name: input.name,
          status: "draft",
          productName: input.productName,
          productCategory: input.productCategory,
          productDescription: input.productDescription,
          productImages: input.productImages ?? [],
          productAnalysis: input.productAnalysis,
          productId: input.productId,
          brandId: input.brandId,
          templateId: input.templateId,
          videoMode: input.videoMode,
          sourceType: input.sourceType,
          sourceVideoUrl: input.sourceVideoUrl,
          characterId: input.characterId,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ projects: [project, ...state.projects] }));
        return project;
      },

      getProject: (id) => get().projects.find((p) => p.id === id),

      updateProjectById: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
          // 同步 currentProject
          currentProject:
            state.currentProject?.id === id
              ? { ...state.currentProject, ...updates, updatedAt: new Date() }
              : state.currentProject,
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject:
            state.currentProject?.id === id ? null : state.currentProject,
        })),

      removeProjects: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({
          projects: state.projects.filter((p) => !idSet.has(p.id)),
          currentProject:
            state.currentProject && idSet.has(state.currentProject.id)
              ? null
              : state.currentProject,
        }));
      },

      // ---- 状态流转 ----
      transitionStatus: (id, to) => {
        const project = get().projects.find((p) => p.id === id);
        if (!project) return false;
        if (!canTransition(project.status, to)) return false;

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, status: to, updatedAt: new Date() } : p
          ),
          currentProject:
            state.currentProject?.id === id
              ? { ...state.currentProject, status: to, updatedAt: new Date() }
              : state.currentProject,
        }));
        return true;
      },

      // ---- 兼容旧 API ----
      setCurrentProject: (project) => set({ currentProject: project }),
      setProjects: (projects) => set({ projects }),
      setCurrentStep: (step) => set({ currentStep: step }),
      updateProject: (updates) =>
        set((state) => ({
          currentProject: state.currentProject
            ? { ...state.currentProject, ...updates }
            : null,
          projects: state.currentProject
            ? state.projects.map((p) =>
                p.id === state.currentProject!.id
                  ? { ...p, ...updates }
                  : p
              )
            : state.projects,
        })),
      setCurrentCharacter: (character) => set({ currentCharacter: character }),

      // ---- 搜索 / 筛选 / 排序 ----
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterStatus: (status) => set({ filterStatus: status }),
      setSortOption: (option) => set({ sortOption: option }),

      getFilteredProjects: () => {
        const { projects, searchQuery, filterStatus, sortOption } = get();

        // 1) 筛选状态
        let result =
          filterStatus === "all"
            ? projects
            : projects.filter((p) => p.status === filterStatus);

        // 2) 搜索（匹配 name / productName / productCategory / productDescription）
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          result = result.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.productName?.toLowerCase().includes(q) ||
              p.productCategory?.toLowerCase().includes(q) ||
              p.productDescription?.toLowerCase().includes(q)
          );
        }

        // 3) 排序
        const { field, order } = sortOption;
        const dir = order === "asc" ? 1 : -1;
        result = [...result].sort((a, b) => {
          if (field === "name") {
            return dir * a.name.localeCompare(b.name, "zh-CN");
          }
          if (field === "status") {
            // 按流水线顺序排
            const orderMap: Record<ProjectStatus, number> = {
              draft: 0,
              script: 1,
              storyboard: 2,
              generating: 3,
              video: 4,
              done: 5,
              failed: 6,
            };
            return dir * (orderMap[a.status] - orderMap[b.status]);
          }
          // createdAt / updatedAt
          const aTime = a[field].getTime();
          const bTime = b[field].getTime();
          return dir * (aTime - bTime);
        });

        return result;
      },
    }),
    {
      name: "daihuo-jianshou-projects",
      // 只持久化数据字段，不持久化 UI 状态和派生数据
      partialize: (state) => ({
        projects: state.projects,
      }),
      // 反序列化时将字符串日期转回 Date 对象
      merge: (persisted, current) => {
        const merged = persisted as { projects?: Project[] };
        const projects = (merged.projects ?? []).map((p) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        }));
        return { ...current, projects };
      },
    }
  )
);

// ==================== 人物库 Store（持久化） ====================

interface CharacterState {
  characters: Character[];
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
  getDefault: () => Character | undefined;
  /** 将指定人物设为默认，同时取消其他人物的默认状态 */
  setDefault: (id: string) => void;
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      characters: [],

      addCharacter: (character) =>
        set((state) => ({ characters: [...state.characters, character] })),

      updateCharacter: (id, updates) =>
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      removeCharacter: (id) =>
        set((state) => ({
          characters: state.characters.filter((c) => c.id !== id),
        })),

      getDefault: () => get().characters.find((c) => c.isDefault),

      setDefault: (id) =>
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === id
              ? { ...c, isDefault: true }
              : { ...c, isDefault: false }
          ),
        })),
    }),
    { name: "daihuo-jianshou-characters" }
  )
);
