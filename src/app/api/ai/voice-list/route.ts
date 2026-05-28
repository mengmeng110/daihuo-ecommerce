/**
 * TTS 音色列表 API 路由
 *
 * GET /api/ai/voice-list
 *
 * 返回硅基流动 CosyVoice 所有可用 TTS 音色列表
 * 支持按语言 / 性别 / 风格筛选
 *
 * Query Parameters:
 *   language  - 语言筛选：zh / en / ja / ko / multi（多语言）
 *   gender    - 性别筛选：male / female
 *   style     - 风格筛选：gentle / energetic / professional / dialect / presenter ...
 *   model     - 模型筛选：cosyvoice2 / cosyvoice（默认返回全部）
 *   provider  - 供应商筛选：siliconflow（默认，预留扩展）
 *
 * 响应格式：
 * {
 *   voices: VoiceItem[],
 *   total: number,
 *   languages: string[],
 *   genders: string[],
 *   styles: string[],
 *   models: string[]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

// ==================== 类型定义 ====================

/** 性别 */
type VoiceGender = 'male' | 'female';

/** 音色条目 */
interface VoiceItem {
  /** 音色 ID（用于 TTS API 的 voice 参数） */
  id: string;
  /** 音色显示名称 */
  name: string;
  /** 性别 */
  gender: VoiceGender;
  /** 风格标签 */
  style: string;
  /** 风格描述 */
  styleDescription: string;
  /** 支持的语言（ISO-639-1 代码） */
  languages: string[];
  /** 音色预览音频 URL */
  previewUrl: string;
  /** 所属模型 */
  model: string;
  /** 供应商 */
  provider: string;
  /** 音色标签（用于前端展示/搜索） */
  tags: string[];
  /** 音色简介 */
  description: string;
}

// ==================== 硅基流动 CosyVoice 音色数据 ====================

/**
 * 硅基流动 CosyVoice 预置音色列表
 *
 * 基于 FunAudioLLM/CosyVoice2-0.5B 和 CosyVoice 模型
 * 数据来源：硅基流动官方文档 + 项目已使用音色
 * 更新日期：2025-07
 *
 * 音色 ID 命名规则：
 *   - CosyVoice2 预置音色：直接使用 voice ID 如 "female-tianmei"
 *   - CosyVoice2 克隆音色：格式为 "clone_xxx:custom"
 *   - CosyVoice 旧版音色：使用 "male-xxx" / "female-xxx" 前缀
 */
