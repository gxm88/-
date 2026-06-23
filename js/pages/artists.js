window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { pageHero, viewToggleBtn, artistChip, rowFor } = window.Pages;

  window.Pages.artists = async function() {
    const [artistsRes, tracksRes] = await Promise.all([
      API.getArtists(),
      API.getTracks(),
    ]);
    const artists = artistsRes.data;
    const tracks = tracksRes.data;

    return `
      ${pageHero("歌手", "点击进入歌手主页，查看完整专辑、热门单曲与相似歌手推荐。", { brand: artists.length + " 位艺术家" })}
      <div class="section-head anim-fade-up stagger-1">
        <h3 class="section-title">全部艺术家</h3>
        ${viewToggleBtn("#artist-scroll-all")}
      </div>
      <div class="artist-scroll anim-fade-up stagger-1" id="artist-scroll-all">
        ${artists.map(artistChip).join("")}
      </div>

      <section class="page-section anim-fade-up stagger-2">
        <div class="section-head">
          <h3 class="section-title">热门单曲</h3>
          ${viewToggleBtn("#artist-hot-tracks")}
        </div>
        <div class="track-list" id="artist-hot-tracks">
          ${tracks.slice(0, 10).map((t, i) => rowFor(t, i)).join("")}
        </div>
      </section>
    `;
  };
})();