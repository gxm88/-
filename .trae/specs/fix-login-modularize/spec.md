# 登录修复 + 代码模块化 Spec

## Why
1. 前端 API 路径与后端路由不匹配，导致登录失败（`/auth/login` 实际后端是 `/api/login`）
2. 代码体量过大（pages.js 1456行、player.js 1230行、app.js 653行），维护困难
3. 底部播放器进度条需要确认拖拽修复生效

## What Changes
- 修复 `api.js` 中 `request()` 未拼接 BASE 路径的 bug，修正所有 API 路径
- 将 `pages.js` 拆分为按功能模块的文件（home, discover, library, profile, admin, ai 等）
- 将 `player.js` 拆分为核心播放 + 全屏播放器 + UI 绑定
- 将 `app.js` 拆分为路由 + 事件绑定 + 认证
- 确保所有页面跳转、路由、登录功能正常

## Impact
- Affected specs: 无
- Affected code: `js/api.js`, `js/pages.js`, `js/app.js`, `js/player.js`, `index.html`, `server/routes/auth.js`

---

## ADDED Requirements

### Requirement: 登录 API 路径修复
`api.js` 中 `request()` 函数 SHALL 自动拼接 `BASE` 前缀，所有 API 调用路径 SHALL 与后端路由匹配。

#### Scenario: 登录成功
- **WHEN** 用户输入 admin/admin 登录
- **THEN** 前端调用 `POST /api/login`，后端返回 JWT + 用户信息
- **AND** 前端存储 token 并更新 UI

#### 路径映射表
| 前端当前路径 | 修正后路径 | 后端实际端点 |
|-------------|-----------|-------------|
| `/auth/login` | `/login` | `POST /api/login` |
| `/auth/logout` | `/logout` | `POST /api/logout` |
| `/auth/me` | `/profile` | `GET /api/profile` |
| `/user/profile` | `/profile` | `GET /api/profile` |
| `/user/favorites` | `/favorites` | 需新增 |
| `/admin/stats` | `/admin/stats` | `GET /api/admin/stats` |

### Requirement: 代码模块化拆分
系统 SHALL 将大型单文件拆分为独立模块，按功能组织。

#### 拆分方案

**pages.js (1456行) → `js/pages/` 目录：**
```
js/pages/
├── home.js          # 首页
├── discover.js      # 歌单广场
├── charts.js        # 排行榜
├── library.js       # 我的曲库
├── artists.js       # 歌手页
├── albums.js        # 专辑页
├── album-detail.js  # 专辑详情
├── folders.js       # 文件夹浏览
├── profile.js       # 个人中心
├── playlist-detail.js # 歌单详情
├── search.js        # 搜索结果
├── ai.js            # AI 中心/日推/NLP/AI歌单
├── admin.js         # 管理后台入口
├── admin-dashboard.js # 仪表盘
├── admin-library.js   # 曲库管理
├── admin-users.js     # 用户管理
├── admin-ai.js        # AI 配置
├── admin-network.js   # 网络配置
├── admin-backup.js    # 日志/备份
├── admin-metadata.js  # 元数据修复
├── admin-ops.js       # 清理运维
├── admin-playlists.js # 歌单编辑
├── shared.js        # 公共工具函数（pageHero, mediaBlock, rowFor, viewToggleBtn, renderSkeleton 等）
```

**player.js (1230行) → `js/player/` 目录：**
```
js/player/
├── core.js          # 核心状态 + 播放控制 + 队列管理
├── ui.js            # renderTrackBar, renderProgress, renderVolume, bindControls
├── fullscreen.js    # 全屏播放器 + 歌词 + 进度条
├── effects.js       # 均衡器/音效/频谱/播放模式/睡眠定时
```

**app.js (653行) → `js/app/` 目录：**
```
js/app/
├── router.js        # 路由表 + navigate + 导航历史
├── auth.js          # 登录/登出/权限
├── events.js        # bindCards, bindViewToggle, bindGlobalSearch, toast 等
├── init.js          # 初始化入口
```

**api.js (251行) → 保持单文件，修复路径 bug**

### Requirement: 后端登录端点修复
后端 `routes/auth.js` 的 `/login` 端点 SHALL 接受 `admin/admin` 凭据并返回 JWT。

#### Scenario: 后端登录
- **WHEN** 请求 `POST /api/login` with `{"username":"admin","password":"admin"}`
- **THEN** 后端 bcrypt 验证密码，返回 JWT token + user 对象

## 根因分析

### Bug 1: 登录失败
**根因1**：`api.js` `request()` 中 `fetch(path, ...)` 直接使用 path 参数，未拼接 `BASE`（`/api`）。`BASE` 变量定义了但从未使用。

**根因2**：前端 API 路径 `/auth/login` 与后端路由 `/api` + `/login` = `/api/login` 不匹配。如果拼接了 BASE，就变成 `/api/auth/login`，也不对。

**修复**：统一使用 `BASE + path`，并修正所有 API 路径去掉多余的 `/auth`、`/user` 前缀，与后端路由对齐。

### Bug 2: 进度条拖拽
之前已修复（添加 `click` 事件 + `e.preventDefault()`），需确认在预览环境中生效。

### 问题 3: 代码臃肿
`pages.js` 1456 行包含 25+ 个页面函数，`player.js` 1230 行混合播放/UI/效果逻辑。拆分为模块化文件后，每个文件 50-200 行，便于维护。