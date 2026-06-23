# Tasks

- [x] Task 1: 修复 API 路径与后端路由匹配
  - [x] 修改 `api.js` `request()` 使用 `BASE + path` 拼接完整 URL
  - [x] 修正所有 API 方法中的路径参数（`/auth/login` → `/login`，`/auth/me` → `/profile` 等）
  - [x] 修正 mock 降级函数中的路径匹配
  - [x] 确保后端 `routes/auth.js` 登录端点接受 `admin/admin` 凭据

- [x] Task 2: 拆分 pages.js 为模块化文件
  - [x] 创建 `js/pages/` 目录
  - [x] 提取 `shared.js`（公共工具函数：pageHero, mediaBlock, rowFor, viewToggleBtn, renderSkeleton, pickN 等）
  - [x] 拆分各页面函数到独立文件
  - [x] 创建 `js/pages/index.js` 汇总导出所有页面函数
  - [x] 更新 `index.html` 的 `<script>` 标签加载顺序

- [x] Task 3: 拆分 player.js 为模块化文件
  - [x] 创建 `js/player/` 目录
  - [x] 提取 `core.js`（state, 播放/暂停/切歌/队列）
  - [x] 提取 `ui.js`（renderTrackBar, renderProgress, renderVolume, bindControls）
  - [x] 提取 `fullscreen.js`（全屏播放器 + 歌词）
  - [x] 提取 `effects.js`（均衡器/音效/频谱/播放模式/睡眠定时）
  - [x] 创建 `js/player/index.js` 汇总导出
  - [x] 更新 `index.html` 的 `<script>` 标签

- [x] Task 4: 拆分 app.js 为模块化文件
  - [x] 创建 `js/app/` 目录
  - [x] 提取 `router.js`（路由表 + navigate + goBack + historyStack）
  - [x] 提取 `auth.js`（login/logout/updateUserMenu）
  - [x] 提取 `events.js`（bindCards, bindViewToggle, bindGlobalSearch, showToast, afterRender 等）
  - [x] 创建 `js/app/init.js`（初始化入口，合并所有模块）
  - [x] 更新 `index.html` 的 `<script>` 标签

- [x] Task 5: 自测验证
  - [x] 验证后端服务启动正常
  - [x] 验证 admin/admin 登录成功
  - [x] 验证头像菜单 → 进入管理后台跳转正常
  - [x] 验证底部播放器进度条可拖拽和点击
  - [x] 验证所有页面路由正常渲染
  - [x] 语法检查全部通过

# Task Dependencies
- Task 2 依赖 Task 1（路径修复后页面才能正常加载数据）
- Task 3、4 可与 Task 2 并行
- Task 5 依赖所有任务完成