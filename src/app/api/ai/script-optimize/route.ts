import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// ==================== 类型定义 ====================

/** 优化方向 */
type OptimizeDirection =
  | "engagement"
  | "clarity"
  | "emotion"
  | "humor"
  | "professional";

/** LLM 配置（兼容 OpenAI 格式） */
interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

// ==================== 优化方向映射 ====================

const DIRECTION_NAME_MAP: Record<OptimizeDirection, string> = {
  engagement: "提高互动率",
  clarity: "提高清晰度",
  emotion: "增加情感",
  humor: "增加幽默",
  professional: "更专业",
};

const VALID_DIRECTIONS = Object.keys(
  DIRECTION_NAME_MAP,
) as OptimizeDirection[];

// ==================== 优化方向 Prompt 指令 ====================

const DIRECTION_DIRECTIVES: Record<OptimizeDirection, string> = {
  engagement: `【优化目标：提高互动率】
优化策略：
1. 增加提问式语句，引导观众在评论区回答（如"你们觉得呢？""评论区告诉我"）
2. 加入投票/选择式互动（如"选A还是B？""扣1还是扣2？"）
3. 使用悬念钩子，让观众忍不住看完（如"最后一点最重要""看到最后有惊喜"）
4. 加入号召行动的引导（如"点赞收藏不迷路""关注我下期更精彩"）
5. 适当加入争议性观点引发讨论
优化重点：互动引导密度、悬念设置、行动号召的自然度`,

  clarity: `【优化目标：提高清晰度】
优化策略：
1. 重新组织逻辑结构，使用"第一、第二、第三"或"首先、然后、最后"的明确层次
2. 去除冗余表达，每句话只传达一个核心信息
3. 用具体数字替代模糊描述（如"很快"→"3秒内"、"很便宜"→"只要29元"）
4. 专业术语替换为通俗易懂的口语表达
5. 增加过渡衔接句，让段落之间逻辑更流畅
优化重点：信息层次、语言简洁度、逻辑连贯性`,

  emotion: `【优化目标：增加情感】
优化策略：
1. 加入具体的生活场景和细节描写，引发情感共鸣
2. 使用感官化语言（视觉、听觉、触觉），让观众有画面感
3. 增加情感起伏：先制造痛点/焦虑，再给出希望/解决方案
4. 用第一人称故事或用户故事增加真实感和代入感
5. 适当使用感叹、反问等修辞手法强化情感表达
优化重点：情感共鸣点、场景代入感、情绪曲线的起伏`,

  humor: `【优化目标：增加幽默】
优化策略：
1. 加入反差/反转：先铺垫一个预期，再出其不意反转
2. 使用夸张手法：对产品效果进行适度夸张的描述
3. 融入网络热梗和流行语，增加亲切感和趣味性
4. 自嘲式幽默：用轻松自嘲的方式拉近与观众距离
5. 节奏控制：在关键笑点处留白或停顿，增强喜剧效果
注意：幽默要自然融入，不能强行搞笑，保持内容的核心价值传达`,

  professional: `【优化目标：更专业】
优化策略：
1. 加入行业数据和权威引用，增强可信度
2. 使用专业术语但配以通俗解释，体现专业又不疏远
3. 增加对比分析：与竞品、与行业标准的客观对比
4. 补充产品技术原理的简要说明，让观众理解"为什么好"
5. 使用成分/材质/工艺等专业维度的解读
优化重点：数据支撑、专业背书、客观理性、技术深度`,
};

// ==================== System Prompt ====================

const SYSTEM_PROMPT = `你是一位顶级电商短视频/直播口播文案优化专家，拥有以下专业能力：

【身份背景】
- 5年抖音/快手/小红书电商内容创作与优化经验
- 精通短视频文案的转化率优化、用户心理洞察
- 擅长在保留原文核心卖点和信息的前提下，针对特定方向进行精准优化

【优化原则】
1. 保留原意：优化后的脚本必须保留原始脚本的核心卖点和关键信息
2. 自然流畅：优化后的文案要像真人说话，口语化，不生硬
3. 精准优化：严格围绕指定的优化方向进行优化，不偏离目标
4. 有据可依：每条优化建议都要说明具体改了什么、为什么这么改
5. 字数合理：优化后的脚本字数与原始脚本大致相当（允许±20%浮动）

【输出要求】
你必须严格按照指定的 JSON 格式输出，不要输出任何额外的解释文字。`;

// ==================== 输出格式 Prompt ====================

