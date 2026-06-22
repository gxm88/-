# Tasks

- [x] Task 1: 搭建后端项目骨架
  - [x] 创建 `server/` 目录结构
  - [x] 编写 `package.json`（Express + better-sqlite3 + jsonwebtoken + bcryptjs）
  - [x] 编写 `config.js`（端口、JWT 密钥、数据库路径）
  - [x] 编写 `db.js`（SQLite 初始化 + 10 张表建表 + 种子数据）
  - [x] 编写 `index.js`（Express 启动 + CORS + JSON 解析 + 路由挂载 + 静态文件服务）

- [x] Task 2: 实现认证鉴权
  - [x] 编写 `middleware/auth.js`（JWT 验证中间件）
  - [x] 编写 `middleware/admin.js`（管理员角色守卫）
  - [x] 编写 `routes/auth.js`（POST /api/login, POST /api/logout, GET /api/profile）

- [x] Task 3: 实现管理后台 API
  - [x] 编写 `routes/admin.js`（仪表盘统计、用户CRUD、歌单CRUD、站点配置、日志、备份）
  - [x] 编写 `routes/scanner.js`（目录挂载、扫描触发、元数据修复、重复检测）
  - [x] 编写 `routes/ai.js`（AI 模型CRUD、推荐策略读写）
  - [x] 编写 `routes/tracks.js`（曲目列表、搜索、单曲详情、播放记录）
  - [x] 编写 `routes/playlists.js`（歌单列表、详情、收藏/取消收藏）
  - [x] 所有 API 响应统一为 `{ data: ..., total: ... }` 格式

- [x] Task 4: 实现前端 API 交互
  - [x] 修改 `app.js` `login()` 存储 JWT 到 localStorage
  - [x] 修改 `api.js` 在请求头中携带 JWT（`Authorization: Bearer <token>`）
  - [x] 给管理后台子页面的开关/按钮/表单绑定事件处理（onclick + showToast）
  - [x] 给管理后台子页面的操作按钮添加确认对话框

- [x] Task 5: Docker 部署配置
  - [x] 编写 `Dockerfile`（Node.js 20 Alpine 运行环境）
  - [x] 编写 `docker-compose.yml`（app + 数据卷挂载 + 环境变量）
  - [x] 编写 `.dockerignore`

- [x] Task 6: 自测验证
  - [x] 验证后端启动 + 数据库初始化（3 用户、10 曲目、8 歌单、22 配置）
  - [x] 验证登录/登出 JWT 流程
  - [x] 验证管理员权限守卫
  - [x] 验证管理后台所有 API 端点可访问
  - [x] 验证前端 API 对接正常
  - [x] 语法检查全部通过（前端 4 文件 + 后端 11 文件）

# Task Dependencies
- Task 2 依赖 Task 1（需要路由框架 + 数据库）
- Task 3 依赖 Task 1、2（需要认证中间件）
- Task 4 依赖 Task 3（需要后端 API 就绪）
- Task 5 可与 Task 2、3 并行
- Task 6 依赖所有任务完成