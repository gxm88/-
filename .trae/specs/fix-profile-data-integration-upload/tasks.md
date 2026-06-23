# Tasks

- [x] Task 1: 修复个人中心加载失败
  - [x] 修复 `server/routes/auth.js` 中 `/api/profile` 返回格式：包装为 `{ data: { ... } }`，补充 `listen_minutes`、`fav_count`、`playlists`、`top_genres` 等字段
  - [x] 修复 `js/pages/profile.js` 前端兼容后端返回格式

- [x] Task 2: 统一前后端 API 数据格式
  - [x] 修复 `server/routes/tracks.js` — 确保 track 返回 `id` 为 string 类型，`duration` 映射为 `dur` 字段
  - [x] 修复 `server/routes/library.js` — artists 返回每条带 `id` 和 `name` 字段；albums 返回 `id` 字段
  - [x] 修复 `server/routes/user.js` — favorites/history 返回的 track 字段对齐前端

- [x] Task 3: 后台管理目录挂载页面添加手动上传入口
  - [x] 在 `server/index.js` 添加 multer 文件上传中间件，配置 `music/` 上传目录
  - [x] 在 `server/routes/tracks.js` 添加 `POST /api/tracks/upload` 路由，处理文件上传并写入数据库
  - [x] 在 `js/api.js` 添加 `uploadTrack` 方法
  - [x] 在 `js/pages/admin-library.js` 添加拖拽/点击上传区域 UI，支持多文件上传与进度反馈

- [x] Task 4: 生成真实测试音频文件并建立测试流程
  - [x] 使用 ffmpeg（或 sox）生成 10 个可播放的测试音频文件到 `music/` 目录
  - [x] 更新 `server/routes/scanner.js` 的扫描逻辑，使其能真正读取 `music/` 目录下的文件并写入数据库
  - [x] 验证播放器可通过文件路径播放真实音频

# Task Dependencies
- Task 2 依赖 Task 1（数据格式统一需要先理解 profile 修复的格式）
- Task 3 可与 Task 1、Task 2 并行
- Task 4 依赖 Task 3（需要上传功能完备后才能测试真实数据）