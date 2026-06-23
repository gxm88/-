# Tasks

- [x] Task 1: 修复 mock 登录绕过密码校验
  - [x] 修改 `api.js` mock login 函数，校验 username/password 必须为 `admin/admin`
  - [x] 错误密码时返回 `{ error: "用户名或密码错误" }` 并抛出异常
  - [x] 验证：错误密码被拒绝，正确密码可登录

- [x] Task 2: 简化登录页面 UI
  - [x] 移除 `index.html` 中"以普通用户进入"和"以管理员进入"按钮
  - [x] 保留一个"点击登录"按钮
  - [x] 确保登录表单提交逻辑正常工作

- [x] Task 3: 修复管理后台导航跳转
  - [x] 检查 `auth.js` 中 `updateUserMenu()` 的"进入管理后台"按钮 onclick 绑定
  - [x] 确保 `App.navigate('admin')` 在 admin 角色下正确跳转
  - [x] 检查 `router.js` 中 `/admin` 路由是否有 admin 权限校验拦截

- [x] Task 4: 左侧导航栏滚动优化
  - [x] 确认 `css/layout.css` 侧边栏有 `overflow-y: auto`
  - [x] 添加隐藏滚动条样式（`scrollbar-width: none` / `-ms-overflow-style: none` / `::-webkit-scrollbar { display: none }`）
  - [x] 添加 `-webkit-overflow-scrolling: touch` 支持触屏流畅滑动
  - [x] 设置侧边栏 `max-height: 100vh` 确保不超出窗口

# Task Dependencies
- Task 2 可与 Task 1 并行
- Task 3 依赖 Task 1（mock 登录修复后 admin 角色才正确）
- Task 4 独立，可与所有任务并行