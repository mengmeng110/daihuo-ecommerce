import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// ==================== 类型定义 ====================

/** LLM 配置（兼容 OpenAI 格式） */
interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** 商品输入 */
interface ProductInput {
  name: string;
  category: string;
  price: number;
  targetAudience: string;
  sellingPoints?: string;
  additionalInfo?: string;
}

/** 视频风格推荐项 */
interface VideoStyleRecommendation {
  style: string;
  matchScore: number;
  reason: string;
}

/** 时长建议项 */
interface DurationRecommendation {
  platform: string;
  recommendedDuration: number;
  unit: "seconds" | "minutes";
  reason: string;
}

/** 发布时间推荐项 */
interface PublishTimeRecommendation {
  platform: string;
  bestTime: string;
  bestDay: string;
  reason: string;
}

/** 推荐标题 */
interface TitleRecommendation {
  title: string;
  hook: string;
  targetEmotion: string;
}

/** 推荐 Hook（黄金3秒开头） */
interface HookRecommendation {
  hook: string;
  strategy: string;
  expectedEffect: string;
}

/** 平台推荐项 */
interface PlatformRecommendation {
  platform: string;
  priority: "S" | "A" | "B";
  matchScore: number;
  reason: string;
  audienceOverlap: string;
}

/** 完整推荐结果 */
interface SmartSuggestResult {
  productAnalysis: {
    categoryInsight: string;
    pricePosition: string;
    audienceProfile: string;
  };
  videoStyles: VideoStyleRecommendation[];
  durationSuggestions: DurationRecommendation[];
  publishTimes: PublishTimeRecommendation[];
  titles: TitleRecommendation[];
  hooks: HookRecommendation[];
  platforms: PlatformRecommendation[];
}

// ==================== System Prompt ====================

const SYSTEM_PROMPT = `你是一位顶级电商短视频营销策略师，拥有以下专业能力：

【身份背景】
- 8年电商短视频营销经验，精通抖音、快手、小红书、视频号、B站等全平台运营策略
- 深度理解不同品类商品在短视频平台的爆款规律
- 精通各平台算法推荐机制、用户画像和内容消费习惯
- 累计帮助 1000+ 品牌制定短视频营销策略，总 GMV 超 50 亿

【核心能力】
1. 商品洞察：快速分析商品品类特征、价格定位、目标人群画像
2. 风格匹配：根据商品特性匹配最佳视频风格（痛点种草、场景安利、对比测评、剧情故事、直播口播等）
3. 时长优化：不同平台的最优视频时长建议，基于完播率和转化率数据
4. 发布时机：结合平台流量规律、目标人群活跃时间、品类消费场景推荐最佳发布时间
5. 标题与 Hook：创作高点击率标题和黄金3秒开头，运用心理学驱动点击
6. 平台选择：根据商品特性和目标人群匹配最适合的投放平台

【分析维度】
- 视频风格：考虑品类特征、价格带、目标人群的内容偏好
- 时长建议：不同平台差异巨大，抖音偏短、B站偏长、小红书中等
- 发布时间：工作日 vs 周末、上午 vs 下午 vs 晚间，不同品类有不同黄金时段
- 标题策略：数字型、悬念型、痛点型、利益型、场景型等
- Hook 策略：视觉冲击法、悬念提问法、反差对比法、利益承诺法、情感共鸣法
- 平台策略：抖音（泛流量、年轻用户）、快手（下沉市场、信任经济）、小红书（种草决策、女性用户）、视频号（私域裂变、中年用户）、B站（长内容、Z世代）

【输出要求】
你必须严格按照指定的 JSON 格式输出，不要输出任何额外的解释文字。`;

// ==================== 输出格式 Prompt ====================

