# Checklist

- [x] `js/api.js` 文件已创建，包含 `API_BASE_URL` 配置和 `request()` 通用函数
- [x] `js/api.js` 导出所有 API 方法：tracks, playlists, charts, auth, user, ai, search, admin, artists, albums, folders
- [x] API 请求失败时自动降级为 `data.js` mock 数据，页面不白屏
- [x] 点击歌单卡片（`.media-block[data-playlist]`）能正确跳转到 `playlist-detail` 详情页
- [x] 点击专辑卡片（`.media-block[data-album]`）能正确跳转到 `album-detail` 专辑详情页
- [x] 侧栏 `#btn-new-playlist` 按钮可弹出新建歌单对话框
- [x] 新建歌单成功后侧栏动态歌单列表实时更新
- [x] 侧栏 `#side-playlist-list` 在应用初始化时显示用户歌单列表
- [x] 侧栏动态歌单列表项可点击跳转到 `playlist-detail` 详情页
- [x] `login()` 函数先调用 `POST /api/auth/login`，失败时降级为本地模拟
- [x] `logout()` 函数调用 `POST /api/auth/logout`
- [x] 19 条路由（home、discover、charts、ai、ai-daily、ai-nlp、playlist-ai、library、artists、albums、album-detail、folders、profile、favorites、history、search、playlist-detail、admin）均能正常渲染
- [x] 侧栏 14 项导航高亮和跳转正确
- [x] 移动端底部 3 项导航激活和跳转正确
- [x] 用户下拉菜单 5 项功能正常
- [x] 语法检查通过（`node -c js/api.js` && `node -c js/pages.js` && `node -c js/app.js`）