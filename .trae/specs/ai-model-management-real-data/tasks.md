# Tasks

- [x] Task 1: 清空所有种子假数据
  - [x] 修改 `server/db.js` 的 `seedData()`：移除 tracks/playlists/ai_configs/folders/scan_logs 插入，仅保留用户和 system_config 初始化
  - [x] 删除 `/workspace/music/` 目录下所有测试音频文件
  - [x] 删除现有数据库文件，让服务重启时重建空表

- [x] Task 2: 后端 `/api/stats` 路由
  - [x] 在 `server/index.js` 或新建 `server/routes/stats.js` 添加 `GET /api/stats` 路由
  - [x] 返回真实统计数据：total_tracks（tracks 表 COUNT）、total_users（users 表 COUNT）、total_plays_24h（play_history 24h 内 COUNT）、ai_calls_today（ai_configs 表汇总 calls_today）、storage_used/storage_total（磁盘使用）、cpu_load/mem_load（系统信息）、tcp_connections

- [x] Task 3: 后端 AI 模型路由格式统一
  - [x] 修改 `server/routes/ai.js` 的 GET /models 路由：字段映射 `model_name` → `name`，`calls_today` → `calls`，api_key 自动脱敏（仅显示前 6 位 + `...`）
  - [x] 修改 POST /models 路由：返回格式 `{ data: { id, provider, name, ... } }`
  - [x] 修改 PUT /models/:id 路由：返回格式 `{ data: { ... } }`

- [x] Task 4: 前端 AI 模型管理页面重写
  - [x] 重写 `js/pages/admin-ai.js`：
    - 从 `API.getAIModels()` 获取真实模型列表
    - 模型以卡片形式展示，每个卡片包含：名称、描述、脱敏 API Key、今日调用次数、开关、删除按钮
    - 点击"添加模型"弹出模态框表单（Provider、Model Name、API Key、Description）
    - 开关点击调用 `API.updateAIModel(id, enabled)` 更新后端
    - 删除按钮点击弹出确认，确认后调用 `API.deleteAIModel(id)`
    - 无模型时显示空状态
    - 保留底部的推荐策略和爬虫配置区域（暂不改动）

- [x] Task 5: 前端 API 层补全
  - [x] 在 `js/api.js` 添加：
    - `getAIModels()` — 调用 `GET /api/ai/models`
    - `createAIModel(data)` — 调用 `POST /api/ai/models`
    - `updateAIModel(id, data)` — 调用 `PUT /api/ai/models/:id`
    - `deleteAIModel(id)` — 调用 `DELETE /api/ai/models/:id`

# Task Dependencies
- Task 2 可与 Task 1 并行
- Task 3 可与 Task 1、Task 2 并行
- Task 4 依赖 Task 3（前端需要后端格式统一）
- Task 5 可与 Task 3 并行