window.Pages = window.Pages || {};
(function() {
  "use strict";

  window.Pages.admOps = async function() {
    return `
      <div class="admin-panel">
        <h3>重复检测与冗余清理</h3>
        <p style="font-size:12px;color:var(--text-3);margin-bottom:14px">基于文件指纹 + 元数据的双重比对，识别可能的重复。</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px">
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px">3</div><div class="as-label">重复歌曲组</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px">12</div><div class="as-label">孤立元数据记录</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px">42 MB</div><div class="as-label">可释放空间</div></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0">运行检测</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">批量编辑</button>
        </div>
      </div>
    `;
  };
})();