# Tasks

- [x] Task 1: 创建 API 接口层模块 `js/api.js`
  - [x] 定义 `API_BASE_URL` 配置项，默认指向 `/api`
  - [x] 封装 `request(method, path, body)` 通用请求函数，含超时和错误处理
  - [x] 实现降级逻辑：请求失败时回退到 `data.js` 中的 mock 数据
  - [x] 导出所有 API 方法（tracks、playlists、charts、auth、user、ai、search、admin、artists、albums、folders）

- [x] Task 2: 修复导航缺失 — 歌单卡片点击跳转详情页
  - [x] 在 `app.js` 的 `bindCards()` 中添加 `.media-block[data-playlist]` 的点击事件（已存在）
  - [x] 点击时导航到 `playlist-detail` 路由并传入 `data-playlist` 值作为歌单 ID
  - [x] 同理处理 `.media-block[data-album]` 导航到新增的 `album-detail` 专辑详情页

- [x] Task 3: 修复新建歌单按钮功能
  - [x] 为 `#btn-new-playlist` 绑定点击事件，弹出简易新建歌单对话框（名称 + 描述）
  - [x] 创建成功后调用 `API.createPlaylist()` 并更新侧栏动态歌单列表

- [x] Task 4: 修复侧栏动态歌单列表渲染
  - [x] 在 `init()` 中调用 `renderSidePlaylists()` 渲染 `#side-playlist-list`
  - [x] 列表项可点击，通过 `data-payload` 导航到 `playlist-detail` 路由

- [x] Task 5: 将 `data.js` 改造为 mock 数据源
  - [x] 保持 `data.js` 现有数据结构不变，作为 API 降级时的 fallback
  - [x] 在 `api.js` 中实现 mock 函数：根据请求路径返回对应的 `data.js` 数据
  - [x] 确保各页面在 API 不可用时仍能正常渲染（mock 降级自动触发）

- [x] Task 6: 接入认证 API（预留接口）
  - [x] 修改 `login()` 函数，先调用 `API.login()`，失败时降级为本地模拟
  - [x] 修改 `logout()` 函数，调用 `API.logout()`
  - [x] 全局 click delegate 支持 `data-payload` 传递参数

- [x] Task 7: 自测验证全部路由和导航
  - [x] 逐一验证 19 条路由（含新增 album-detail）的页面渲染正常
  - [x] 验证侧栏 14 项 + 动态歌单导航高亮和跳转正确
  - [x] 验证移动端 3 项底部导航激活和跳转正确
  - [x] 验证用户菜单 5 项功能正常
  - [x] 验证歌单卡片点击跳转详情页
  - [x] 验证新建歌单功能
  - [x] 语法检查全部通过

# Task Dependencies
- Task 5 依赖 Task 1（api.js 创建完成后才能改造 data.js 为 mock fallback）
- Task 6 依赖 Task 1（需要 api.js 提供认证 API 方法）
- Task 2、3、4 可与 Task 1 并行
- Task 7 依赖所有其他任务完成