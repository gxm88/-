# Tasks

- [x] Task 1: 修复头像菜单导航项点击跳转
  - [x] 确认 avatar-menu 内按钮的 `data-goto` 属性与路由表匹配
  - [x] 确保菜单项点击时事件冒泡不被阻止，全局委托能正常捕获
  - [x] 修复退出登录按钮（`#btn-logout`）的点击事件
  - [x] 修复 `#btn-toggle-admin` 管理后台入口按钮点击

- [x] Task 2: 修复播放器封面/标题进入全屏
  - [x] 移除 HTML 中 `onclick="Player.toggleFullscreen()"` 内联事件，改用 JS 绑定
  - [x] 确保 `Player.toggleFullscreen` 在 init 完成后正确绑定到 `player-track-area`
  - [x] 确认封面和标题文字都支持点击进入全屏

- [x] Task 3: 移除播放器放大按钮
  - [x] 从 `index.html` 删除 `#btn-expand` 按钮
  - [x] 从 `js/player/ui.js` 删除相关的 `#btn-expand` 事件绑定

- [x] Task 4: 播放器栏自动隐藏/显示
  - [x] 在 `js/player/ui.js` 添加自动隐藏逻辑：5 秒无操作隐藏，播放中不隐藏
  - [x] 在 `css/layout.css` 添加隐藏/显示过渡动画（translateY）
  - [x] 添加底部 50px 热区，鼠标移入时显示播放器
  - [x] 播放器上鼠标移动/点击时重置隐藏计时器

# Task Dependencies
- Task 1、2、3 可并行
- Task 4 独立，可与所有任务并行