# MuseBox 全项目页面审计 Spec

## Why
当前项目已完成基础架构搭建（路由、API 层、播放器、所有页面），但存在以下问题：页面渲染全部绕过 API 层直接使用 data.js 硬编码数据、CSS 存在死代码和冲突、部分组件缺少加载/错误状态处理。需要进行全面审计，修复发现的问题，确保后期可无缝接入后端服务。

## What Changes
- 将所有页面渲染的数据源从 `data.js` 全局变量改为通过 `API.*` 层获取，支持异步加载和降级
- 修复 CSS 死代码：`player-bar` 在桌面端媒体查询中错误地设置了 `grid-template-columns`（与 `display: flex` 冲突）
- 修复 `player-bar` 在桌面端 `@media (min-width: 769px)` 中 `grid-template-columns` 与 `display:flex` 的冲突
- 为数据加载场景添加骨架屏/加载状态，避免白屏
- 统一 `pickN()` 调用方式，避免页面直接依赖 `TRACKS` 全局变量
- 补充缺失的 UI 反馈（收藏按钮状态同步、空状态提示等）
- 修复全屏播放器中硬编码的随机数据（播放次数、匹配度）
- **BREAKING**: 无，所有改动保持向后兼容，API 降级逻辑不变

## Impact
- Affected specs: `audit-routes-and-api`（已完成，本次为其补充实现）
- Affected code: `js/pages.js`, `js/app.js`, `js/player.js`, `css/layout.css`, `index.html`

---

## ADDED Requirements

### Requirement: 页面数据统一通过 API 层获取
所有页面 SHALL 通过 `API.*` 方法获取数据，而非直接读取 `data.js` 全局变量。API 不可用时自动降级为 mock 数据。

#### Scenario: 首页渲染
- **WHEN** 用户访问首页
- **THEN** 系统调用 `API.getTracks()` 获取歌曲数据
- **AND** 调用 `API.getPlaylists({ type: "recommended" })` 获取推荐歌单
- **AND** 调用 `API.getArtists()` 获取热门歌手
- **AND** API 失败时自动降级为 data.js mock 数据

#### Scenario: 歌单广场渲染
- **WHEN** 用户访问 `/discover`
- **THEN** 系统调用 `API.getPlaylists()` 获取全部歌单
- **AND** 调用 `API.getArtists()` 获取热门歌手

#### Scenario: 个人中心渲染
- **WHEN** 用户访问 `/profile`
- **THEN** 系统调用 `API.getProfile()` 获取用户画像
- **AND** 调用 `API.getFavorites()` 获取收藏列表
- **AND** 调用 `API.getHistory()` 获取播放历史

### Requirement: 数据加载状态
系统 SHALL 在数据加载期间显示骨架屏，加载完成后显示实际内容。

#### Scenario: 数据加载中
- **WHEN** 页面发起 API 请求
- **THEN** 系统 SHALL 显示骨架屏占位
- **AND** 加载完成后替换为实际内容

#### Scenario: 数据加载失败
- **WHEN** API 请求失败且降级也失败
- **THEN** 系统 SHALL 显示友好的错误提示和重试按钮

### Requirement: 修复 CSS 布局冲突
系统 SHALL 移除 `player-bar` 桌面端媒体查询中无效的 `grid-template-columns` 属性。

#### Scenario: 桌面端播放器布局
- **WHEN** 视口宽度 ≥ 769px
- **THEN** 播放器 SHALL 使用 `display: flex` 水平布局
- **AND** 不再存在无效的 `grid-template-columns` 规则

### Requirement: 统一播放入口数据源
所有播放入口（卡片点击、歌单播放、歌手播放、文件夹播放）SHALL 通过 `API.getTracks()` 或 `API.getPlaylist(id)` 获取数据，而非直接调用 `pickN(TRACKS, ...)`。

#### Scenario: 点击歌单卡片播放
- **WHEN** 用户点击歌单卡片的播放按钮
- **THEN** 系统调用 `API.getPlaylist(id)` 获取歌单歌曲列表
- **AND** 将获取到的歌曲传入 `Player.playAll()`

#### Scenario: 播放器初始化队列
- **WHEN** 用户点击播放按钮且队列为空
- **THEN** 系统调用 `API.getTracks()` 获取默认歌曲列表
- **AND** 将获取到的歌曲传入 `Player.loadTracks()`

