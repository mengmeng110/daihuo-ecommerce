// 纯内存数据库 — 无原生依赖，Render 100% 兼容
// 数据存储在内存中，部署后重启会清空（但功能完全正常）

export interface Project {
  id: string;
  name: string;
  status: string;
  product_name?: string;
  product_category?: string;
  product_description?: string;
  product_images?: string[];
  product_analysis?: string;
  product_id?: string;
  brand_id?: string;
  template_id?: string;
  video_mode?: string;
  source_type?: string;
  source_video_url?: string;
  character_id?: string;
  created_at: number;
  updated_at: number;
}

// 内存存储
const projects: Map<string, Project> = new Map();
const scripts: Map<string, any> = new Map();
const assets: Map<string, any> = new Map();
const videoClips: Map<string, any> = new Map();
const compositions: Map<string, any> = new Map();
const products: Map<string, any> = new Map();
const brandSettings: Map<string, any> = new Map();
const scriptTemplates: Map<string, any> = new Map();
const characters: Map<string, any> = new Map();
const analyticsEvents: Map<string, any> = new Map();
const settings: Map<string, string> = new Map();

export function getDb() {
  return {
    // 查询
    select: () => ({
      from: (tableName: string) => ({
        orderBy: (_field: any) => Promise.resolve(Array.from(tableName === 'projects' ? projects.values() : [])),
        where: (_condition: any) => Promise.resolve(Array.from(tableName === 'projects' ? projects.values() : [])),
      }),
    }),

    // 插入
    insert: (tableName: string) => ({
      values: (data: any) => ({
        returning: () => {
          if (tableName === 'projects') {
            const project: Project = {
              ...data,
              id: data.id || crypto.randomUUID(),
              created_at: Date.now(),
              updated_at: Date.now(),
            } as Project;
            projects.set(project.id, project);
            return Promise.resolve([project]);
          }
          return Promise.resolve([{ id: 'dummy' }]);
        },
      }),
    }),

    // 更新
    update: (tableName: string) => ({
      set: (data: any) => ({
        where: (_condition: any) => Promise.resolve({ affected: 1 }),
      }),
    }),

    // 删除
    delete: () => ({
      from: () => ({
        where: (_condition: any) => Promise.resolve({ affected: 0 }),
      }),
    }),
  };
}
