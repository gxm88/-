# 管理后台后端服务规划 Spec

## Why
当前管理后台前端已搭建完毕（9 个子页面），但全部使用 mock 数据渲染。需要规划后端服务架构，实现真实的数据管理、用户管理、曲库扫描、AI 配置等功能，与前端 `API.*` 层对接。

## What Changes
- 设计后端技术栈与项目结构
- 定义数据库表结构（用户、曲目、歌单、日志、配置等）
- 定义所有管理后台 API 端点（与前端 api.js 对齐）
- 规划认证鉴权方案（JWT + 角色守卫）
- 规划曲库扫描/元数据修复流程
- 规划 AI 模型配置与调用策略
- 规划日志/备份/监控体系
- 规划部署架构（Docker + 反向代理）

## Impact
- Affected specs: 无
- Affected code: 新增 `server/` 目录，前端 `js/api.js` 无需修改（端点已对齐）
- 前端 `pages.js` admin 子页面已有表单/开关/按钮，后端需对接

---

## ADDED Requirements

### Requirement: 后端技术栈选型
系统 SHALL 采用以下技术栈：Node.js + Express + SQLite（轻量部署）或 PostgreSQL（生产环境），JWT 鉴权，Docker 容器化部署。

### Requirement: 数据库表结构
系统 SHALL 包含以下核心数据表：

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `users` | 用户账号 | id, username, password_hash, role(admin/user/guest), email, created_at, last_login |
| `tracks` | 歌曲元数据 | id, path, title, artist, album, genre, duration, cover_path, lyrics, play_count, created_at |
| `playlists` | 歌单 | id, name, type(official/user), owner_id, tracks(JSON), cover, created_at |
| `folders` | 扫描目录 | id, path, track_count, last_scan, status |
| `scan_logs` | 扫描日志 | id, folder_id, type, message, created_at |
| `ai_configs` | AI 模型配置 | id, provider, model_name, api_key, enabled, calls_today |
| `system_config` | 系统参数 | key, value, updated_at |
| `backups` | 备份记录 | id, filename, size, created_at |
| `favorites` | 用户收藏 | user_id, track_id, created_at |
| `play_history` | 播放历史 | user_id, track_id, played_at, progress |

### Requirement: API 端点定义
系统 SHALL 提供以下管理后台 API 端点（与前端 api.js 对齐）：

#### 认证
- `POST /api/login` — 登录（返回 JWT）
- `POST /api/logout` — 登出
- `GET /api/profile` — 获取当前用户信息

#### 仪表盘
- `GET /api/admin/stats` — 获取统计数据（歌曲数、用户数、播放量、存储、CPU、内存）

#### 曲库管理
- `GET /api/admin/folders` — 获取挂载目录列表
- `POST /api/admin/folders` — 添加挂载目录
- `DELETE /api/admin/folders/:id` — 移除挂载目录
- `POST /api/admin/scan/:folderId` — 触发扫描
- `GET /api/admin/metadata` — 获取元数据状态
- `POST /api/admin/metadata/repair` — 触发元数据修复
- `GET /api/admin/duplicates` — 获取重复检测结果
- `POST /api/admin/duplicates/cleanup` — 清理重复

#### 用户管理
- `GET /api/admin/users` — 获取用户列表
- `POST /api/admin/users` — 创建用户
- `PUT /api/admin/users/:id` — 更新用户（角色、状态）
- `DELETE /api/admin/users/:id` — 删除用户

#### 歌单管理
- `GET /api/admin/playlists` — 获取歌单列表
- `POST /api/admin/playlists` — 创建官方歌单
- `PUT /api/admin/playlists/:id` — 编辑歌单
- `DELETE /api/admin/playlists/:id` — 删除歌单

