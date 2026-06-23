window.Pages = window.Pages || {};
(function() {
  "use strict";

  window.Pages.admUsers = async function() {
    const usersRes = await API.getAdminUsers();
    const users = usersRes.data;
    return `
      <div class="admin-panel" style="margin-bottom:14px">
        <h3>用户管理</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:14px">
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:22px">24</div><div class="as-label">总用户</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:22px;color:var(--accent)">7</div><div class="as-label">在线</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:22px">2</div><div class="as-label">管理员</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:22px">22</div><div class="as-label">普通用户</div></div>
        </div>

        <table class="data-table">
          <thead>
            <tr><th>用户名</th><th>角色</th><th>邮箱</th><th>最近登录</th><th>状态</th><th style="text-align:right">操作</th></tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${u.name}</td>
                <td style="color:${u.role === 'admin' ? 'var(--accent)' : 'var(--text-2)'}">${u.role === 'admin' ? '管理员' : '普通用户'}</td>
                <td style="color:var(--text-3);font-size:12px">${u.email || '-'}</td>
                <td style="color:var(--text-3);font-size:12px">${u.lastLogin || '-'}</td>
                <td><span class="status-dot">正常</span></td>
                <td style="text-align:right"><button class="icon-btn" onclick="App.showToast('用户设置已打开', 'info')">⋯</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="admin-panel">
        <h3>系统参数</h3>
        <div class="switch-row"><div><div style="font-size:13px">开放注册</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">允许新用户自主申请账号。关闭后仅管理员可创建。</div></div><div class="switch is-on" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div></div>
        <div class="switch-row"><div><div style="font-size:13px">邀请码注册</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">开启后新注册需要填写有效邀请码。</div></div><div class="switch" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div></div>
        <div class="switch-row"><div><div style="font-size:13px">每日 AI 推荐自动生成</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">自动在凌晨 3:00 为每位用户生成个性化推荐。</div></div><div class="switch is-on" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div></div>
      </div>
    `;
  };
})();