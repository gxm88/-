# 头像菜单 + 播放器交互修复 Spec

## Why
1. 头像下拉菜单中的导航项（个人中心/我的曲库/我的收藏/进入管理后台/退出登录）功能可能未全部关联好
2. 底部播放器封面和标题点击无法进入全屏播放页面
3. 播放器右侧的放大按钮（btn-expand）多余，应移除，统一用封面/标题进入全屏
4. 底部播放器长时间不用应自动隐藏，鼠标滑到底部区域时弹出

## What Changes
- 修复头像菜单内所有导航项的点击跳转功能
- 修复底部播放器封面/标题区域点击进入全屏播放器
- 移除播放器右侧放大按钮 `#btn-expand`
- 添加底部播放器栏自动隐藏/显示行为（5秒无操作隐藏，鼠标移到底部 50px 区域显示）

## Impact
- Affected specs: 无
- Affected code: `index.html`, `js/player/ui.js`, `js/player/fullscreen.js`, `css/layout.css`

---

## ADDED Requirements

### Requirement: 头像菜单导航修复
头像下拉菜单中的所有导航项 SHALL 正确跳转到对应页面。

#### Scenario: 菜单项点击
- **WHEN** 用户点击头像 → 下拉菜单中的"个人中心"
- **THEN** 跳转到 `/profile` 页面
- **WHEN** 用户点击"我的曲库"
- **THEN** 跳转到 `/library` 页面
- **WHEN** 用户点击"我的收藏"
- **THEN** 跳转到 `/favorites` 页面
- **WHEN** admin 用户点击"进入管理后台"
- **THEN** 跳转到 `/admin` 页面
- **WHEN** 用户点击"退出登录"
- **THEN** 清除登录状态并显示登录页面

### Requirement: 播放器封面/标题进入全屏
底部播放器的封面和标题区域 SHALL 可点击进入全屏播放器。

#### Scenario: 点击封面进入全屏
- **WHEN** 用户点击底部播放器的封面或歌曲标题
- **THEN** 全屏播放器打开

### Requirement: 移除放大按钮
底部播放器右侧 SHALL 不再显示放大按钮（`#btn-expand`），进入全屏统一通过封面/标题点击。

#### Scenario: 放大按钮移除
- **WHEN** 页面加载
- **THEN** 播放器右侧不显示放大按钮

### Requirement: 播放器自动隐藏/显示
底部播放器栏 SHALL 在 5 秒无操作后自动向下隐藏，鼠标移到底部 50px 区域时重新显示。

#### Scenario: 自动隐藏
- **WHEN** 用户 5 秒内未与播放器交互
- **THEN** 播放器栏向下滑出隐藏（translateY 或 bottom 负值）

#### Scenario: 鼠标触发显示
- **WHEN** 鼠标移入屏幕底部 50px 区域
- **THEN** 播放器栏向上滑入显示

#### Scenario: 播放中不隐藏
- **WHEN** 正在播放音乐
- **THEN** 播放器栏不自动隐藏

---

## 根因分析

### Bug 1: 头像菜单点击
头像菜单按钮在 `avatar-menu` 浮层内，点击菜单项时 document 全局 click 事件会关闭菜单。全局 `[data-goto]` 委托处理在 `init.js` 第 45-55 行，理论上应该能捕获。需要确认菜单项点击时 `data-goto` 委托是否正常触发。

### Bug 2: 封面点击进入全屏
HTML 第 216 行 `player-track-area` 有 `onclick="Player.toggleFullscreen()"`，JS 第 409-419 行也绑定了 click 事件。两个可能冲突或其中一个未正确触发。需要确认 `Player.toggleFullscreen` 在点击时是否已定义。

### Bug 3: 自动隐藏播放器
当前无此功能，需新增。