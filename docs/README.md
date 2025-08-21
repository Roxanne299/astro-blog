# JDYun 个人技术博客

基于 Astro Starlight 构建的个人技术博客，记录技术成长，分享学习心得。

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

## 🌟 博客特色

- **分类清晰**：技术、算法、投资三大主题分类
- **响应式设计**：支持深色/浅色主题切换
- **全文搜索**：快速定位感兴趣的内容
- **SEO友好**：自动生成sitemap和meta信息

## 📁 文章分类

```
src/content/docs/
├── technical/          # 技术文章
│   ├── java/           # Java相关
│   ├── database/       # 数据库
│   ├── tools/          # 工具使用
│   ├── ai/             # AI技术
│   ├── architecture/   # 架构设计
│   ├── devops/         # 运维配置
│   └── concurrency/    # 并发编程
├── algorithm/          # 算法
│   ├── contest/        # 竞赛记录
│   └── advanced/       # 高级算法
└── investment/         # 投资理财
    └── basics/         # 基础知识
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 pnpm

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:4321
```

### 构建部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📖 页面结构机制

### 目录索引页面

Starlight 需要为每个可访问的路径创建对应的 `index.md` 文件，否则会出现 404 错误。

**目录结构示例：**
```
src/content/docs/
├── technical/
│   ├── index.md           # /technical/ 页面
│   └── java/
│       ├── index.md       # /technical/java/ 页面
│       └── article.md     # /technical/java/article/ 页面
└── algorithm/
    ├── index.md           # /algorithm/ 页面
    └── contest/
        ├── index.md       # /algorithm/contest/ 页面
        └── leetcode.md    # /algorithm/contest/leetcode/ 页面
```

### 索引页面模板

**一级目录索引页面：**
```markdown
---
title: 分类名称
description: 分类描述
---

# 分类名称

分类介绍...

## 分类

- **[子分类1](/path/subcat1/)** - 子分类1描述
- **[子分类2](/path/subcat2/)** - 子分类2描述
```

**二级目录索引页面：**
```markdown
---
title: 子分类名称
description: 子分类描述
---

# 子分类名称

子分类介绍...

## 文章列表

- **[文章标题](./article-name/)** - 文章简介
```

## ✍️ 文章管理

### 修改现有文章

直接编辑对应目录下的 `.md` 文件：

```bash
# 例如修改Java静态代理文章
vim src/content/docs/technical/java/static-proxy.md
```

### 添加新文章

**1. 创建新文件（使用英文文件名）**
```bash
# 在合适的目录创建新文章
touch src/content/docs/technical/java/spring-boot-tutorial.md
```

**2. 添加文章头部信息**
```markdown
---
title: Spring Boot 入门教程
description: 从零开始学习 Spring Boot 框架
pubDate: 2025-01-01  # 可选
---

# Spring Boot 入门教程

文章内容...
```

**3. 自动更新**
使用了 `autogenerate` 配置，新文章会自动出现在侧边栏中。

### 添加新分类

**1. 创建新目录**
```bash
mkdir -p src/content/docs/frontend/react
```

**2. 更新配置**
编辑 `astro.config.mjs`，在 `sidebar` 中添加：
```javascript
{
  label: 'Frontend', 
  items: [
    {
      label: 'React',
      autogenerate: { directory: 'frontend/react' },
    },
  ],
}
```

**3. 添加目录索引页面**
```bash
# 创建一级目录索引页面
touch src/content/docs/frontend/index.md

# 创建二级目录索引页面  
touch src/content/docs/frontend/react/index.md
```

**4. 添加文章**
```bash
touch src/content/docs/frontend/react/hooks-tutorial.md
```

⚠️ **重要提醒**：每个新增的目录都需要创建对应的 `index.md` 文件，否则访问该路径会出现 404 错误。

### 新增不同分类的完整步骤

假设要新增 "前端技术" 分类，添加 "React Hooks 教程"：

**1. 创建目录结构**
```bash
mkdir -p src/content/docs/frontend/react
```

**2. 创建索引页面**
```bash
# 一级目录索引页
touch src/content/docs/frontend/index.md
# 二级目录索引页
touch src/content/docs/frontend/react/index.md
```

**3. 编写索引页内容**

