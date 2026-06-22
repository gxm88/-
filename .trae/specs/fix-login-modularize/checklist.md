# Checklist

- [x] `api.js` `request()` 使用 `BASE + path` 拼接完整 URL
- [x] 所有 API 路径与后端路由匹配（`/login` 而非 `/auth/login`）
- [x] mock 降级路径匹配同步更新
- [x] 后端 `POST /api/login` 接受 admin/admin 返回 JWT
- [x] `js/pages/` 目录创建，所有页面函数拆分到独立文件
- [x] `js/pages/index.js` 汇总导出所有页面函数
- [x] `js/player/` 目录创建，core/ui/fullscreen/effects 拆分完毕
- [x] `js/player/index.js` 汇总导出
- [x] `js/app/` 目录创建，router/auth/events/init 拆分完毕
- [x] `index.html` 脚本加载顺序正确，所有模块按依赖关系排列
- [x] 登录 admin/admin 成功，显示管理员菜单
- [x] 头像下拉菜单 → 进入管理后台 跳转正常
- [x] 底部播放器进度条可拖拽 + 点击跳转
- [x] 所有路由页面正常渲染
- [x] 语法检查全部通过