const OUTPUT_FORMAT_PROMPT = `【输出格式要求】
请严格按照以下 JSON 格式输出，不要包含任何 markdown 代码块标记或额外文字：

{
  "productAnalysis": {
    "categoryInsight": "品类洞察（该品类在短视频平台的内容趋势和机会点，50字以内）",
    "pricePosition": "价格定位分析（该价位在市场中的竞争力和适合的营销策略，50字以内）",
    "audienceProfile": "目标人群画像（年龄、性别、消费习惯、内容偏好，50字以内）"
  },
  "videoStyles": [
    {
      "style": "视频风格名称",
      "matchScore": 95,
      "reason": "推荐该风格的理由（30字以内）"
    }
  ],
  "durationSuggestions": [
    {
      "platform": "平台名称",
      "recommendedDuration": 30,
      "unit": "seconds",
      "reason": "推荐该时长的理由（30字以内）"
    }
  ],
  "publishTimes": [
    {
      "platform": "平台名称",
      "bestTime": "20:00-22:00",
      "bestDay": "周五、周六",
      "reason": "推荐该时间段的理由（30字以内）"
    }
  ],
  "titles": [
    {
      "title": "视频标题",
      "hook": "标题使用的钩子策略（如：数字冲击、悬念提问）",
      "targetEmotion": "目标激发的情绪（如：好奇、焦虑、向往）"
    }
  ],
  "hooks": [
    {
      "hook": "黄金3秒开头文案（10-15字，极具吸引力）",
      "strategy": "使用的开头策略（如：视觉冲击法、悬念提问法）",
      "expectedEffect": "预期效果描述（20字以内）"
    }
  ],
  "platforms": [
    {
      "platform": "平台名称",
      "priority": "S",
      "matchScore": 95,
      "reason": "推荐该平台的理由（30字以内）",
      "audienceOverlap": "目标人群与平台用户的重叠度描述（20字以内）"
    }
  ]
}

字段规则：
- productAnalysis: 对商品的综合分析，帮助理解后续推荐的背景
- videoStyles: 推荐3-5个视频风格，按匹配度从高到低排序，matchScore范围0-100
- durationSuggestions: 推荐3-4个主要平台的最优时长
- publishTimes: 推荐3-4个主要平台的最佳发布时间段
- titles: 推荐5个高点击率标题，覆盖不同策略类型
- hooks: 推荐3个黄金3秒开头，使用不同策略，必须足够吸睛
- platforms: 推荐3-5个平台，按优先级S>A>B排序，matchScore范围0-100

注意事项：
1. 所有推荐必须基于商品特性和目标人群，不能泛泛而谈
2. 标题和 hook 必须具体到商品，不能是通用模板
3. 发布时间要考虑品类消费场景（如食品类饭前推荐、美妆类晚间推荐）
4. 平台推荐要考虑商品价格带与平台用户消费力的匹配
5. hook 必须在3秒内抓住注意力，不能平淡开场
6. 风格匹配度评分要有区分度，不能所有风格都是高分`;

// ==================== Prompt 构建 ====================

function buildUserPrompt(input: ProductInput): string {
  return `请为以下商品生成短视频营销智能推荐方案：

【商品信息】
- 商品名称：${input.name}
- 商品品类：${input.category}
- 商品价格：¥${input.price}
- 目标人群：${input.targetAudience}
${input.sellingPoints ? `- 核心卖点：${input.sellingPoints}` : ""}
${input.additionalInfo ? `- 补充信息：${input.additionalInfo}` : ""}

请从视频风格、时长建议、发布时间、标题、hook（黄金3秒开头）、目标平台六个维度进行分析和推荐。

${OUTPUT_FORMAT_PROMPT}`;
}

// ==================== 工具函数 ====================

function createClient(config: LLMConfig): OpenAI {
  return new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });
}

/**
 * 从 LLM 返回的文本中提取 JSON
 */
