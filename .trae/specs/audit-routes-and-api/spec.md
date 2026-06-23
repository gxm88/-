# 全面梳理页面跳转、路由、接口预留 Spec

## Why
当前 MuseBox 音乐应用所有数据均为前端硬编码静态数据（data.js），无任何后端 API 调用。页面跳转和路由已基本成型，但存在部分路由缺失、导航与页面内容不匹配、以及完全没有 API 接口预留的问题。需要在保持现有前端体验不变的前提下，系统梳理所有页面、路由、导航和数据流，为后续后端接入定义清晰的接口契约。

## What Changes
- 梳理并文档化所有 18 条路由及其对应的页面函数
- 梳理并文档化 3 套导航系统（侧栏 14 项、移动端 3 项、用户菜单 4 项）
- 梳理并文档化所有数据实体（7 个数据结构）及其字段
- 为每个数据实体定义对应的 RESTful API 接口预留
- 为认证、搜索、AI 推荐、管理后台等核心功能定义 API 契约
- 标记当前硬编码位置，为后续替换为 API 调用做好准备

## Impact
- Affected specs: 无（首次 spec）
- Affected code: `js/data.js`, `js/app.js`, `js/pages.js`, `js/player.js`, `index.html`

---

## 当前状态审计

### 一、路由表（18 条）

| 路由 key | 页面函数 | 页面描述 | 状态 |
|---|---|---|---|
| `home` | `Pages.home()` | 首页（今日推荐 + 最近播放 + 热门歌手 + 本地曲库） | 正常 |
| `discover` | `Pages.discover()` | 歌单广场（推荐歌单 + 热门歌手 + 本地曲库） | 正常 |
| `charts` | `Pages.charts()` | 全网热榜（全球热歌 + 本周新曲 + 本地热播 + 匹配情况） | 正常 |
| `ai` | `Pages.aiCenter()` | AI 智能推荐中心（三策略入口 + AI 歌单 + 听歌画像 + 相似推荐） | 正常 |
| `ai-daily` | `Pages.aiDaily()` | 每日个性化推荐（听歌画像 + 今日推荐曲目 + 相关 AI 歌单） | 正常 |
| `ai-nlp` | `Pages.aiNLP()` | 自然语言生成歌单（输入框 + 推荐 prompt + 生成结果区） | 正常 |
| `playlist-ai` | `Pages.aiPlaylists()` | AI 生成歌单汇总（全部 AI 歌单 + 创作入口 + 每日推荐入口） | 正常 |
| `library` | `Pages.library()` | 全部歌曲（流派过滤 + 排序 + 视图切换） | 正常 |
| `artists` | `Pages.artists()` | 按歌手浏览 | 正常 |
| `albums` | `Pages.albums()` | 按专辑浏览 | 正常 |
| `folders` | `Pages.folders()` | 按文件夹浏览 | 正常 |
| `profile` | `Pages.profile()` | 个人中心（统计 + 收藏/歌单/专辑/歌手/历史 tab） | 正常 |
| `favorites` | `Pages.profile()` | 个人中心（收藏 tab） | 正常 |
| `history` | `Pages.profile()` | 个人中心（历史 tab） | 正常 |
| `search` | `Pages.searchResults(q)` | 搜索结果（歌曲/专辑/歌手/歌单/全网 5 组） | 正常 |
| `playlist-detail` | `Pages.playlistDetail(id)` | 歌单详情（封面 + 曲目列表） | 缺失 `playlist-detail` 路由导航入口 |
| `admin` | `Pages.admin()` | 管理后台（仪表盘 + 曲库管理 + 用户 + AI 配置 + 网络 + 备份） | 正常 |

### 二、导航系统

**侧栏（14 个固定项 + 动态歌单列表）：**
- 发现：首页、歌单广场、全网热榜
- 我的曲库：全部歌曲、按歌手、按专辑、按文件夹
- 智能：AI 推荐中心、AI 生成歌单
- 我的：个人中心、收藏的歌曲、播放历史
- 我的歌单（动态列表，`#side-playlist-list`，当前为空）

**移动端底部导航（3 项）：**
- 发现（映射 discover/charts/search/home）
- 歌曲（映射 library/artists/albums/folders/playlist-detail）
- 我的（映射 profile/favorites/history/ai/playlist-ai/ai-daily/ai-nlp/admin）

**用户下拉菜单（5 项）：**
- 个人中心、我的曲库、我的收藏、进入管理后台、退出登录

### 三、数据实体（7 个，全部硬编码）

