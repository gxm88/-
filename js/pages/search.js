window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { pageHero, viewToggleBtn, mediaBlock, artistChip, rowFor, chartRow } = window.Pages;

  window.Pages.searchResults = async function(q) {
    const kw = (q || "").trim();
    const res = await API.search(kw);
    const byTrack = res.tracks || [];
    const byAlbum = res.albums || [];
    const byArtist = res.artists || [];
    const byPl = res.playlists || [];
    const byChart = res.charts || [];

    function hl(text) {
      if (!kw) return text;
      const re = new RegExp(`(${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
      return text.replace(re, '<span class="hl">$1</span>');
    }

    const total = byTrack.length + byAlbum.length + byArtist.length + byPl.length + byChart.length;

    return `
      ${pageHero(kw ? `"${kw}" 的搜索结果` : "搜索", `共 ${total} 条结果，其中本地曲库 ${byTrack.length} 首`, { brand: `${total} 条匹配` })}

      ${byTrack.length > 0 ? `
      <div class="search-group anim-fade-up stagger-1">
        <div class="section-head" style="margin-bottom:10px">
          <h3 class="search-group-title">歌曲 · ${byTrack.length}</h3>
          ${viewToggleBtn("#search-tracks")}
        </div>
        <div class="track-list" id="search-tracks">${byTrack.slice(0, 8).map((t, i) => rowFor({ ...t, title: hl(t.title), artist: hl(t.artist) }, i)).join("")}</div>
      </div>` : ""}

      ${byAlbum.length > 0 ? `
      <div class="search-group anim-fade-up stagger-2">
        <div class="section-head" style="margin-bottom:10px">
          <h3 class="search-group-title">专辑 · ${byAlbum.length}</h3>
          ${viewToggleBtn("#search-albums")}
        </div>
        <div class="media-list" id="search-albums">${byAlbum.slice(0, 6).map((a, i) => mediaBlock({
          title: hl(a.title), sub: a.artist + " · " + a.year, albumId: a.id,
        }, i)).join("")}</div>
      </div>` : ""}

      ${byArtist.length > 0 ? `
      <div class="search-group anim-fade-up stagger-3">
        <div class="section-head" style="margin-bottom:10px">
          <h3 class="search-group-title">歌手 · ${byArtist.length}</h3>
          ${viewToggleBtn("#search-artists")}
        </div>
        <div class="artist-scroll" id="search-artists">${byArtist.slice(0, 6).map(artistChip).join("")}</div>
      </div>` : ""}

      ${byPl.length > 0 ? `
      <div class="search-group anim-fade-up stagger-4">
        <div class="section-head" style="margin-bottom:10px">
          <h3 class="search-group-title">歌单 · ${byPl.length}</h3>
          ${viewToggleBtn("#search-playlists")}
        </div>
        <div class="media-list" id="search-playlists">${byPl.slice(0, 6).map((p, i) => mediaBlock({
          title: p.title, sub: `${p.tracks} 首 · ${p.duration}`, type: p.type,
        }, i)).join("")}</div>
      </div>` : ""}

      ${byChart.length > 0 ? `
      <div class="search-group anim-fade-up stagger-5">
        <div class="section-head" style="margin-bottom:10px">
          <h3 class="search-group-title">全网 · ${byChart.length}（标注本地有无）</h3>
          ${viewToggleBtn("#search-charts")}
        </div>
        <div class="track-list" id="search-charts">${byChart.slice(0, 6).map(chartRow).join("")}</div>
      </div>` : ""}

      ${total === 0 ? `
      <div class="page-section anim-fade-up" style="text-align:center;padding:40px 0">
        <p style="font-size:18px;color:var(--text-3)">没有找到与 "${kw}" 相关的结果</p>
        <p style="margin-top:8px;font-size:13px;color:var(--text-dim)">试试其他关键词，或浏览曲库、歌单</p>
      </div>` : ""}
    `;
  };
})();