const OUTPUT_FORMAT_PROMPT = `【输出格式要求】
请严格按照以下 JSON 格式输出，不要包含任何 markdown 代码块标记或额外文字：

{
  "optimizedScript": "优化后的完整口播脚本文案（可直接用于拍摄/直播）",
  "suggestions": [
    {
      "id": 1,
      "type": "优化类型（如：互动引导/逻辑重构/情感渲染/幽默添加/专业补充）",
      "original": "原始文案中的相关片段",
      "optimized": "优化后的对应片段",
      "reason": "为什么这样改（简要说明优化逻辑和预期效果）",
      "impact": "高/中/低"
    }
  ],
  "summary": "整体优化总结（100字以内，概括主要优化方向和效果）",
  "metrics": {
    "wordCountOriginal": 原始脚本字数,
    "wordCountOptimized": 优化后脚本字数,
    "changeRatio": "变化比例（如 +5%、-3%）"
  }
}

字段规则：
- optimizedScript: 完整优化后的口播文案，口语化，可直接使用
- suggestions: 3-8条具体的优化建议，每条都是一个独立的优化点
- suggestions.id: 从1开始递增
- suggestions.type: 简洁的优化类型标签
- suggestions.original: 对应原始脚本中的片段（若为新增内容则标注"新增"）
- suggestions.optimized: 优化后的片段
- suggestions.reason: 解释优化的逻辑和预期带来的效果
- suggestions.impact: 该优化对目标的影响力评估
- summary: 用1-2句话总结优化效果
- metrics: 字数统计和变化比例
`;

// ==================== Prompt 构建 ====================

function buildUserPrompt(input: {
  script: string;
  direction: OptimizeDirection;
  context?: string;
}): string {
  const directionName = DIRECTION_NAME_MAP[input.direction];
  const directive = DIRECTION_DIRECTIVES[input.direction];

  return `请对以下口播脚本进行「${directionName}」优化：

【原始脚本】
${input.script}

${directive}

${input.context ? `【补充背景信息】\n${input.context}\n` : ""}
${OUTPUT_FORMAT_PROMPT}

请根据以上优化策略对原始脚本进行精准优化，确保优化后的脚本保留核心卖点，同时在「${directionName}」维度上有明显提升。`;
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
 * POST /api/ai/script-optimize
 *
 * AI 脚本优化 API
 *
 * 请求体：
 * - script: string              原始脚本文案（必填）
 * - direction: OptimizeDirection 优化方向（必填，5选1）
 * - context?: string            补充背景信息（可选，如商品信息、目标受众等）
 * - llmConfig: LLMConfig         LLM 配置（必填）
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const { script, direction, context, llmConfig } = body as {
    script?: string;
    direction?: string;
    context?: string;
    llmConfig?: LLMConfig;
  };

  // ===== 参数校验 =====

  if (!script || typeof script !== "string") {
    return NextResponse.json(
      { error: "请填写原始脚本内容（script）" },
      { status: 400 },
    );
  }

  if (script.trim().length < 10) {
    return NextResponse.json(
      { error: "脚本内容过短，至少需要 10 个字符" },
      { status: 400 },
    );
  }

  if (!direction || !VALID_DIRECTIONS.includes(direction as OptimizeDirection)) {
    return NextResponse.json(
      {
        error: `请指定优化方向（direction），可选值：${VALID_DIRECTIONS.map(
          (d) => `${d}（${DIRECTION_NAME_MAP[d]}）`,
        ).join("、")}`,
      },
      { status: 400 },
    );
  }

  if (!llmConfig?.baseUrl || !llmConfig?.apiKey || !llmConfig?.model) {
    return NextResponse.json(
      {
        error:
          "请配置 LLM 参数（llmConfig.baseUrl、llmConfig.apiKey、llmConfig.model）",
      },
      { status: 400 },
    );
  }

  // ===== 调用 LLM 优化脚本 =====

  try {
    const client = createClient(llmConfig);

    const userPrompt = buildUserPrompt({
      script: script.trim(),
      direction: direction as OptimizeDirection,
      context: context?.trim(),
    });

    const response = await client.chat.completions.create({
      model: llmConfig.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM 未返回有效内容");
    }

    // 提取并解析 JSON
    const jsonStr = extractJSON(content);
    let parsed: Record<string, unknown>;

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error(
        `LLM 返回的内容不是合法 JSON: ${jsonStr.substring(0, 300)}`,
      );
    }

    // 补充元信息
    const result = {
      ...parsed,
      meta: {
        direction,
        directionName: DIRECTION_NAME_MAP[direction as OptimizeDirection],
        originalLength: script.trim().length,
        model: llmConfig.model,
        optimizedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("脚本优化失败:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `脚本优化失败: ${errMsg}` },
      { status: 500 },
    );
  }
}