| 实体 | 数据源 | 字段 | 记录数 |
|---|---|---|---|
| TRACKS | `data.js` | id, title, artist, album, genre, style, dur, year | 18 |
| ARTISTS | `data.js` | id, name, tag, listeners | 12 |
| ALBUMS | `data.js` | id, title, artist, year, tracks | 12 |
| PLAYLISTS | `data.js` | id, title, desc, tracks, duration, type | 9 |
| CHARTS | `data.js` | rank, title, artist, streams, local | 12 |
| USER_PROFILE | `data.js` | listen_minutes, fav_count, playlists, top_genres, listening_7d | 1 |
| ADMIN_STATS | `data.js` | total_tracks, total_users, storage_used, cpu_load, etc. | 1 |
| FOLDERS | `data.js` | name, count, path | 4 |

### 四、当前 API 调用情况

- **fetch/XMLHttpRequest/WebSocket**: 0 处
- **localStorage**: 仅用于视图切换偏好（`view_*` key）
- **认证**: 纯前端模拟（`login()` 函数手动设置 role 和 userName）
- **搜索**: 纯前端 `Array.filter()` 匹配
- **AI 推荐**: 纯前端 `pickN()` 伪随机选取

---

## ADDED Requirements

### Requirement: API 接口层模块
系统 SHALL 提供统一的 API 接口层模块 `js/api.js`，封装所有后端请求，支持在无后端时降级为本地 mock 数据。

#### Scenario: 后端不可用时降级
- **WHEN** API 请求失败或后端未部署
- **THEN** 系统 SHALL 自动降级使用 `data.js` 中的静态 mock 数据
- **AND** 不影响前端页面正常渲染

#### Scenario: API 基础路径可配置
- **WHEN** 部署到不同环境
- **THEN** 系统 SHALL 通过 `API_BASE_URL` 配置项切换后端地址

---

### Requirement: 歌曲数据 API
系统 SHALL 定义歌曲 CRUD 接口。

| 方法 | 路径 | 说明 | 当前硬编码位置 |
|---|---|---|---|
| GET | `/api/tracks` | 获取全部歌曲列表 | `data.js TRACKS` |
| GET | `/api/tracks/:id` | 获取单首歌曲详情 | `trackById()` |
| GET | `/api/tracks?genre=X&sort=Y` | 按流派/排序过滤 | `library()` 页面 filter |
| POST | `/api/tracks` | 上传/添加歌曲 | 无 |
| DELETE | `/api/tracks/:id` | 删除歌曲 | 无 |

#### Scenario: 全部歌曲页面加载
- **WHEN** 用户访问 `/library` 路由
- **THEN** 系统调用 `GET /api/tracks` 获取歌曲列表
- **AND** 流派过滤和排序通过 query 参数传递

---

### Requirement: 歌单数据 API
系统 SHALL 定义歌单 CRUD 接口。

| 方法 | 路径 | 说明 | 当前硬编码位置 |
|---|---|---|---|
| GET | `/api/playlists` | 获取全部歌单 | `data.js PLAYLISTS` |
| GET | `/api/playlists/:id` | 获取歌单详情（含歌曲列表） | `playlistDetail()` |
| POST | `/api/playlists` | 创建歌单 | `#btn-new-playlist`（无功能） |
| PUT | `/api/playlists/:id` | 编辑歌单 | 无 |
| DELETE | `/api/playlists/:id` | 删除歌单 | 无 |
| GET | `/api/playlists?type=ai` | 按类型过滤歌单 | `aiPlaylists()` / `aiCenter()` |

#### Scenario: 歌单广场加载
- **WHEN** 用户访问 `/discover` 路由
- **THEN** 系统调用 `GET /api/playlists` 获取全部歌单

---

### Requirement: 榜单数据 API
系统 SHALL 定义榜单接口。

| 方法 | 路径 | 说明 | 当前硬编码位置 |
|---|---|---|---|
| GET | `/api/charts` | 获取全网热榜 | `data.js CHARTS` |
| GET | `/api/charts/local` | 获取本地热播榜 | 无 |

#### Scenario: 全网热榜页面加载
- **WHEN** 用户访问 `/charts` 路由
- **THEN** 系统调用 `GET /api/charts` 获取榜单数据

---

### Requirement: 用户认证 API
系统 SHALL 定义用户认证接口。

| 方法 | 路径 | 说明 | 当前 hardcode 位置 |
|---|---|---|---|
| POST | `/api/auth/login` | 用户登录 | `app.js login()` |
| POST | `/api/auth/logout` | 用户登出 | `app.js logout()` |
| GET | `/api/auth/me` | 获取当前用户信息 | `state.role`, `state.userName` |

#### Scenario: 用户登录
- **WHEN** 用户点击登录按钮
- **THEN** 系统调用 `POST /api/auth/login` 发送凭证
- **AND** 成功后更新全局 `state` 并刷新 UI

---

### Requirement: 用户数据 API
系统 SHALL 定义用户相关数据接口。