const COSYVOICE_VOICES: VoiceItem[] = [
  // ==================== 中文女声 ====================
  {
    id: 'female-tianmei',
    name: '甜美女声',
    gender: 'female',
    style: 'sweet',
    styleDescription: '甜美可爱，亲和力强',
    languages: ['zh'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/female-tianmei.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['甜美', '可爱', '亲切', '带货', '直播'],
    description: '适合电商带货、直播解说、社交媒体短视频，语调甜美亲切',
  },
  {
    id: 'female-wenyi',
    name: '文艺女声',
    gender: 'female',
    style: 'gentle',
    styleDescription: '温柔文艺，清新自然',
    languages: ['zh'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/female-wenyi.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['温柔', '文艺', '清新', '有声书', '情感'],
    description: '适合有声读物、情感故事、文艺类内容配音',
  },
  {
    id: 'female-dianya',
    name: '典雅女声',
    gender: 'female',
    style: 'elegant',
    styleDescription: '典雅大气，端庄知性',
    languages: ['zh'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/female-dianya.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['典雅', '大气', '知性', '新闻', '商务'],
    description: '适合新闻播报、商务宣传、纪录片解说',
  },
  {
    id: 'female-shaonv',
    name: '少女音',
    gender: 'female',
    style: 'lively',
    styleDescription: '活泼少女，元气满满',
    languages: ['zh'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/female-shaonv.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['少女', '活泼', '元气', '二次元', '游戏'],
    description: '适合二次元、游戏解说、年轻化内容',
  },
  {
    id: 'female-yujie',
    name: '御姐音',
    gender: 'female',
    style: 'professional',
    styleDescription: '成熟御姐，自信从容',
    languages: ['zh'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/female-yujie.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['御姐', '成熟', '自信', '职场', '商务'],
    description: '适合职场剧配音、商务讲解、知识分享',
  },
  {
    id: 'female-sichuan',
    name: '四川辣妹',
    gender: 'female',
    style: 'dialect',
    styleDescription: '四川方言，热情火辣',
    languages: ['zh'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/female-sichuan.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['四川话', '方言', '热情', '搞笑', '接地气'],
    description: '适合方言类内容、地方文化推广、搞笑短视频',
  },

  // ==================== 中文男声 ====================
  {
    id: 'male-qn-jingying',
    name: '精英男声',
    gender: 'male',
    style: 'professional',
    styleDescription: '商务精英，沉稳专业',
    languages: ['zh'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/male-qn-jingying.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['精英', '专业', '沉稳', '商务', '科技'],
    description: '适合科技数码、商业分析、专业讲解类内容',
  },
  {
    id: 'male-qn-badao',
    name: '霸道男声',
    gender: 'male',
    style: 'energetic',
    styleDescription: '霸气外露，力量感强',
    languages: ['zh'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/male-qn-badao.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['霸气', '力量', '热血', '体育', '游戏'],
    description: '适合体育解说、游戏宣传、热血类内容',
  },
  {
    id: 'male-dongbei',
    name: '东北老铁',
    gender: 'male',
    style: 'dialect',
    styleDescription: '东北方言，幽默风趣',
    languages: ['zh'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/male-dongbei.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['东北话', '方言', '幽默', '搞笑', '接地气'],
    description: '适合喜剧、搞笑短视频、方言类内容',
  },

  // ==================== 主持人音色 ====================
  {
    id: 'presenter_male',
    name: '男主持人',
    gender: 'male',
    style: 'presenter',
    styleDescription: '字正腔圆，播音级质感',
    languages: ['zh'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/presenter_male.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['播音', '主持', '专业', '新闻', '正式'],
    description: '适合新闻播报、正式场合、纪录片旁白',
  },
  {
    id: 'presenter_female',
    name: '女主持人',
    gender: 'female',
    style: 'presenter',
    styleDescription: '端庄优雅，播音腔标准',
    languages: ['zh'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/presenter_female.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['播音', '主持', '优雅', '新闻', '正式'],
    description: '适合新闻播报、节目主持、正式宣传',
  },

  // ==================== 英文音色 ====================
  {
    id: 'female-en-01',
    name: 'Sarah (美式女声)',
    gender: 'female',
    style: 'gentle',
    styleDescription: '温柔自然的美式英语女声',
    languages: ['en'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/female-en-01.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['English', 'American', 'gentle', 'natural'],
    description: 'Natural American English female voice, suitable for narration and e-learning',
  },
  {
    id: 'female-en-02',
    name: 'Emma (英式女声)',
    gender: 'female',
    style: 'elegant',
    styleDescription: '优雅的英式英语女声',
    languages: ['en'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/female-en-02.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['English', 'British', 'elegant', 'professional'],
    description: 'Elegant British English female voice, suitable for audiobooks and presentations',
  },
  {
    id: 'male-en-01',
    name: 'Alex (美式男声)',
    gender: 'male',
    style: 'professional',
    styleDescription: '清晰自信的美式英语男声',
    languages: ['en'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/male-en-01.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['English', 'American', 'professional', 'clear'],
    description: 'Clear American English male voice, suitable for business presentations and tutorials',
  },
  {
    id: 'male-en-02',
    name: 'James (英式男声)',
    gender: 'male',
    style: 'elegant',
    styleDescription: '深沉的英式英语男声',
    languages: ['en'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/male-en-02.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['English', 'British', 'deep', 'narrator'],
    description: 'Deep British English male voice, suitable for documentaries and audiobooks',
  },

  // ==================== 日语音色 ====================
  {
    id: 'female-ja-01',
    name: 'さくら (日语女声)',
    gender: 'female',
    style: 'sweet',
    styleDescription: '温柔的日语女声',
    languages: ['ja'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/female-ja-01.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['日本語', 'やさしい', 'アニメ', 'ナレーション'],
    description: '日本語の女性ボイス。アニメ、ナレーション、教材に最適',
  },
  {
    id: 'male-ja-01',
    name: '大輝 (日语男声)',
    gender: 'male',
    style: 'professional',
    styleDescription: '沉稳的日语男声',
    languages: ['ja'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/male-ja-01.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['日本語', 'ビジネス', 'プロ', 'ニュース'],
    description: '日本語の男性ボイス。ビジネス、ニュース、プレゼンテーションに最適',
  },

  // ==================== 韩语音色 ====================
  {
    id: 'female-ko-01',
    name: '수진 (韩语女声)',
    gender: 'female',
    style: 'sweet',
    styleDescription: '清新的韩语女声',
    languages: ['ko'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/female-ko-01.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['한국어', '여성', '밝은', '내레이션'],
    description: '한국어 여성 보이스. 내레이션, 교육, 콘텐츠 제작에 적합',
  },
  {
    id: 'male-ko-01',
    name: '민수 (韩语男声)',
    gender: 'male',
    style: 'professional',
    styleDescription: '沉稳的韩语男声',
    languages: ['ko'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/male-ko-01.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['한국어', '남성', '비즈니스', '뉴스'],
    description: '한국어 남성 보이스. 비즈니스, 뉴스, 프레젠테이션에 적합',
  },

  // ==================== 多语言音色（支持中英混合） ====================
  {
    id: 'female-zh-en',
    name: '中英混合女声',
    gender: 'female',
    style: 'professional',
    styleDescription: '自然的中英文混合发音',
    languages: ['zh', 'en'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/female-zh-en.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['中英混合', '双语', '专业', '科技', '国际'],
    description: '适合中英文混合场景，如科技测评、跨境电商、国际化内容',
  },
  {
    id: 'male-zh-en',
    name: '中英混合男声',
    gender: 'male',
    style: 'professional',
    styleDescription: '自然的中英文混合发音',
    languages: ['zh', 'en'],
    previewUrl: 'https://cdn.siliconflow.cn/audio/previews/male-zh-en.mp3',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    provider: 'siliconflow',
    tags: ['中英混合', '双语', '专业', '商务', '国际化'],
    description: '适合中英文混合场景，如商务汇报、技术教程、跨国沟通',
  },
];

// ==================== 风格分类映射 ====================

const STYLE_LABELS: Record<string, string> = {
  sweet: '甜美可爱',
  gentle: '温柔文艺',
  elegant: '典雅知性',
  lively: '活泼元气',
  professional: '专业商务',
  energetic: '霸气力量',
  dialect: '方言特色',
  presenter: '播音主持',
};

// ==================== API 路由 ====================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // 筛选参数
    const language = searchParams.get('language')?.trim().toLowerCase();
    const gender = searchParams.get('gender')?.trim().toLowerCase() as VoiceGender | null;
    const style = searchParams.get('style')?.trim().toLowerCase();
    const model = searchParams.get('model')?.trim().toLowerCase();
    const provider = searchParams.get('provider')?.trim().toLowerCase();

    // 记录所有可用的筛选项（在过滤前计算）
    const allLanguages = [...new Set(COSYVOICE_VOICES.flatMap((v) => v.languages))].sort();
    const allGenders = [...new Set(COSYVOICE_VOICES.map((v) => v.gender))].sort();
    const allStyles = [...new Set(COSYVOICE_VOICES.map((v) => v.style))].sort();
    const allModels = [...new Set(COSYVOICE_VOICES.map((v) => v.model))].sort();

    // 逐一筛选
    let voices = [...COSYVOICE_VOICES];

    if (language) {
      voices = voices.filter((v) => v.languages.includes(language));
    }

    if (gender && (gender === 'male' || gender === 'female')) {
      voices = voices.filter((v) => v.gender === gender);
    }

    if (style) {
      voices = voices.filter((v) => v.style === style);
    }

    if (model) {
      voices = voices.filter((v) => v.model.toLowerCase().includes(model));
    }

    if (provider) {
      voices = voices.filter((v) => v.provider === provider);
    }

    return NextResponse.json({
      success: true,
      voices,
      total: voices.length,
      filters: {
        languages: allLanguages,
        genders: allGenders,
        styles: allStyles.map((s) => ({
          key: s,
          label: STYLE_LABELS[s] || s,
        })),
        models: allModels,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '获取音色列表失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
