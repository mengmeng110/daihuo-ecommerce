/**
 * 电商视频模板预设数据
 * 按品类分类：美妆/食品/数码/家居/服饰/母婴/运动/宠物/汽车/直播
 */

export interface TemplateShot {
  name: string;
  duration: number;
  description: string;
  prompt?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  style: string;
  duration: number;
  thumbnail: string;
  previewVideo?: string;
  useCount: number;
  rating?: number;
  tags: string[];
  shots: TemplateShot[];
  /** 推荐设置 */
  recommendedSettings?: {
    aspectRatio?: string;
    resolution?: string;
    fps?: number;
    bgmStyle?: string;
    textStyle?: string;
  };
}

/** 品类分类配置 */
export const categoryOptions = [
  { value: "all", label: "全部品类", icon: "🎬" },
  { value: "beauty", label: "美妆", icon: "💄" },
  { value: "food", label: "食品", icon: "🍜" },
  { value: "digital", label: "数码", icon: "📱" },
  { value: "home", label: "家居", icon: "🏠" },
  { value: "fashion", label: "服饰", icon: "👗" },
  { value: "baby", label: "母婴", icon: "👶" },
  { value: "sports", label: "运动", icon: "🏃" },
  { value: "pet", label: "宠物", icon: "🐱" },
  { value: "auto", label: "汽车", icon: "🚗" },
  { value: "live", label: "直播", icon: "📡" },
];

/** 视频风格配置 */
export const styleOptions = [
  { value: "all", label: "全部风格" },
  { value: "pain-point", label: "痛点种草" },
  { value: "scenario", label: "场景安利" },
  { value: "comparison", label: "对比测评" },
  { value: "story", label: "剧情故事" },
  { value: "tutorial", label: "教程演示" },
  { value: "unboxing", label: "开箱体验" },
  { value: "live-replay", label: "直播切片" },
];

