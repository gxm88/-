window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { pageHero, viewToggleBtn, rowFor } = window.Pages;

  window.Pages.playlistDetail = async function(id) {
    const [playlistRes, tracksRes] = await Promise.all([
      API.getPlaylist(id),
      API.getTracks(),
    ]);
    const p = playlistRes.data;
    const tracks = tracksRes.data;
    const [c1, c2] = colorOf(p.id.charCodeAt(1));
    return `
      <section class="page-section anim-fade-up">
        <div class="playlist-hero">
          <div class="cover cover-lg" style="--c1:${c1};--c2:${c2}"></div>
          <div>
            <div class="ph-type">${p.type === "ai" ? "AI 生成歌单" : (p.type === "official" ? "官方精选歌单" : "用户歌单")}</div>
            <h2 class="ph-title">${p.title}</h2>
            <p class="ph-sub">${p.desc}</p>
            <div class="ph-meta">
              <span>by MuseBox</span>
              <span>${p.tracks} 首 · ${p.duration}</span>
              <span>创建于 2026-06-20</span>
              <span>已被 1,284 人收藏</span>
            </div>
            <div class="ph-ctas">
              <button class="ph-play" data-play-playlist="${p.id}">▶ 播放</button>
              <button class="ph-ghost">♡ 收藏</button>
              <button class="ph-ghost">⇅ 导入 / 导出</button>
              <button class="ph-ghost">⋯ 更多</button>
            </div>
          </div>
        </div>
        <div class="section-head">
          <h3 class="section-title">曲目列表 · ${p.tracks} 首</h3>
          ${viewToggleBtn(`#pl-${p.id}`)}
        </div>
        ${p.tracks > 0 ? `
        <div class="track-list" id="pl-${p.id}">
          ${tracks.slice(p.id.charCodeAt(1) % 6, Math.min(p.tracks, 12) + p.id.charCodeAt(1) % 6).map((t, i) => rowFor(t, i)).join("")}
        </div>` : `
        <div class="page-intro-hero" style="text-align:center">
          <h2>歌单中暂无歌曲</h2>
          <p>这个歌单还没有添加任何歌曲</p>
        </div>`}
      </section>
    `;
  };
})();