#### AI 配置
- `GET /api/admin/ai-models` — 获取 AI 模型列表
- `POST /api/admin/ai-models` — 添加 AI 模型
- `PUT /api/admin/ai-models/:id` — 更新模型配置
- `DELETE /api/admin/ai-models/:id` — 删除模型
- `GET /api/admin/ai-strategy` — 获取推荐策略
- `PUT /api/admin/ai-strategy` — 更新推荐策略

#### 网络/站点配置
- `GET /api/admin/site-config` — 获取站点配置
- `PUT /api/admin/site-config` — 更新站点配置
- `GET /api/admin/tcp-status` — 获取 TCP 连接状态

#### 日志/备份
- `GET /api/admin/logs` — 获取系统日志
- `POST /api/admin/backup` — 触发备份
- `GET /api/admin/backups` — 获取备份列表
- `POST /api/admin/backup/restore` — 恢复备份

### Requirement: 认证鉴权
系统 SHALL 使用 JWT 令牌认证，所有 `/api/admin/*` 端点需要 `admin` 角色。使用中间件 `authMiddleware` 校验 JWT + `adminGuard` 校验角色。

#### Scenario: 管理员访问
- **WHEN** admin 用户携带有效 JWT 访问 `/api/admin/*`
- **THEN** 请求通过，返回数据

#### Scenario: 普通用户访问管理端点
- **WHEN** 普通用户携带有效 JWT 访问 `/api/admin/*`
- **THEN** 返回 403 Forbidden

### Requirement: 曲库扫描流程
系统 SHALL 支持对挂载目录进行递归扫描，识别音频文件（mp3/flac/wav/m4a），提取元数据（标题/歌手/专辑/时长），写入 `tracks` 表。

#### Scenario: 触发扫描
- **WHEN** 管理员点击"扫描"按钮
- **THEN** 系统异步扫描目录，实时推送日志到前端
- **AND** 扫描完成后更新 `folders` 表的 `last_scan` 和 `track_count`

### Requirement: 项目目录结构
系统 SHALL 按以下结构组织后端代码：

```
server/
├── index.js          # 入口：Express 启动 + 中间件
├── config.js         # 环境变量 / 配置
├── db.js             # SQLite 连接 + 初始化建表
├── middleware/
│   ├── auth.js       # JWT 验证中间件
│   └── admin.js      # 管理员角色守卫
├── routes/
│   ├── auth.js       # 登录/登出/用户信息
│   ├── tracks.js     # 曲目 CRUD + 播放记录
│   ├── playlists.js  # 歌单 CRUD
│   ├── admin.js      # 统计/用户/配置/日志/备份
│   ├── scanner.js    # 曲库扫描/元数据修复
│   └── ai.js         # AI 模型/推荐策略
├── services/
│   ├── scanner.js    # 文件扫描逻辑
│   ├── metadata.js   # 元数据提取
│   └── ai.js         # AI 调用封装
└── package.json
```

---

## 审计发现：当前 admin 页面问题

| # | 问题 | 位置 | 严重程度 |
|---|------|------|----------|
| 1 | 仪表盘"最近扫描"日志硬编码为静态文本 | `admDashboard()` | 中 |
| 2 | 用户管理页"操作"按钮无实际功能 | `admUsers()` | 中 |
| 3 | 用户管理页"开关"组件无交互绑定 | `admUsers()` | 中 |
| 4 | AI 配置页"开关"无交互绑定 | `admAIConfig()` | 中 |
| 5 | 网络配置页"开关"无交互绑定 | `admNetwork()` | 中 |
| 6 | 所有表单 input/select 无保存/提交功能 | 多个子页面 | 高 |
| 7 | 歌单编辑页按钮无实际功能 | `admPlaylistEdit()` | 中 |
| 8 | 备份页按钮无实际功能 | `admBackup()` | 中 |
| 9 | 日志筛选 pill 无交互绑定 | `admBackup()` | 中 |
| 10 | 目录管理页操作按钮无实际功能 | `admLibraryMgmt()` | 中 |