# Tasks

- [x] Task 1: 修复 CSS 布局冲突
  - [x] 移除 `layout.css` 桌面端媒体查询中 `player-bar` 的无效 `grid-template-columns` 规则
  - [x] 统一 `player-bar` 高度使用 `--player-h` 变量（或保持 64px 并删除未使用的变量）

- [x] Task 2: 将 `pages.js` 页面数据源改为通过 API 层获取
  - [x] 修改 `home()` 页面：通过 `API.getTracks()`、`API.getPlaylists()`、`API.getArtists()` 获取数据
  - [x] 修改 `discover()` 页面：通过 `API.getPlaylists()`、`API.getArtists()` 获取数据
  - [x] 修改 `charts()` 页面：通过 `API.getCharts()` 获取数据
  - [x] 修改 `library()` 页面：通过 `API.getTracks()` 获取数据
  - [x] 修改 `artists()`、`albums()`、`folders()` 页面：通过相应 API 方法获取数据
  - [x] 修改 `profile()` 页面：通过 `API.getProfile()`、`API.getFavorites()`、`API.getHistory()` 获取数据
  - [x] 修改 `playlistDetail()` 页面：通过 `API.getPlaylist(id)` 获取数据
  - [x] 修改 `albumDetail()` 页面：通过 `API.getAlbum(id)` 获取数据
  - [x] 修改 `searchResults()` 页面：通过 `API.search(q)` 获取数据
  - [x] 修改 AI 相关页面：通过 `API.getDailyRecommend()`、`API.getAIPlaylists()` 等获取数据
  - [x] 修改 `admin()` 页面：通过 `API.getAdminStats()` 等获取数据

- [x] Task 3: 统一播放入口数据源
  - [x] 修改 `player.js` `togglePlay()`：通过 `API.getTracks()` 获取默认歌曲列表
  - [x] 修改 `app.js` `bindCards()` 中歌手/文件夹/歌单播放入口：通过 API 获取数据
  - [x] 修改 `app.js` NLP 生成：通过 `API.generateNLP()` 获取数据

- [x] Task 4: 添加数据加载状态（骨架屏）
  - [x] 在 `pages.js` 中添加 `renderSkeleton(type)` 工具函数
  - [x] 在 `navigate()` 中先渲染骨架屏，再异步加载数据
  - [x] 添加错误状态提示和重试按钮

- [x] Task 5: 修复全屏播放器硬编码数据
  - [x] 播放次数改为从 `API.getTrack(id)` 获取
  - [x] AI 匹配度改为从 `API.getSimilar()` 计算
  - [x] 歌词改为从 track 数据中获取（无则显示占位）

- [x] Task 6: 收藏按钮状态持久化
  - [x] `toggleFavorite()` 中调用 `API.addFavorite()` / `API.removeFavorite()` 持久化
  - [x] 页面加载时调用 `API.getFavorites()` 恢复收藏状态

- [x] Task 7: 添加空状态提示
  - [x] 搜索无结果时显示空状态提示
  - [x] 歌单/专辑无歌曲时显示空状态提示

- [x] Task 8: 自测验证
  - [x] 验证所有路由页面渲染正常
  - [x] 验证 API 降级后页面仍正常显示
  - [x] 验证骨架屏加载流程
  - [x] 验证收藏按钮状态持久化
  - [x] 验证空状态提示
  - [x] 语法检查全部通过

# Task Dependencies
- Task 2、3 依赖 Task 1（无代码依赖，但建议先修 CSS 再改 JS）
- Task 4 依赖 Task 2（数据加载状态需要异步数据流程）
- Task 5、6、7 可与 Task 2、3、4 并行
- Task 8 依赖所有其他任务完成