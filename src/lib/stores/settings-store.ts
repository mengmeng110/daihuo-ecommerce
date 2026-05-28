import { create } from "zustand";
import { persist } from "zustand/middleware";

// AI Provider 配置
export interface ProviderSetting {
  enabled: boolean;
  apiKey: string;
  baseUrl?: string;
}

// LLM 配置
export interface LLMSetting {
  provider: string; // 自定义名称
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel?: string; // 视觉分析模型
}

// 默认初始状态
const DEFAULT_SETTINGS = {
  providers: {
    "atlas-cloud": { enabled: false, apiKey: "" },
    "fal-ai": { enabled: false, apiKey: "" },
    volcengine: { enabled: false, apiKey: "" },
    alibaba: { enabled: false, apiKey: "" },
    siliconflow: { enabled: false, apiKey: "" },
  } as Record<string, ProviderSetting>,
  llm: {
    provider: "",
    baseUrl: "",
    apiKey: "",
    model: "",
    visionModel: "",
  } as LLMSetting,
  defaultImageModel: "",
  defaultVideoModel: "",
  defaultResolution: "1080p" as "720p" | "1080p",
  defaultAspectRatio: "9:16" as "9:16" | "16:9" | "1:1",
};

interface SettingsState {
  // AI 平台配置
  providers: Record<string, ProviderSetting>;
  // LLM 配置
  llm: LLMSetting;
  // 默认生图模型
  defaultImageModel: string;
  // 默认生视频模型
  defaultVideoModel: string;
  // 默认分辨率
  defaultResolution: "720p" | "1080p";
  // 默认画面比例
  defaultAspectRatio: "9:16" | "16:9" | "1:1";

  // Actions
  setProvider: (name: string, setting: ProviderSetting) => void;
  setLLM: (llm: LLMSetting) => void;
  setDefaultImageModel: (model: string) => void;
  setDefaultVideoModel: (model: string) => void;
  setDefaultResolution: (resolution: "720p" | "1080p") => void;
  setDefaultAspectRatio: (ratio: "9:16" | "16:9" | "1:1") => void;
  // 新增：重置为默认 / 导入导出
  resetToDefaults: () => void;
  importSettings: (data: Partial<SettingsState>) => void;
  exportSettings: () => Omit<SettingsState, "setProvider" | "setLLM" | "setDefaultImageModel" | "setDefaultVideoModel" | "setDefaultResolution" | "setDefaultAspectRatio" | "resetToDefaults" | "importSettings" | "exportSettings">;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providers: {
        "atlas-cloud": { enabled: false, apiKey: "" },
        "fal-ai": { enabled: false, apiKey: "" },
        volcengine: { enabled: false, apiKey: "" },
        alibaba: { enabled: false, apiKey: "" },
        siliconflow: { enabled: false, apiKey: "" },
      },
      llm: {
        provider: "",
        baseUrl: "",
        apiKey: "",
        model: "",
        visionModel: "",
      },
      defaultImageModel: "",
      defaultVideoModel: "",
      defaultResolution: "1080p",
      defaultAspectRatio: "9:16",

      setProvider: (name, setting) =>
        set((state) => ({
          providers: { ...state.providers, [name]: setting },
        })),
      setLLM: (llm) => set({ llm }),
      setDefaultImageModel: (model) => set({ defaultImageModel: model }),
      setDefaultVideoModel: (model) => set({ defaultVideoModel: model }),
      setDefaultResolution: (resolution) => set({ defaultResolution: resolution }),
      setDefaultAspectRatio: (ratio) => set({ defaultAspectRatio: ratio }),
      resetToDefaults: () =>
        set({
          providers: { ...DEFAULT_SETTINGS.providers },
          llm: { ...DEFAULT_SETTINGS.llm },
          defaultImageModel: DEFAULT_SETTINGS.defaultImageModel,
          defaultVideoModel: DEFAULT_SETTINGS.defaultVideoModel,
          defaultResolution: DEFAULT_SETTINGS.defaultResolution,
          defaultAspectRatio: DEFAULT_SETTINGS.defaultAspectRatio,
        }),
      importSettings: (data) =>
        set((state) => ({
          providers: data.providers ?? state.providers,
          llm: data.llm ?? state.llm,
          defaultImageModel: data.defaultImageModel ?? state.defaultImageModel,
          defaultVideoModel: data.defaultVideoModel ?? state.defaultVideoModel,
          defaultResolution: data.defaultResolution ?? state.defaultResolution,
          defaultAspectRatio: data.defaultAspectRatio ?? state.defaultAspectRatio,
        })),
      exportSettings: () => {
        const state = useSettingsStore.getState();
        return {
          providers: state.providers,
          llm: state.llm,
          defaultImageModel: state.defaultImageModel,
          defaultVideoModel: state.defaultVideoModel,
          defaultResolution: state.defaultResolution,
          defaultAspectRatio: state.defaultAspectRatio,
        };
      },
    }),
    {
      name: "daihuo-jianshou-settings",
    }
  )
);
