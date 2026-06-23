window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { pageHero, quickRow, viewToggleBtn, mediaBlock, rowFor } = window.Pages;

  window.Pages.home = async function() {
    const [tracksRes, playlistsRes, artistsRes] = await Promise.all([
      API.getTracks(),
      API.getPlaylists(),
      API.getArtists(),
    ]);
    const tracks = tracksRes.data;
    const playlists = playlistsRes.data;
    const artists = artistsRes.data;

    const totalTracks = tracks.length;
    return `
      ${pageHero("在自己的曲库里，听见自己。", "私有化部署 · AI 推荐 · Web / APP 互通 · 全链路实时同步", { brand: "MuseBox · 私有化 AI 音乐服务器" })}

      <div class="banner anim-scale-in" id="banner" style="margin-bottom:28px">
        ${BANNERS.map((b, i) => `
          <div class="banner-slide ${i === 0 ? "is-active" : ""}" style="--b-c1:${b.c1};--b-c2:${b.c2}">
            <span class="banner-tag ${b.isAI ? "is-ai" : ""}">${b.tag}</span>
            <div class="banner-title">${b.title}</div>
            <div class="banner-sub">${b.sub}</div>
            <button class="banner-cta" data-go-playlist="p0${i}">▶ 立即播放</button>
          </div>`).join("")}
        <div class="banner-dots">
          ${BANNERS.map((_, i) => `<span class="banner-dot ${i === 0 ? "is-active" : ""}" data-banner-idx="${i}"></span>`).join("")}
        </div>
      </div>

      ${quickRow([
        { label: "全部歌曲", sub: `${totalTracks} 首`, icon: "♪", goto: "library", accent: true },
        { label: "全网热榜", sub: "实时同步", icon: "⚡", goto: "charts" },
        { label: "AI 推荐", sub: "智能匹配", icon: "⟐", goto: "ai" },
      ])}

      <section class="page-section anim-fade-up stagger-1">
        <div class="section-head">
          <h3 class="section-title">今日推荐</h3>
          <div class="section-head-right">${viewToggleBtn("#home-rec")}<button class="section-more" data-goto="discover">歌单广场 →</button></div>
        </div>
        <div class="media-list" id="home-rec">
          ${playlists.slice(0, 5).map((p, i) => mediaBlock({
            title: p.title,
            sub: `${p.tracks} 首 · ${p.duration}`,
            type: p.type,
          }, i)).join("")}
        </div>
      </section>

      <section class="page-section anim-fade-up stagger-2">
        <div class="section-head">
          <h3 class="section-title">最近播放</h3>
          <div class="section-head-right">${viewToggleBtn("#home-recent")}<button class="section-more" data-goto="library">浏览全部 →</button></div>
        </div>
        <div class="track-list" id="home-recent">
          ${tracks.slice(2, 7).map((t, i) => rowFor(t, i)).join("")}
        </div>
      </section>

      <section class="page-section anim-fade-up stagger-3">
        <div class="section-head">
          <h3 class="section-title">全网热榜</h3>
          <button class="section-more" data-goto="charts">完整榜单 →</button>
        </div>
        <div class="chart-columns">
          <div class="chart-col">
            <h3>全球热歌</h3>
            <div class="muted">主流平台实时同步</div>
            ${CHARTS.slice(0, 5).map((c, i) => `
              <div class="chart-song" data-track="${c.local ? "t" + String(i + 1).padStart(2, "0") : ""}">
                <span class="rank${i < 3 ? " top" : ""}">${String(c.rank).padStart(2, "0")}</span>
                <div class="info"><div class="t">${c.title}</div><div class="a">${c.artist}</div></div>
                <span class="tag ${c.local ? "ok" : "miss"}">${c.local ? "已收录" : "暂无"}</span>
              </div>`).join("")}
          </div>
          <div class="chart-col">
            <h3>本周新曲</h3>
            <div class="muted">曲库最新入库</div>
            ${tracks.slice(5, 10).map((t, i) => `
              <div class="chart-song" data-track="${t.id}">
                <span class="rank${i < 3 ? " top" : ""}">${String(i + 1).padStart(2, "0")}</span>
                <div class="info"><div class="t">${t.title}</div><div class="a">${t.artist}</div></div>
                <span class="tag ok">已收录</span>
              </div>`).join("")}
          </div>
          <div class="chart-col">
            <h3>本地热播</h3>
            <div class="muted">本站用户播放最多</div>
            ${tracks.slice(8, 13).map((t, i) => `
              <div class="chart-song" data-track="${t.id}">
                <span class="rank${i < 3 ? " top" : ""}">${String(i + 1).padStart(2, "0")}</span>
                <div class="info"><div class="t">${t.title}</div><div class="a">${t.artist}</div></div>
                <span class="tag ok">已收录</span>
              </div>`).join("")}
          </div>
        </div>
      </section>
    `;
  };
})();