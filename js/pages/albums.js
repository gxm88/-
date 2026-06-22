window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { pageHero, viewToggleBtn, mediaBlock } = window.Pages;

  window.Pages.albums = async function() {
    const albumsRes = await API.getAlbums();
    const albums = albumsRes.data;

    return `
      ${pageHero("专辑", "以专辑为单位的完整收藏 · 点击查看曲目列表与相似专辑。", { brand: albums.length + " 张专辑" })}
      <div class="section-head anim-fade-up stagger-1">
        <h3 class="section-title">全部专辑 · ${albums.length} 张</h3>
        ${viewToggleBtn("#albums-list")}
      </div>
      <div class="media-list anim-fade-up stagger-1" id="albums-list">
        ${albums.map((a, i) => mediaBlock({
          title: a.title,
          sub: a.artist + " · " + a.year + " · " + a.tracks + " 首",
          albumId: a.id,
        }, i)).join("")}
      </div>
    `;
  };
})();