function extractJSON(text: string): string {
  // 移除 markdown 代码块标记
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 找到第一个 { 或 [ 开头的 JSON
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  return text.trim();
}

// ==================== API Route ====================

/**
 * POST /api/ai/smart-suggest
 *
 * AI 智能推荐 API
 *
 * 请求体：
 * - name: string              商品名称（必填）
 * - category: string          商品品类（必填）
 * - price: number             商品价格（必填）
 * - targetAudience: string    目标人群（必填）
 * - sellingPoints?: string    核心卖点（可选）
 * - additionalInfo?: string   补充信息（可选）
 * - llmConfig: LLMConfig      LLM 配置（必填）
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const {
    name,
    category,
    price,
    targetAudience,
    sellingPoints,
    additionalInfo,
    llmConfig,
  } = body as {
    name?: string;
    category?: string;
    price?: number;
    targetAudience?: string;
    sellingPoints?: string;
    additionalInfo?: string;
    llmConfig?: LLMConfig;
  };

  // ===== 参数校验 =====

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "请填写商品名称（name）" }, { status: 400 });
  }

  if (!category || typeof category !== "string") {
    return NextResponse.json({ error: "请填写商品品类（category）" }, { status: 400 });
  }

  if (price === undefined || price === null || typeof price !== "number" || price < 0) {
    return NextResponse.json({ error: "请填写有效的商品价格（price，非负数字）" }, { status: 400 });
  }

  if (!targetAudience || typeof targetAudience !== "string") {
    return NextResponse.json({ error: "请填写目标人群（targetAudience）" }, { status: 400 });
  }

  if (!llmConfig?.baseUrl || !llmConfig?.apiKey || !llmConfig?.model) {
    return NextResponse.json(
      { error: "请配置 LLM 参数（llmConfig.baseUrl、llmConfig.apiKey、llmConfig.model）" },
      { status: 400 },
    );
  }

  // ===== 调用 LLM 生成智能推荐 =====

  try {
    const client = createClient(llmConfig);

    const userPrompt = buildUserPrompt({
      name: name.trim(),
      category: category.trim(),
      price,
      targetAudience: targetAudience.trim(),
      sellingPoints: sellingPoints?.trim(),
      additionalInfo: additionalInfo?.trim(),
    });

    const response = await client.chat.completions.create({
      model: llmConfig.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM 未返回有效内容");
    }

    // 提取并解析 JSON
    const jsonStr = extractJSON(content);
    let parsed: SmartSuggestResult;

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error(`LLM 返回的内容不是合法 JSON: ${jsonStr.substring(0, 300)}`);
    }

    // ===== 校验返回结构 =====

    const errors: string[] = [];

    if (!parsed.productAnalysis || typeof parsed.productAnalysis !== "object") {
      errors.push("缺少 productAnalysis 商品分析");
    }

    if (!Array.isArray(parsed.videoStyles) || parsed.videoStyles.length === 0) {
      errors.push("缺少 videoStyles 视频风格推荐");
    }

    if (!Array.isArray(parsed.durationSuggestions) || parsed.durationSuggestions.length === 0) {
      errors.push("缺少 durationSuggestions 时长建议");
    }

    if (!Array.isArray(parsed.publishTimes) || parsed.publishTimes.length === 0) {
      errors.push("缺少 publishTimes 发布时间推荐");
    }

    if (!Array.isArray(parsed.titles) || parsed.titles.length < 5) {
      errors.push("titles 推荐标题不足 5 个");
    }

    if (!Array.isArray(parsed.hooks) || parsed.hooks.length < 3) {
      errors.push("hooks 推荐 hook 不足 3 个");
    }

    if (!Array.isArray(parsed.platforms) || parsed.platforms.length === 0) {
      errors.push("缺少 platforms 目标平台推荐");
    }

    if (errors.length > 0) {
      throw new Error(`LLM 返回结构不完整：${errors.join("；")}`);
    }

    // ===== 返回结果 =====

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    console.error("[smart-suggest] LLM 调用失败:", message);

    return NextResponse.json(
      { error: `智能推荐生成失败：${message}` },
      { status: 500 },
    );
  }
}