`frontend/index.md`：
```markdown
---
title: 前端技术
description: 前端开发相关的技术分享
---

# 前端技术

## 分类
- **[React](/frontend/react/)** - React 框架相关技术
```

`frontend/react/index.md`：
```markdown
---
title: React
description: React 框架技术分享
---

# React

## 文章列表
- **[React Hooks 教程](./react-hooks-tutorial/)** - React Hooks 使用指南
```

**4. 创建文章**
```bash
touch src/content/docs/frontend/react/react-hooks-tutorial.md
```

**5. 更新配置**
编辑 `astro.config.mjs`，在 sidebar 中添加：
```javascript
{
  label: 'Frontend',
  items: [
    {
      label: 'React',
      autogenerate: { directory: 'frontend/react' },
    },
  ],
}
```

**6. 更新主页（可选）**
编辑 `src/content/docs/index.mdx`：
```markdown
<Card title="🎨 前端技术" icon="laptop" href="/frontend/">
  React、Vue 等前端框架的使用心得
</Card>
```

## 📝 文章模板

推荐的文章格式：

```markdown
---
title: 文章标题
description: 文章简短描述
pubDate: 2025-01-01
categories: ["分类1", "分类2"]  # 可选，用于参考
---

# 文章标题

## 概述

简要介绍文章内容...

## 主要内容

### 子标题1

内容...

### 子标题2

内容...

## 总结

总结要点...
```

## ⏭️ 页面导航配置

### 自动导航（推荐）
使用 `autogenerate` 时，Starlight 会自动按文件名排序生成上一页/下一页导航：
```javascript
// astro.config.mjs
{
  label: 'React',
  autogenerate: { directory: 'frontend/react' },
}
```

### 手动排序导航
自定义文章顺序：
```javascript
{
  label: 'React',
  items: [
    'frontend/react/getting-started',
    'frontend/react/hooks-tutorial', 
    'frontend/react/state-management',
  ],
}
```

### 文件名前缀排序
使用数字前缀控制顺序：
```
01-getting-started.md
02-hooks-tutorial.md  
03-state-management.md
```

### 自定义导航链接
在文章 frontmatter 中配置：
```markdown
---
title: 文章标题
prev: 
  link: '/frontend/react/intro/'
  label: 'React 介绍'
next:
  link: '/frontend/react/advanced/'
  label: 'React 高级用法'
# 或者禁用导航
# prev: false
# next: false
---
```

## 🔧 命令一览

| 命令 | 作用 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览构建结果 |
| `npm run astro check` | 类型检查 |

## 📋 文件命名规范

- **文件名**：使用英文，用连字符分隔：`spring-boot-tutorial.md`
- **访问路径**：`/technical/java/spring-boot-tutorial/`
- **中文标题**：在文件内容的 `title` 字段定义

## 💡 最佳实践

### 新增分类建议
1. **目录深度**：建议保持 2-3 层深度，避免过深的嵌套
2. **命名统一**：使用语义化的英文目录名和文件名
3. **索引完整**：每个目录都必须有 `index.md` 文件
4. **描述清晰**：索引页面要有清晰的分类说明

### 导航顺序建议
1. **教程类**：使用数字前缀或手动配置，确保循序渐进
2. **参考类**：使用自动排序即可，按字母顺序查找
3. **时间类**：如周赛记录，建议按时间倒序排列

### 内容组织建议
1. **单一主题**：每个目录专注一个主题领域
2. **适度分组**：相关文章归类到同一子目录
3. **避免孤立**：每个分类至少要有2-3篇文章

## 🎯 访问路径

- 主页：`/`
- Java文章：`/technical/java/文章名/`
- 算法竞赛：`/algorithm/contest/文章名/`
- 投资基础：`/investment/basics/文章名/`

## 📚 技术栈

- [Astro](https://astro.build) - 静态站点生成器
- [Starlight](https://starlight.astro.build) - 文档主题
- [TypeScript](https://www.typescriptlang.org/) - 类型支持
- [Vite](https://vitejs.dev/) - 构建工具

## 📄 许可证

MIT License

---

💡 **提示**：保存文件后，开发服务器会自动重新加载，新文章立即可见！

🔗 **相关链接**：
- [Astro 文档](https://docs.astro.build)
- [Starlight 文档](https://starlight.astro.build)