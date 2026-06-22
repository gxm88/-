window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { pageHero, viewToggleBtn, rowFor } = window.Pages;

  window.Pages.albumDetail = async function(id) {
    const [albumRes, tracksRes] = await Promise.all([
      API.getAlbum(id),
      API.getTracks(),
    ]);
    const a = albumRes.data;
    const allTracks = tracksRes.data;
    const [c1, c2] = colorOf(id ? id.charCodeAt(1) : 1);
    const tracks = allTracks.filter(t => t.album === a.title);
    return `
      ${pageHero(a.title, "", { brand: "专辑 · " + a.year })}
      <section class="page-section anim-fade-up">
        <div class="playlist-hero">
          <div class="cover cover-lg" style="--c1:${c1};--c2:${c2}"></div>
          <div>
            <div class="ph-type">专辑</div>
            <h2 class="ph-title">${a.title}</h2>
            <div class="ph-meta">
              <span>${a.artist}</span>
              <span>${a.year} 年</span>
              <span>${a.tracks} 首</span>
            </div>
            <div class="ph-ctas">
              <button class="ph-play" data-play-playlist="${a.id}">▶ 播放全部</button>
              <button class="ph-ghost">♡ 收藏</button>
            </div>
          </div>
        </div>
        <div class="section-head">
          <h3 class="section-title">曲目列表 · ${tracks.length} 首</h3>
          ${viewToggleBtn("#album-detail-tracks")}
        </div>
        ${tracks.length > 0 ? `
        <div class="track-list" id="album-detail-tracks">
          ${tracks.map((t, i) => rowFor(t, i)).join("")}
        </div>` : `
        <div class="page-intro-hero" style="text-align:center">
          <h2>专辑中暂无歌曲</h2>
          <p>该专辑尚未收录任何歌曲</p>
        </div>`}
      </section>
    `;
  };
})();