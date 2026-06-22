window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { mediaBlock } = window.Pages;

  window.Pages.admPlaylistEdit = async function() {
    const playlistsRes = await API.getPlaylists();
    const playlists = playlistsRes.data;
    return `
      <div class="admin-panel">
        <h3>官方歌单编辑</h3>
        <div class="media-list">
          ${playlists.filter(p => p.type === "official").map((p, i) => mediaBlock({
            title: p.title, sub: `${p.tracks} 首 · ${p.duration}`, type: "official",
          }, i)).join("")}
        </div>
        <div style="margin-top:20px;display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0" onclick="App.showToast('新建歌单功能开发中', 'info')">新建官方歌单</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">用户公开歌单审核</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">首页推荐置顶位</button>
        </div>
      </div>
    `;
  };
})();