### Requirement: 全屏播放器数据真实化
全屏播放器 SHALL 使用真实数据替代硬编码的随机值。

#### Scenario: 打开全屏播放器
- **WHEN** 用户打开全屏播放器
- **THEN** 播放次数从 `API.getTrack(id)` 获取
- **AND** AI 匹配度从 `API.getSimilar()` 计算
- **AND** 歌词从 `API.getTrack(id).lyrics` 获取（如无则显示占位歌词）

### Requirement: 收藏按钮状态持久化
系统 SHALL 在页面切换和刷新后保持收藏按钮状态。

#### Scenario: 收藏歌曲
- **WHEN** 用户点击收藏按钮
- **THEN** 系统调用 `API.addFavorite(trackId)` 持久化
- **AND** 按钮状态即时更新
- **AND** 同一首歌在其他页面也显示为已收藏

### Requirement: 空状态提示
系统 SHALL 在无数据时显示友好的空状态提示。

#### Scenario: 搜索无结果
- **WHEN** 搜索关键词无匹配结果
- **THEN** 系统 SHALL 显示"未找到相关结果"提示
- **AND** 提示用户尝试其他关键词

#### Scenario: 歌单为空
- **WHEN** 歌单详情页无歌曲
- **THEN** 系统 SHALL 显示"歌单中暂无歌曲"提示

---

## MODIFIED Requirements

### Requirement: CSS 桌面端播放器布局（修改）
桌面端播放器 SHALL 使用 `display: flex` 布局，移除无效的 `grid-template-columns` 规则。

**Before**: `@media (min-width: 769px)` 中 `.player-bar { grid-template-columns: 1.1fr 1.4fr 1fr; }`（无效，因为 `.player-bar` 是 `display: flex`）

**After**: 删除该无效规则，保留 `padding: 10px 18px` 和 `page-body { padding-bottom: 110px }`

---

## 审计发现总览

### 一、CSS 问题
| # | 问题 | 位置 | 严重程度 |
|---|------|------|----------|
| 1 | `player-bar` 桌面端媒体查询中 `grid-template-columns` 与 `display:flex` 冲突 | `layout.css` L1001-1002 | 低（死代码，不生效） |
| 2 | `player-bar` 高度硬编码为 `64px`，但 `--player-h` 变量定义为 `78px` 未使用 | `layout.css` L374 vs `design-tokens.css` L64 | 低（不一致） |

### 二、JS 数据流问题
| # | 问题 | 位置 | 严重程度 |
|---|------|------|----------|
| 3 | `pages.js` 所有页面函数直接使用 `TRACKS`/`PLAYLISTS` 等全局变量 | `pages.js` 全局 | 高（阻塞后端接入） |
| 4 | `player.js` `togglePlay()` 直接调用 `pickN(TRACKS, 12, 0)` | `player.js` L724 | 高 |
| 5 | `app.js` `bindCards()` 中所有播放入口直接使用 `TRACKS` | `app.js` L199-235 | 高 |
| 6 | `app.js` NLP 生成直接使用 `TRACKS` | `app.js` L251-252 | 高 |
| 7 | 全屏播放器播放次数和匹配度为随机数 | `player.js` L482-483 | 中 |
| 8 | 全屏播放器歌词为硬编码 | `player.js` L489-498 | 中 |

### 三、UI/UX 问题
| # | 问题 | 位置 | 严重程度 |
|---|------|------|----------|
| 9 | 无数据加载状态（骨架屏/loading） | 全局 | 中 |
| 10 | 搜索无结果时无空状态提示 | `pages.js` `searchResults()` | 低 |
| 11 | 收藏按钮状态在页面切换后丢失（未持久化到 API） | `player.js` `toggleFavorite()` | 中 |
| 12 | 歌单详情页无歌曲时无空状态提示 | `pages.js` `playlistDetail()` | 低 |

### 四、可访问性/兼容性
| # | 问题 | 位置 | 严重程度 |
|---|------|------|----------|
| 13 | 无键盘导航支持（Tab 键无法聚焦到播放器按钮） | `index.html` 播放器按钮 | 低 |
| 14 | 无 `aria-label` 属性 | `index.html` 全局 | 低 |