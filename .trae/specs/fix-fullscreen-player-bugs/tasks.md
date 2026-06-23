# Tasks

- [x] Task 1: 修复播放模式切换全屏 UI 不更新
  - [x] 在 `cyclePlayMode()` 中添加 `window.Player.renderFullscreen()` 调用
  - [x] 验证：全屏播放器中点击播放模式按钮，按钮文字和图标即时更新

- [x] Task 2: 重构 EQ 滑块拖拽避免面板重建
  - [x] 将 `updateGain` 回调中的 `renderEQPanel()` 替换为直接 DOM 操作（只更新滑块位置和 dB 值）
  - [x] 使用 `requestAnimationFrame` 节流 DOM 更新
  - [x] 验证：触屏拖拽 EQ 滑块流畅不卡顿，面板不闪烁

- [x] Task 3: 修复全屏播放器队列面板不可见
  - [x] 将队列面板 DOM 从 player-bar 移到 body 级别（</footer> 之后）
  - [x] 调整队列面板 position=fixed, z-index=200，全屏时动态提升到 1100
  - [x] 验证：全屏播放器中点击队列按钮，面板正常弹出显示

- [x] Task 4: 隐藏队列面板滚动条
  - [x] 为 `.queue-list` 添加 `scrollbar-width: none`（Firefox）和 `::-webkit-scrollbar { display: none }`（WebKit）
  - [x] 验证：队列列表内容超出时无可见滚动条

# Task Dependencies
- Task 2 和 Task 3 可并行执行
- Task 1、Task 4 可与其他任务并行