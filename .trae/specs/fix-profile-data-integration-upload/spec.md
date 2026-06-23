# 个人中心修复、前后端数据对齐、手动上传入口、真实数据测试 Spec

## Why
个人中心页面加载失败，前后端 API 数据格式不一致，所有页面数据未互通，且缺少真实音频文件测试入口。

## What Changes
- **修复个人中心加载失败**：后端 `/api/profile` 返回格式与前端期望不一致，且缺少 `listen_minutes`/`fav_count` 等字段
- **统一前后端 API 数据格式**：所有后端路由返回格式统一为 `{ data: ..., total: ... }`，字段名对齐前端 Mock 数据
- **后台管理目录挂载页面添加手动上传入口**：支持拖拽/点击上传音频文件，写入 `music/` 目录并写入数据库
- **生成真实测试音频文件 + 建立真实数据测试流程**

## Impact
- Affected specs: N/A (新规格)
- Affected code: 
  - `server/routes/auth.js` — profile 返回格式修复
  - `server/routes/user.js` — favorites/history 返回格式修复
  - `server/routes/library.js` — artists/albums/folders 返回格式对齐
  - `server/routes/tracks.js` — 增加文件上传路由
  - `server/index.js` — 增加 multer 上传中间件 + 静态文件挂载
  - `js/pages/profile.js` — 适配后端返回格式
  - `js/pages/admin-library.js` — 添加上传入口 UI
  - `js/api.js` — 补充上传 API

## ADDED Requirements

### Requirement: 个人中心页面正常加载
系统 SHALL 在用户访问个人中心时正确展示用户信息，后端返回格式与前端期望一致。

#### Scenario: 已登录用户访问个人中心
- **WHEN** 已登录用户导航到 `/profile`
- **THEN** 页面展示用户头像、用户名、收听时长、收藏数、歌单数等完整信息

#### Scenario: 未登录用户访问个人中心
- **WHEN** 未登录用户尝试访问 `/profile`
- **THEN** 跳转到登录页

### Requirement: 前后端 API 数据格式统一
系统 SHALL 确保所有后端 API 返回格式统一为 `{ data: ... }` 或 `{ data: ..., total: ... }`，字段名与前端 Mock 数据保持一致。

#### Scenario: 获取音轨列表
- **WHEN** 前端调用 `GET /api/tracks`
- **THEN** 后端返回 `{ data: [...], total: N }`，其中 `data` 数组中的每个 track 对象包含 `id`(string)、`title`、`artist`、`album`、`genre`、`dur`(duration)、`year` 等字段

#### Scenario: 获取用户资料
- **WHEN** 前端调用 `GET /api/profile`
- **THEN** 后端返回 `{ data: { listen_minutes, fav_count, playlists, top_genres, ... } }`

#### Scenario: 获取歌手列表
- **WHEN** 前端调用 `GET /api/artists`
- **THEN** 后端返回 `{ data: [{ id, name, track_count, ... }], total: N }`

### Requirement: 后台管理手动上传音乐
系统 SHALL 在后台管理目录挂载页面提供手动上传音乐的入口，支持单个或多个音频文件上传。

#### Scenario: 上传单个 MP3 文件
- **WHEN** 管理员在目录挂载页面选择并上传一个 MP3 文件
- **THEN** 文件被保存到 `music/` 目录，数据库 `tracks` 表中新增一条记录，页面显示上传成功提示

#### Scenario: 拖拽上传多个文件
- **WHEN** 管理员拖拽多个音频文件到上传区域
- **THEN** 所有文件依次上传，数据库记录批量创建

### Requirement: 真实音频文件测试数据
系统 SHALL 提供可用的真实音频文件用于端到端测试，验证播放器、扫描、API 等核心功能。

#### Scenario: 生成测试音频文件
- **WHEN** 运行测试数据生成脚本
- **THEN** 在 `music/` 目录下生成多个可播放的音频文件（如使用 ffmpeg 生成静音或正弦波片段）

#### Scenario: 触发扫描发现新文件
- **WHEN** 管理员在后台触发扫描
- **THEN** 扫描器发现 `music/` 目录下的音频文件，更新数据库 tracks 表

## MODIFIED Requirements

### Requirement: 后端 /api/profile 路由
**Before**: 返回 `{ id, username, role, email, avatar, ... }` 纯对象，且需要 auth 中间件
**After**: 返回 `{ data: { listen_minutes, fav_count, playlists, top_genres, ... } }` 格式，包含前端需要的所有字段

### Requirement: 后端 /api/favorites 和 /api/history 路由
**Before**: favorites 返回 `{ data: [...tracks], total: N }`，history 返回 `{ data: [...history], total: N }`
**After**: 保持当前格式，但确保 track 字段名与前端一致（`id` 为 string，`dur` 字段对齐）

### Requirement: 后端 /api/artists 和 /api/albums 路由
**Before**: 返回 `{ data: [{ artist, track_count }], total: N }`，缺少 `id` 字段
**After**: 每个条目添加 `id` 字段，`artist` 字段与前端 `name` 字段对齐

## REMOVED Requirements
无