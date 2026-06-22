window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { pageHero, quickRow, viewToggleBtn, mediaBlock, artistChip, rowFor } = window.Pages;

  window.Pages.discover = async function() {
    const [playlistsRes, artistsRes, tracksRes] = await Promise.all([
      API.getPlaylists(),
      API.getArtists(),
      API.getTracks(),
    ]);
    const playlists = playlistsRes.data;
    const artists = artistsRes.data;
    const tracks = tracksRes.data;

    return `
      ${pageHero("歌单广场", "AI 每日推荐 + 官方精选 + 用户创作 · 点击任意歌单即可浏览详情")}

      ${quickRow([
        { label: "全部歌曲", icon: "♪", goto: "library", accent: true },
        { label: "全网热榜", icon: "⚡", goto: "charts" },
        { label: "AI 推荐中心", icon: "⟐", goto: "ai" },
      ])}

      <section class="page-section">
        <div class="section-head">
          <h3 class="section-title">推荐歌单 · ${playlists.length} 张</h3>
          ${viewToggleBtn("#disc-pl")}
        </div>
        <div class="media-list" id="disc-pl">
          ${playlists.map((p, i) => mediaBlock({
            title: p.title,
            sub: `${p.tracks} 首 · ${p.duration}`,
            type: p.type,
          }, i)).join("")}
        </div>
      </section>

      <section class="page-section anim-fade-up stagger-1">
        <div class="section-head">
          <h3 class="section-title">热门歌手</h3>
          <div class="section-head-right">${viewToggleBtn("#disc-artists")}<button class="section-more" data-goto="artists">全部歌手 →</button></div>
        </div>
        <div class="artist-scroll" id="disc-artists">
          ${artists.map(artistChip).join("")}
        </div>
      </section>

      <section class="page-section anim-fade-up stagger-2">
        <div class="section-head">
          <h3 class="section-title">本地曲库最新</h3>
          <div class="section-head-right">${viewToggleBtn("#disc-tracks")}<button class="section-more" data-goto="library">查看全部 ${tracks.length} 首 →</button></div>
        </div>
        <div class="track-list" id="disc-tracks">
          ${tracks.slice(0, 6).map((t, i) => rowFor(t, i)).join("")}
        </div>
      </section>
    `;
  };
})();