| 方法 | 路径 | 说明 | 当前 hardcode 位置 |
|---|---|---|---|
| GET | `/api/user/profile` | 获取用户画像 | `data.js USER_PROFILE` |
| GET | `/api/user/favorites` | 获取收藏列表 | `profileColtab("songs")` |
| GET | `/api/user/history` | 获取播放历史 | `profileColtab("history")` |
| POST | `/api/user/favorites/:trackId` | 收藏歌曲 | 无 |
| DELETE | `/api/user/favorites/:trackId` | 取消收藏 | 无 |
| POST | `/api/user/history/:trackId` | 记录播放 | 无 |

#### Scenario: 个人中心加载
- **WHEN** 用户访问 `/profile` 路由
- **THEN** 系统调用 `GET /api/user/profile` 获取用户画像
- **AND** 调用 `GET /api/user/favorites` 获取收藏列表

---

### Requirement: AI 推荐 API
系统 SHALL 定义 AI 推荐接口。

| 方法 | 路径 | 说明 | 当前 hardcode 位置 |
|---|---|---|---|
| GET | `/api/ai/daily` | 每日推荐歌曲 | `aiDaily()` pickN |
| POST | `/api/ai/nlp` | 自然语言生成歌单 | `aiNLP()` doGenerate |
| GET | `/api/ai/playlists` | AI 生成的歌单列表 | `aiPlaylists()` |
| GET | `/api/ai/similar` | 相似歌曲推荐 | `aiCenter()` 相似推荐区 |

#### Scenario: 自然语言生成歌单
- **WHEN** 用户在 NLP 页面输入描述并点击生成
- **THEN** 系统调用 `POST /api/ai/nlp` 发送 `{ prompt: "..." }`
- **AND** 接收返回的歌曲列表并渲染结果

---

### Requirement: 搜索 API
系统 SHALL 定义搜索接口。

| 方法 | 路径 | 说明 | 当前 hardcode 位置 |
|---|---|---|---|
| GET | `/api/search?q=keyword` | 全局搜索 | `searchResults()` Array.filter |

#### Scenario: 全局搜索
- **WHEN** 用户输入搜索关键词
- **THEN** 系统调用 `GET /api/search?q=keyword`
- **AND** 返回按歌曲/专辑/歌手/歌单/全网分组的聚合结果

---

### Requirement: 管理后台 API
系统 SHALL 定义管理员接口。

| 方法 | 路径 | 说明 | 当前 hardcode 位置 |
|---|---|---|---|
| GET | `/api/admin/stats` | 获取仪表盘统计数据 | `data.js ADMIN_STATS` |
| GET | `/api/admin/users` | 获取用户列表 | `admUsers()` |
| POST | `/api/admin/scan` | 触发目录扫描 | `admLibraryMgmt()` |
| GET | `/api/admin/logs` | 获取扫描日志 | `admDashboard()` |
| PUT | `/api/admin/ai-config` | 更新 AI 模型配置 | `admAIConfig()` |
| GET | `/api/admin/network` | 获取网络 / TCP 状态 | `admNetwork()` |

#### Scenario: 管理员仪表盘
- **WHEN** 管理员访问 `/admin` 路由
- **THEN** 系统调用 `GET /api/admin/stats` 获取实时统计数据

---

### Requirement: 歌手/专辑/文件夹 API
系统 SHALL 定义浏览类接口。

| 方法 | 路径 | 说明 | 当前 hardcode 位置 |
|---|---|---|---|
| GET | `/api/artists` | 获取全部歌手 | `data.js ARTISTS` |
| GET | `/api/artists/:id` | 获取歌手详情（含歌曲） | `artists()` |
| GET | `/api/albums` | 获取全部专辑 | `data.js ALBUMS` |
| GET | `/api/albums/:id` | 获取专辑详情（含歌曲） | `albums()` |
| GET | `/api/folders` | 获取文件夹结构 | `data.js FOLDERS` |
| GET | `/api/folders/:path` | 获取文件夹下歌曲 | `folders()` |

---

## 导航问题修复

### Requirement: 歌单详情页入口
系统 SHALL 提供从歌单广场/首页点击歌单卡片进入详情页的功能。

#### Scenario: 点击歌单卡片
- **WHEN** 用户点击歌单卡片（`.media-block[data-playlist]`）
- **THEN** 系统 SHALL 导航到 `playlist-detail` 路由并传入歌单 ID

### Requirement: 播放历史页入口
系统 SHALL 确保侧栏"播放历史"按钮正确导航到历史 tab。

#### Scenario: 点击播放历史
- **WHEN** 用户点击侧栏"播放历史"按钮
- **THEN** 系统 SHALL 导航到 `history` 路由并激活播放历史 tab

### Requirement: 新建歌单功能
系统 SHALL 为侧栏"新建歌单"按钮（`#btn-new-playlist`）提供功能入口。

#### Scenario: 点击新建歌单
- **WHEN** 用户点击侧栏 + 按钮
- **THEN** 系统 SHALL 弹出新建歌单对话框或导航到创建页面