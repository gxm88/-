# AI 模型管理优化与真实数据 Spec

## Why
AI 模型管理页面当前使用硬编码假数据，开关无法正常工作，顶部统计数字为假数据。需要全面替换为真实后端数据，并实现完整的模型 CRUD 功能。

## What Changes
- **移除所有种子假数据**：清空 `db.js` 中 `seedData()` 的 tracks/playlists/ai_configs/folders 插入逻辑，删除 `music/` 目录下的测试文件，保留空表结构
- **AI 模型卡片展示**：从后端 API 获取真实模型列表，展示为卡片形式
- **添加模型弹出 UI**：点击"添加模型"弹出表单，支持输入 provider、model_name、api_key、description 等字段
- **修复开关**：开关切换调用后端 PUT 接口更新 enabled 状态，而非仅 toggle CSS class
- **顶部统计真实化**：从 `/api/stats` 获取真实统计数据（歌曲数、用户数、播放量、AI 调用次数）

## Impact
- Affected specs: fix-profile-data-integration-upload
- Affected code:
  - `server/db.js` — 清空 seedData，仅保留用户和 system_config 初始化
  - `server/routes/ai.js` — 模型列表返回格式统一为 `{ data, total }`，字段映射
  - `server/index.js` — 新增 `/api/stats` 路由
  - `js/pages/admin-ai.js` — 完全重写，卡片展示 + 添加弹窗 + 开关修复
  - `js/pages/admin-dashboard.js` — 无需修改（已从 API 获取 stats）
  - `js/api.js` — 补全 AI 模型 CRUD 方法
  - `music/` 目录 — 清空所有测试文件

## ADDED Requirements

### Requirement: 清空所有种子假数据
系统 SHALL 移除数据库初始化时的所有假数据（tracks, playlists, ai_configs, folders, scan_logs），仅保留用户和 system_config 初始化。

#### Scenario: 首次启动
- **WHEN** 数据库为空，服务首次启动
- **THEN** 仅创建 admin/user/guest 三个用户和 system_config 默认值，tracks/playlists/ai_configs/folders 表均为空

### Requirement: AI 模型卡片展示
系统 SHALL 从后端 `/api/ai/models` 获取真实模型列表，每个模型以卡片形式展示，包含：名称、描述、API Key（脱敏）、今日调用次数、启用/禁用开关。

#### Scenario: 管理员查看 AI 模型
- **WHEN** 管理员进入 AI 模型配置页面
- **THEN** 页面展示所有 AI 模型的卡片列表，数据来自后端 API

#### Scenario: 无模型时
- **WHEN** 数据库中没有任何 AI 模型
- **THEN** 页面显示空状态提示"暂无模型，点击添加模型开始配置"

### Requirement: 添加模型弹出 UI
系统 SHALL 提供弹出表单，供管理员输入新模型的 Provider、Model Name、API Key 和 Description。

#### Scenario: 添加新模型
- **WHEN** 管理员点击"添加模型"按钮
- **THEN** 弹出模态框，包含 Provider、Model Name、API Key（密码字段）、Description 输入框，以及"取消"和"保存"按钮

#### Scenario: 保存模型
- **WHEN** 管理员填写表单并点击保存
- **THEN** 调用 `POST /api/ai/models` 创建模型，关闭弹窗，刷新模型列表

#### Scenario: 表单验证
- **WHEN** 管理员未填写 Provider 或 Model Name
- **THEN** 保存按钮不可用或提示必填

### Requirement: 修复模型开关
系统 SHALL 使模型卡片的开关控件的切换调用后端 API 更新 enabled 状态。

#### Scenario: 启用模型
- **WHEN** 管理员点击已禁用模型的开关
- **THEN** 调用 `PUT /api/ai/models/:id` 设置 `enabled: true`，开关变为启用状态

#### Scenario: 禁用模型
- **WHEN** 管理员点击已启用模型的开关
- **THEN** 调用 `PUT /api/ai/models/:id` 设置 `enabled: false`，开关变为禁用状态

### Requirement: 删除模型
系统 SHALL 支持删除模型，点击卡片上的删除按钮后弹出确认，确认后调用 `DELETE /api/ai/models/:id`。

## MODIFIED Requirements

### Requirement: 后端 `/api/ai/models` 路由
**Before**: 返回 `{ data: [...], total: N }`，但字段使用数据库原名 `model_name`、`calls_today`
**After**: 返回 `{ data: [{ id, provider, name, api_key, enabled, calls, description }], total: N }`，api_key 自动脱敏

### Requirement: 后端 `/api/stats` 路由
**Before**: 不存在
**After**: 新增 `GET /api/stats`，返回 `{ data: { total_tracks, total_users, total_plays_24h, ai_calls_today, storage_used, storage_total, cpu_load, mem_load, tcp_connections } }`

## REMOVED Requirements
无