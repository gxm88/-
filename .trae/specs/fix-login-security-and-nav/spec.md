# 登录安全修复 + 导航优化 Spec

## Why
1. Mock 登录降级绕过密码验证，导致任意密码都能登录且都是管理员
2. 登录页面有两个快捷入口按钮（普通用户/管理员），需要简化为一个登录按钮
3. 登录后点击头像 → "进入管理后台" 跳转失效
4. 左侧导航栏内容超出窗口时无法滚动

## What Changes
- **BREAKING**: 修复 `api.js` mock 登录逻辑，使其校验密码（mock 模式仅 `admin/admin` 可登录）
- 移除登录页面"以普通用户进入"和"以管理员进入"两个按钮，保留一个"点击登录"按钮
- 修复头像菜单 → "进入管理后台" 点击后正确跳转到 `/admin` 路由
- 左侧导航栏添加 `overflow-y: auto` + 隐藏滚动条，支持触屏滑动

## Impact
- Affected specs: 无
- Affected code: `js/api.js`, `js/app/auth.js`, `js/app/router.js`, `index.html`, `css/layout.css`

---

## ADDED Requirements

### Requirement: Mock 登录安全校验
Mock 降级登录 SHALL 校验用户名密码，仅 `admin/admin` 可登录成功。

#### Scenario: Mock 登录正确密码
- **WHEN** mock 模式收到 `POST /login` 请求，body 为 `{"username":"admin","password":"admin"}`
- **THEN** 返回 `{ token, user: { id:1, username:"admin", role:"admin" } }`

#### Scenario: Mock 登录错误密码
- **WHEN** mock 模式收到 `POST /login` 请求，body 密码不是 `admin`
- **THEN** 返回 `{ error: "用户名或密码错误" }`，HTTP 401

### Requirement: 登录页面简化
登录页面 SHALL 仅保留一个"点击登录"按钮，移除"以普通用户进入"和"以管理员进入"快捷入口。

#### Scenario: 登录页面
- **WHEN** 用户访问登录页面
- **THEN** 显示用户名输入框、密码输入框、一个"点击登录"按钮

### Requirement: 管理后台导航修复
登录成功后，点击头像下拉菜单中的"进入管理后台" SHALL 正确跳转到 `/admin` 路由。

#### Scenario: 管理员进入后台
- **WHEN** admin 用户点击头像 → 下拉菜单 → "进入管理后台"
- **THEN** 页面跳转到 `/admin` 管理后台仪表盘

### Requirement: 左侧导航栏滚动
左侧导航栏 SHALL 在内容超出窗口高度时支持滚动，且隐藏滚动条（桌面端）同时支持触屏滑动。

#### Scenario: 导航栏溢出
- **WHEN** 导航栏内容（我的歌单等）超出窗口高度
- **THEN** 用户可上下滚动查看所有导航项
- **AND** 桌面端滚动条隐藏
- **AND** 触屏设备可滑动

---

## 根因分析

### Bug 1: 任意密码可登录
**根因**: `api.js` 第 88-103 行 mock 登录函数不校验密码，直接返回成功 token：
```js
if (path === "/login" && method === "POST") {
  const token = "mock-jwt-" + Date.now();
  return { token, user: { id: 1, username: "admin", role: "admin", avatar: "" } };
}
```
前端 `auth.js` 的 `login()` 函数在 `API.login()` 失败时调用 `.catch(() => mock(...))`，由于 mock 永远成功，任何密码都能登录。

### Bug 2: 管理后台跳转失效
需检查 `updateUserMenu()` 中"进入管理后台"按钮的 `onclick` 绑定。

### Bug 3: 导航栏溢出
侧边栏虽有 `overflow-y: auto`，但需确认样式完整生效并隐藏滚动条。