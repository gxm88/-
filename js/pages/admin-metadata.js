window.Pages = window.Pages || {};
(function() {
  "use strict";

  window.Pages.admMetadata = async function() {
    const statsRes = await API.getAdminStats();
    const stats = statsRes.data;
    return `
      <div class="admin-panel">
        <h3>元数据修复</h3>
        <p style="font-size:12px;color:var(--text-3);margin-bottom:14px">自动从音乐指纹与云端数据源补齐标题、歌手、专辑、封面、歌词。</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:14px">
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px">${stats.total_tracks}</div><div class="as-label">已扫描歌曲</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px;color:var(--good)">1,248</div><div class="as-label">元数据完整</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px;color:var(--warn)">36</div><div class="as-label">需要修复</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px;color:var(--text-3)">8</div><div class="as-label">缺失封面</div></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0">一键修复</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">歌词重新匹配</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">封面重新拉取</button>
        </div>
      </div>
    `;
  };
})();