# Checklist

- [x] 数据库 `seedData()` 不再插入 tracks/playlists/ai_configs/folders/scan_logs 假数据
- [x] `/workspace/music/` 目录为空（测试文件已删除）
- [x] `/api/stats` 路由返回真实统计数据（total_tracks, total_users, total_plays_24h, ai_calls_today）
- [x] `/api/ai/models` 返回格式为 `{ data: [{ id, provider, name, api_key, calls, description }], total: N }`
- [x] api_key 在前端展示时已脱敏（仅显示前 6 位 + `...`）
- [x] 点击"添加模型"弹出模态框，包含 Provider、Model Name、API Key、Description 输入框
- [x] 模态框保存按钮调用 `POST /api/ai/models` 创建模型并刷新列表
- [x] 模型卡片开关点击调用 `PUT /api/ai/models/:id` 更新 enabled 状态
- [x] 模型卡片删除按钮点击后弹出确认，确认后调用 `DELETE /api/ai/models/:id`
- [x] 无模型时显示空状态提示
- [x] 仪表盘顶部统计数字来自 `/api/stats` 真实数据
- [x] `js/api.js` 包含 getAIModels / createAIModel / updateAIModel / deleteAIModel 方法