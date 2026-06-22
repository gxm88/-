window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { pageHero, viewToggleBtn, rowFor } = window.Pages;

  window.Pages.library = async function() {
    const tracksRes = await API.getTracks();
    const tracks = tracksRes.data;
    const genres = ["全部", "电子 / Synthwave", "独立民谣", "氛围 / Post-rock", "爵士 / Lounge", "Dream Pop", "乡村摇滚", "Post-Hardcore"];
    return `
      ${pageHero("全部歌曲", "点击任意行即可播放 · 所有曲目来自本地 /music 目录 · 支持搜索、筛选、排序", { brand: `本地曲库 · ${tracks.length} 首已收录` })}

      <div class="filter-bar anim-fade-up stagger-1">
        <div class="filter-group">
          ${genres.map((g, i) => `<button class="filter-pill ${i === 0 ? "is-active" : ""}" data-filter="${g}">${g}</button>`).join("")}
        </div>
        <div class="filter-group">
          <button class="filter-pill is-active">默认排序</button>
          <button class="filter-pill">按添加时间</button>
          <button class="filter-pill">按播放次数</button>
        </div>
      </div>

      <div class="section-head anim-fade-up stagger-1">
        <h3 class="section-title">全部曲目 · ${tracks.length} 首</h3>
        ${viewToggleBtn("#lib-tracks")}
      </div>

      <div class="track-list anim-fade-up stagger-1" id="lib-tracks">
        ${tracks.map((t, i) => rowFor(t, i)).join("")}
      </div>
    `;
  };
})();