/** 预设模板数据 */
export const presetTemplates: Template[] = [
  // ========== 美妆 ==========
  {
    id: "tpl-beauty-001",
    name: "美妆种草三部曲",
    description: "痛点切入 + 产品展示 + 效果对比，适用于护肤品、彩妆类产品",
    category: "beauty",
    style: "pain-point",
    duration: 30,
    thumbnail: "/templates/beauty-01.jpg",
    useCount: 1286,
    tags: ["爆款", "高转化", "新手推荐"],
    shots: [
      { name: "痛点引入", duration: 5, description: "展示肌肤问题，引发共鸣" },
      { name: "产品展示", duration: 10, description: "展示产品外观和质地" },
      { name: "使用演示", duration: 10, description: "上脸使用过程" },
      { name: "效果对比", duration: 5, description: "使用前后对比" },
    ],
  },
  {
    id: "tpl-beauty-002",
    name: "护肤品成分解析",
    description: "成分科普 + 产品对比 + 选购建议，适用于功效型护肤品",
    category: "beauty",
    style: "tutorial",
    duration: 60,
    thumbnail: "/templates/beauty-02.jpg",
    useCount: 678,
    tags: ["专业", "深度", "成分党"],
    shots: [
      { name: "成分引入", duration: 8, description: "热门成分介绍" },
      { name: "产品对比", duration: 20, description: "多款产品成分对比" },
      { name: "使用演示", duration: 15, description: "正确使用方法" },
      { name: "效果分析", duration: 10, description: "长期使用效果" },
      { name: "选购建议", duration: 7, description: "针对不同肤质推荐" },
    ],
  },
  {
    id: "tpl-beauty-003",
    name: "彩妆教程入门",
    description: "基础妆容 + 产品推荐 + 技巧分享，适用于彩妆套装、单色眼影",
    category: "beauty",
    style: "tutorial",
    duration: 30,
    thumbnail: "/templates/beauty-03.jpg",
    useCount: 1234,
    tags: ["新手", "教程"],
    shots: [
      { name: "妆容预告", duration: 3, description: "今日妆容主题" },
      { name: "底妆步骤", duration: 8, description: "底妆产品使用" },
      { name: "眼妆步骤", duration: 10, description: "眼影眼线教程" },
      { name: "唇妆完成", duration: 6, description: "唇妆和整体效果" },
      { name: "产品清单", duration: 3, description: "使用产品汇总" },
    ],
  },

  // ========== 食品 ==========
  {
    id: "tpl-food-001",
    name: "美食诱惑特写",
    description: "食材特写 + 烹饪过程 + 成品展示，适用于零食、调味品、预制菜",
    category: "food",
    style: "scenario",
    duration: 30,
    thumbnail: "/templates/food-01.jpg",
    useCount: 958,
    tags: ["食欲感", "沉浸式"],
    shots: [
      { name: "食材特写", duration: 8, description: "近距离展示食材新鲜度" },
      { name: "烹饪过程", duration: 12, description: "制作过程快速剪辑" },
      { name: "成品展示", duration: 7, description: "诱人的成品特写" },
      { name: "品尝反应", duration: 3, description: "真实品尝表情" },
    ],
  },
  {
    id: "tpl-food-002",
    name: "零食测评合集",
    description: "多款零食 + 口味测试 + 推荐排名，适用于零食礼盒、新品试吃",
    category: "food",
    style: "comparison",
    duration: 30,
    thumbnail: "/templates/food-02.jpg",
    useCount: 1456,
    tags: ["爆款", "高互动"],
    shots: [
      { name: "零食预告", duration: 3, description: "今日测评主题" },
      { name: "逐个品尝", duration: 18, description: "依次品尝点评" },
      { name: "排名揭晓", duration: 6, description: "最终推荐排名" },
      { name: "购买指南", duration: 3, description: "购买渠道和价格" },
    ],
  },
  {
    id: "tpl-food-003",
    name: "零食开箱试吃",
    description: "包装展示 + 试吃反应 + 口味推荐，适用于进口零食、网红零食",
    category: "food",
    style: "unboxing",
    duration: 15,
    thumbnail: "/templates/food-03.jpg",
    useCount: 1567,
    tags: ["爆款", "食欲"],
    shots: [
      { name: "零食展示", duration: 3, description: "今日试吃零食" },
      { name: "开箱试吃", duration: 8, description: "逐个品尝" },
      { name: "口味总结", duration: 4, description: "推荐排名" },
    ],
  },

  // ========== 数码 ==========
  {
    id: "tpl-digital-001",
    name: "数码产品测评",
    description: "开箱展示 + 功能演示 + 优缺点分析，适用于手机、耳机、平板等",
    category: "digital",
    style: "comparison",
    duration: 60,
    thumbnail: "/templates/digital-01.jpg",
    useCount: 892,
    tags: ["专业", "深度"],
    shots: [
      { name: "产品开箱", duration: 10, description: "包装和配件展示" },
      { name: "外观设计", duration: 10, description: "外观细节特写" },
      { name: "功能演示", duration: 20, description: "核心功能使用演示" },
      { name: "性能测试", duration: 10, description: "跑分和实际体验" },
      { name: "总结评价", duration: 10, description: "优缺点和购买建议" },
    ],
  },
  {
    id: "tpl-digital-002",
    name: "手机摄影技巧",
    description: "技巧教学 + 样张展示 + 产品推荐，适用于手机、手机配件",
    category: "digital",
    style: "tutorial",
    duration: 30,
    thumbnail: "/templates/digital-02.jpg",
    useCount: 445,
    tags: ["教程", "实用"],
    shots: [
      { name: "技巧预告", duration: 3, description: "今日摄影技巧" },
      { name: "设置演示", duration: 8, description: "相机参数设置" },
      { name: "拍摄过程", duration: 10, description: "实际拍摄演示" },
      { name: "样张展示", duration: 6, description: "成片效果展示" },
      { name: "进阶技巧", duration: 3, description: "更多拍摄建议" },
    ],
  },
  {
    id: "tpl-digital-003",
    name: "数码开箱首测",
    description: "新品开箱 + 首次体验 + 亮点总结，适用于新品首发、限量产品",
    category: "digital",
    style: "unboxing",
    duration: 30,
    thumbnail: "/templates/digital-03.jpg",
    useCount: 890,
    tags: ["新品", "首发"],
    shots: [
      { name: "新品预告", duration: 3, description: "产品介绍" },
      { name: "开箱过程", duration: 8, description: "包装和配件" },
      { name: "首次体验", duration: 12, description: "开机和初始设置" },
      { name: "亮点总结", duration: 5, description: "核心卖点" },
      { name: "购买建议", duration: 2, description: "价格和渠道" },
    ],
  },

  // ========== 家居 ==========
  {
    id: "tpl-home-001",
    name: "家居好物安利",
    description: "使用场景 + 功能演示 + 生活改变，适用于家居收纳、清洁用品",
    category: "home",
    style: "scenario",
    duration: 30,
    thumbnail: "/templates/home-01.jpg",
    useCount: 756,
    tags: ["生活感", "实用"],
    shots: [
      { name: "生活痛点", duration: 5, description: "展示杂乱/脏乱场景" },
      { name: "产品登场", duration: 5, description: "产品开箱展示" },
      { name: "使用演示", duration: 15, description: "实际使用过程" },
      { name: "效果展示", duration: 5, description: "整洁有序的成果" },
    ],
  },
  {
    id: "tpl-home-002",
    name: "智能家居体验",
    description: "生活场景 + 智能联动 + 便捷展示，适用于智能音箱、扫地机器人等",
    category: "home",
    style: "scenario",
    duration: 30,
    thumbnail: "/templates/home-02.jpg",
    useCount: 567,
    tags: ["科技感", "便捷"],
    shots: [
      { name: "生活场景", duration: 5, description: "日常生活画面" },
      { name: "产品登场", duration: 5, description: "智能产品展示" },
      { name: "智能联动", duration: 12, description: "语音/APP控制演示" },
      { name: "便捷生活", duration: 5, description: "使用后的生活改变" },
      { name: "总结推荐", duration: 3, description: "产品亮点总结" },
    ],
  },
  {
    id: "tpl-home-003",
    name: "厨房神器推荐",
    description: "厨房场景 + 工具演示 + 效率提升，适用于厨房小家电、厨具",
    category: "home",
    style: "comparison",
    duration: 30,
    thumbnail: "/templates/home-03.jpg",
    useCount: 678,
    tags: ["实用", "生活"],
    shots: [
      { name: "厨房痛点", duration: 5, description: "传统方式的不便" },
      { name: "神器登场", duration: 5, description: "产品展示" },
      { name: "使用演示", duration: 15, description: "实际使用效果" },
      { name: "效率对比", duration: 5, description: "使用前后对比" },
    ],
  },

  // ========== 服饰 ==========
  {
    id: "tpl-fashion-001",
    name: "服饰穿搭指南",
    description: "风格展示 + 多套搭配 + 场景切换，适用于服装、配饰、鞋包",
    category: "fashion",
    style: "scenario",
    duration: 30,
    thumbnail: "/templates/fashion-01.jpg",
    useCount: 1102,
    tags: ["时尚", "穿搭"],
    shots: [
      { name: "风格预告", duration: 3, description: "今日穿搭主题" },
      { name: "第一套", duration: 8, description: "日常休闲搭配" },
      { name: "第二套", duration: 8, description: "通勤职场搭配" },
      { name: "第三套", duration: 8, description: "约会出街搭配" },
      { name: "总结推荐", duration: 3, description: "搭配要点总结" },
    ],
  },
  {
    id: "tpl-fashion-002",
    name: "季节换装秀",
    description: "季节主题 + 多场景搭配 + 单品推荐，适用于换季新品、应季服饰",
    category: "fashion",
    style: "story",
    duration: 30,
    thumbnail: "/templates/fashion-02.jpg",
    useCount: 876,
    tags: ["换季", "新品"],
    shots: [
      { name: "季节主题", duration: 3, description: "当季流行趋势" },
      { name: "通勤搭配", duration: 8, description: "职场穿搭示范" },
      { name: "休闲搭配", duration: 8, description: "周末出游穿搭" },
      { name: "约会搭配", duration: 8, description: "约会场景穿搭" },
      { name: "单品推荐", duration: 3, description: "必入单品清单" },
    ],
  },

  // ========== 母婴 ==========
  {
    id: "tpl-baby-001",
    name: "母婴好物分享",
    description: "育儿场景 + 产品使用 + 安全认证，适用于婴儿用品、儿童玩具",
    category: "baby",
    style: "scenario",
    duration: 30,
    thumbnail: "/templates/baby-01.jpg",
    useCount: 445,
    tags: ["温馨", "安全"],
    shots: [
      { name: "育儿场景", duration: 5, description: "日常生活场景" },
      { name: "产品展示", duration: 8, description: "产品安全特性" },
      { name: "使用演示", duration: 12, description: "宝宝使用过程" },
      { name: "妈妈推荐", duration: 5, description: "真实使用感受" },
    ],
  },
  {
    id: "tpl-baby-002",
    name: "亲子互动游戏",
    description: "游戏场景 + 产品使用 + 亲子时光，适用于益智玩具、亲子产品",
    category: "baby",
    style: "scenario",
    duration: 15,
    thumbnail: "/templates/baby-02.jpg",
    useCount: 234,
    tags: ["温馨", "互动"],
    shots: [
      { name: "游戏介绍", duration: 3, description: "游戏规则说明" },
      { name: "互动过程", duration: 8, description: "亲子游戏精彩瞬间" },
      { name: "产品展示", duration: 4, description: "玩具/产品特写" },
    ],
  },

  // ========== 运动 ==========
  {
    id: "tpl-sports-001",
    name: "运动健身装备",
    description: "运动场景 + 装备展示 + 性能测试，适用于运动器材、健身服饰",
    category: "sports",
    style: "comparison",
    duration: 30,
    thumbnail: "/templates/sports-01.jpg",
    useCount: 567,
    tags: ["活力", "专业"],
    shots: [
      { name: "运动场景", duration: 5, description: "健身房/户外场景" },
      { name: "装备展示", duration: 8, description: "产品细节展示" },
      { name: "使用演示", duration: 12, description: "实际运动使用" },
      { name: "效果总结", duration: 5, description: "使用体验总结" },
    ],
  },
  {
    id: "tpl-sports-002",
    name: "瑜伽健身教学",
    description: "动作教学 + 装备展示 + 练习效果，适用于瑜伽垫、运动服饰",
    category: "sports",
    style: "tutorial",
    duration: 30,
    thumbnail: "/templates/sports-02.jpg",
    useCount: 345,
    tags: ["教程", "健康"],
    shots: [
      { name: "动作介绍", duration: 5, description: "今日教学动作" },
      { name: "装备展示", duration: 5, description: "瑜伽装备介绍" },
      { name: "动作演示", duration: 15, description: "标准动作教学" },
      { name: "练习效果", duration: 5, description: "坚持练习的变化" },
    ],
  },

  // ========== 宠物 ==========
  {
    id: "tpl-pet-001",
    name: "宠物萌宠日记",
    description: "萌宠日常 + 产品使用 + 互动时刻，适用于宠物食品、玩具、用品",
    category: "pet",
    style: "scenario",
    duration: 15,
    thumbnail: "/templates/pet-01.jpg",
    useCount: 789,
    tags: ["萌宠", "治愈"],
    shots: [
      { name: "萌宠出场", duration: 3, description: "宠物可爱瞬间" },
      { name: "产品使用", duration: 7, description: "宠物使用产品" },
      { name: "互动时刻", duration: 5, description: "主人与宠物互动" },
    ],
  },
  {
    id: "tpl-pet-002",
    name: "猫咪日常记录",
    description: "猫咪生活 + 产品使用 + 萌宠互动，适用于猫粮、猫砂、猫玩具",
    category: "pet",
    style: "story",
    duration: 15,
    thumbnail: "/templates/pet-02.jpg",
    useCount: 567,
    tags: ["治愈", "日常"],
    shots: [
      { name: "猫咪日常", duration: 4, description: "猫咪生活片段" },
      { name: "产品使用", duration: 6, description: "使用猫粮/玩具" },
      { name: "互动反馈", duration: 5, description: "猫咪反应" },
    ],
  },

  // ========== 汽车 ==========
  {
    id: "tpl-auto-001",
    name: "汽车用品测评",
    description: "产品展示 + 安装演示 + 使用效果，适用于车载配件、汽车装饰",
    category: "auto",
    style: "comparison",
    duration: 30,
    thumbnail: "/templates/auto-01.jpg",
    useCount: 432,
    tags: ["实用", "车品"],
    shots: [
      { name: "产品介绍", duration: 5, description: "汽车用品展示" },
      { name: "安装演示", duration: 10, description: "安装步骤详解" },
      { name: "使用效果", duration: 10, description: "实际使用场景" },
      { name: "总结推荐", duration: 5, description: "优缺点和购买建议" },
    ],
  },
  {
    id: "tpl-auto-002",
    name: "车内好物清单",
    description: "场景展示 + 产品推荐 + 使用体验，适用于车载香薰、手机支架等",
    category: "auto",
    style: "scenario",
    duration: 15,
    thumbnail: "/templates/auto-02.jpg",
    useCount: 567,
    tags: ["车品", "实用"],
    shots: [
      { name: "车内场景", duration: 3, description: "日常用车场景" },
      { name: "产品展示", duration: 7, description: "逐个展示推荐好物" },
      { name: "使用体验", duration: 5, description: "实际使用感受" },
    ],
  },

  // ========== 直播 ==========
  {
    id: "tpl-live-001",
    name: "直播高光切片",
    description: "精彩片段 + 产品亮点 + 互动瞬间，适用于直播切片二次传播",
    category: "live",
    style: "live-replay",
    duration: 15,
    thumbnail: "/templates/live-01.jpg",
    useCount: 2345,
    tags: ["爆款", "直播", "切片"],
    shots: [
      { name: "精彩开场", duration: 3, description: "吸引眼球的直播片段" },
      { name: "产品讲解", duration: 5, description: "主播详细讲解产品" },
      { name: "互动瞬间", duration: 4, description: "观众互动精彩时刻" },
      { name: "促单话术", duration: 3, description: "逼单/福利话术" },
    ],
  },
  {
    id: "tpl-live-002",
    name: "直播预热引流",
    description: "悬念设置 + 福利预告 + 时间地点，适用于直播前预热引流",
    category: "live",
    style: "pain-point",
    duration: 15,
    thumbnail: "/templates/live-02.jpg",
    useCount: 1234,
    tags: ["引流", "预热"],
    shots: [
      { name: "悬念引入", duration: 3, description: "引发好奇的问题" },
      { name: "福利预告", duration: 5, description: "直播间专属福利" },
      { name: "时间地点", duration: 4, description: "开播时间和入口" },
      { name: "行动号召", duration: 3, description: "引导预约直播" },
    ],
  },
  {
    id: "tpl-live-003",
    name: "直播间商品展示",
    description: "商品特写 + 使用演示 + 价格对比，适用于直播间商品短视频",
    category: "live",
    style: "comparison",
    duration: 30,
    thumbnail: "/templates/live-03.jpg",
    useCount: 1890,
    tags: ["带货", "转化"],
    shots: [
      { name: "商品引入", duration: 3, description: "今日直播爆品预告" },
      { name: "商品特写", duration: 8, description: "产品细节展示" },
      { name: "使用演示", duration: 10, description: "实际使用效果" },
      { name: "价格对比", duration: 6, description: "直播专属优惠" },
      { name: "引导下单", duration: 3, description: "限时限量促单" },
    ],
  },

  // ========== 通用 ==========
  {
    id: "tpl-general-001",
    name: "剧情反转种草",
    description: "悬念设置 + 剧情推进 + 产品揭秘，适用于各类创意产品",
    category: "all",
    style: "story",
    duration: 30,
    thumbnail: "/templates/story-01.jpg",
    useCount: 2156,
    tags: ["爆款", "高完播", "创意"],
    shots: [
      { name: "悬念引入", duration: 5, description: "设置悬念或冲突" },
      { name: "剧情发展", duration: 10, description: "故事推进" },
      { name: "反转时刻", duration: 5, description: "剧情反转" },
      { name: "产品揭秘", duration: 7, description: "产品登场解决问题" },
      { name: "行动号召", duration: 3, description: "引导购买" },
    ],
  },
  {
    id: "tpl-general-002",
    name: "开箱惊喜体验",
    description: "快递拆箱 + 产品展示 + 第一印象，适用于新品上市、礼品套装",
    category: "all",
    style: "unboxing",
    duration: 15,
    thumbnail: "/templates/unboxing-01.jpg",
    useCount: 1876,
    tags: ["爆款", "新品", "期待感"],
    shots: [
      { name: "开箱预告", duration: 2, description: "包裹展示" },
      { name: "拆箱过程", duration: 5, description: "打开包装" },
      { name: "产品初见", duration: 5, description: "第一印象展示" },
      { name: "使用体验", duration: 3, description: "简单试用" },
    ],
  },
];

/** 获取品类标签 */
export function getCategoryLabel(value: string): string {
  return categoryOptions.find((o) => o.value === value)?.label || value;
}

/** 获取品类图标 */
export function getCategoryIcon(value: string): string {
  return categoryOptions.find((o) => o.value === value)?.icon || "🎬";
}

/** 获取风格标签 */
export function getStyleLabel(value: string): string {
  return styleOptions.find((o) => o.value === value)?.label || value;
}
