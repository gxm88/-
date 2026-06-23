window.Pages = window.Pages || {};
(function() {
  "use strict";

  window.Pages.admDashboard = async function() {
    const statsRes = await API.getAdminStats();
    const stats = statsRes.data;
    return `
      <div class="admin-hero-row anim-fade-up">
        <div class="admin-stat"><div class="as-num">${stats.total_tracks}</div><div class="as-label">收录歌曲</div><div class="as-trend">+ 24 新扫描</div></div>
        <div class="admin-stat"><div class="as-num">${stats.total_users}</div><div class="as-label">注册用户</div><div class="as-trend" style="color:var(--accent)">7 人在线</div></div>
        <div class="admin-stat"><div class="as-num">${stats.total_plays_24h}</div><div class="as-label">24 小时播放</div><div class="as-trend">+ 12% vs 昨天</div></div>
        <div class="admin-stat"><div class="as-num">${stats.ai_calls_today}</div><div class="as-label">AI 调用次数</div><div class="as-trend">3 个模型已启用</div></div>
      </div>

      <div class="admin-panel" style="margin-bottom:14px">
        <h3>存储与性能</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
          <div>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">磁盘 · ${stats.storage_used} / ${stats.storage_total}</div>
            <div class="bar" style="height:8px;background:var(--bg-3);border-radius:999px;overflow:hidden"><div style="height:100%;width:10%;background:linear-gradient(90deg,var(--accent),#c9b6ff);border-radius:999px"></div></div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">CPU · ${stats.cpu_load}</div>
            <div class="bar" style="height:8px;background:var(--bg-3);border-radius:999px;overflow:hidden"><div style="height:100%;width:32%;background:linear-gradient(90deg,#4ade80,#22d3ee);border-radius:999px"></div></div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">内存 · ${stats.mem_load}</div>
            <div class="bar" style="height:8px;background:var(--bg-3);border-radius:999px;overflow:hidden"><div style="height:100%;width:48%;background:linear-gradient(90deg,#fbbf24,#f87171);border-radius:999px"></div></div>
          </div>
        </div>
      </div>

      <div class="admin-panel">
        <h3>最近扫描</h3>
        <div class="scan-log">
<span class="ok">[2026-06-21 09:12:04] ▸ 扫描 /music/Synthwave · 发现 88 个新文件</span>
<span class="ok">[2026-06-21 09:12:11] ▸ 元数据补全 · 成功 86 / 88</span>
<span class="warn">[2026-06-21 09:12:13] ▸ 2 个文件缺少封面 · 从云端拉取</span>
<span class="ok">[2026-06-21 09:12:20] ▸ 封面拉取完成 · 2 / 2</span>
<span class="dim">[2026-06-21 09:12:22] ▸ 重复检测：发现 1 组潜在重复</span>
<span class="ok">[2026-06-21 09:12:24] ▸ TCP 连接数 ${stats.tcp_connections} · 心跳正常</span>
<span class="ok">[2026-06-21 09:12:30] ▸ AI 推荐缓存生成完毕 · 8 位用户</span>
        </div>
      </div>
    `;
  };
})();