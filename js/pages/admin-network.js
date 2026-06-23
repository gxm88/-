window.Pages = window.Pages || {};
(function() {
  "use strict";

  window.Pages.admNetwork = async function() {
    const statsRes = await API.getAdminStats();
    const stats = statsRes.data;
    return `
      <div class="admin-panel" style="margin-bottom:14px">
        <h3>站点配置</h3>
        <div class="two-col-form">
          <div class="form-field"><label>站点名称</label><input type="text" value="MuseBox · 私有音乐" /></div>
          <div class="form-field"><label>Logo</label><input type="text" value="default" /></div>
          <div class="form-field"><label>公网地址</label><input type="text" value="https://music.mydomain.local" /></div>
          <div class="form-field"><label>版权信息</label><input type="text" value="© 2026 MuseBox · 仅供个人使用" /></div>
        </div>
      </div>

      <div class="admin-panel" style="margin-bottom:14px">
        <h3>TCP 实时服务</h3>
        <div class="two-col-form">
          <div class="form-field"><label>端口</label><input type="text" value="8787" /></div>
          <div class="form-field"><label>心跳间隔 (秒)</label><input type="text" value="30" /></div>
          <div class="form-field"><label>最大同时连接数</label><input type="text" value="1024" /></div>
          <div class="form-field"><label>弱网重连策略</label><select><option>指数退避</option></select></div>
        </div>

        <div style="margin-top:16px">
          <h3 style="font-size:14px;margin-bottom:10px">当前连接 (${stats.tcp_connections})</h3>
          <table class="data-table">
            <thead><tr><th>客户端</th><th>用户</th><th>版本</th><th>延迟</th><th>状态</th></tr></thead>
            <tbody>
              <tr><td>iPhone 15 · iOS 17</td><td>listener_01</td><td style="color:var(--text-3);font-size:12px">v1.2.4</td><td>32 ms</td><td><span class="status-dot">正常</span></td></tr>
              <tr><td>iPad · iPadOS 17</td><td>nightrain</td><td style="color:var(--text-3);font-size:12px">v1.2.4</td><td>48 ms</td><td><span class="status-dot">正常</span></td></tr>
              <tr><td>Mac · Chrome 128</td><td>cafe.m</td><td style="color:var(--text-3);font-size:12px">Web</td><td>12 ms</td><td><span class="status-dot">正常</span></td></tr>
              <tr><td>Android 14</td><td>listener_01</td><td style="color:var(--text-3);font-size:12px">v1.2.4</td><td>58 ms</td><td><span class="status-dot">正常</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-panel">
        <h3>网络 / 安全</h3>
        <div class="switch-row"><div><div>HTTPS 强制</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">所有 HTTP 请求重定向到 HTTPS</div></div><div class="switch is-on" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div></div>
        <div class="switch-row"><div><div>IP 黑白名单</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">白名单模式 · 仅允许 192.168.0.0/16</div></div><div class="switch is-on" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div></div>
        <div class="switch-row"><div><div>接口限流</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">每 IP 每分钟 120 次</div></div><div class="switch is-on" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div></div>
      </div>
    `;
  };
})();