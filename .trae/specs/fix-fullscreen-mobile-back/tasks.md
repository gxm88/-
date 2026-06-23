# Tasks

- [x] Task 1: 修复全屏播放器进度条交互
  - [x] 将 `fs-progress-bar` 的拖拽事件绑定从 `bindControls()` 移到 `renderFullscreen()` 中，确保全屏打开后重新绑定
  - [x] 添加 `click` 事件处理（点击跳转），补充拖拽外的点击交互
  - [x] 使用 `_fsDragBound` 标记防止重复绑定
  - [x] 对 `touchstart`/`touchmove`/`touchend` 添加 `{ passive: false }` 和 `e.preventDefault()` 防止移动端滚动冲突

- [x] Task 2: 修复全屏播放器关闭按钮
  - [x] 在 `index.html` 中给 `btn-fs-close` 添加内联 `onclick="Player.closeFullscreen()"` 作为 fallback
  - [x] 在 `player.js` 中新增 `closeFullscreen()` 导出函数
  - [x] 在 `closeFullscreen()` 中重置 `_fsDragBound` 确保下次打开重新绑定

- [x] Task 3: 添加移动端页面返回键
  - [x] 在 `app.js` 中添加导航历史栈 `historyStack`，在 `navigate()` 中记录历史
  - [x] 新增 `goBack()` 函数，从历史栈弹出并导航回上一页
  - [x] 在 `index.html` 移动端顶部栏添加返回按钮元素（`id="mobile-back-btn"`）
  - [x] 在 `navigate()` 中根据当前路由控制返回按钮的显示/隐藏（首页隐藏）
  - [x] 添加移动端返回按钮 CSS 样式

- [x] Task 4: 自测验证
  - [x] 验证全屏播放器进度条可点击跳转
  - [x] 验证全屏播放器进度条可拖拽跳转
  - [x] 验证全屏播放器关闭按钮可退出
  - [x] 验证移动端返回键在非首页显示
  - [x] 验证移动端返回键在首页隐藏
  - [x] 验证移动端返回键点击后回到上一页
  - [x] 语法检查全部通过

# Task Dependencies
- Task 1、2、3 可并行执行
- Task 4 依赖 Task 1、2、3 完成