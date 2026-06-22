window.Pages = window.Pages || {};
(function() {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const formatTime = (s) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return m + ":" + String(sec).padStart(2, "0"); };
  const formatNumber = (n) => { if (n >= 1e8) return (n / 1e8).toFixed(1) + "亿"; if (n >= 1e4) return (n / 1e4).toFixed(1) + "万"; return String(n); };
  const pickN = (arr, n, offset) => { const a = [...arr]; const len = a.length; const result = []; for (let i = 0; i < n; i++) { result.push(a[(offset + i) % len]); } return result; };

  /** 页面通用头部 */
  function pageHero(title, sub, { brand = "" } = {}) {
    return `
      <div class="page-hero anim-fade-up">
        ${brand ? `<div class="brand-line">${brand}</div>` : ""}
        <h1>${title}</h1>
        ${sub ? `<p class="sub">${sub}</p>` : ""}
      </div>`;
  }

  /** 快捷入口行 */
  function quickRow(items) {
    return `
      <div class="quick-row anim-fade-up stagger-1">
        ${items.map((it, i) =>
          `<button class="quick-chip${it.accent ? " accent" : ""}" data-goto="${it.goto}">
            ${it.icon ? `<span>${it.icon}</span>` : ""}${it.label}
          </button>`).join("")}
      </div>`;
  }

  /** 视图切换按钮。target 支持 '#xxx-id'（推荐，精确）或 '.class' */
  function viewToggleBtn(target) {
    return `
      <div class="view-toggle" data-target="${target}">
        <button class="vt-btn is-active" data-view="list" title="列表视图">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
        <button class="vt-btn" data-view="grid" title="图标视图">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        </button>
      </div>`;
  }

  /** 媒体块 (歌单/专辑 列表项) */
  function mediaBlock(item, i) {
    const [c1, c2] = colorOf(i + 3);
    const badge = item.type === "ai"
      ? `<span class="media-badge">AI</span>`
      : (item.type === "official" ? `<span class="media-badge" style="background:rgba(255,255,255,0.06);color:var(--text-2)">官方</span>` : "");
    return `
      <div class="media-block anim-fade-up stagger-${Math.min(i % 5 + 1, 5)}" data-playlist="${item.id || ""}" data-album="${item.albumId || ""}">
        <div class="media-cover cover" style="--c1:${c1};--c2:${c2}"></div>
        <div class="media-body">
          <div class="media-title">${item.title}</div>
          <div class="media-sub">${item.sub || (item.tracks ? item.tracks + " 首 · " + item.duration : item.artist + " · " + item.year)}</div>
        </div>
        ${badge}
      </div>`;
  }

  /** 歌手圆环 chip */
  function artistChip(ar, i) {
    const [c1, c2] = colorOf(i + 7);
    return `
      <div class="artist-chip" data-artist="${ar.id}">
        <div class="ring"><div class="inner" style="background:linear-gradient(135deg,${c1},${c2})"></div></div>
        <span class="name">${ar.name}</span>
      </div>`;
  }

  /** 歌曲行 */
  function rowFor(track, i, { showNum = true, showLocal = false, isLocal = true } = {}) {
    const [c1, c2] = colorOf(i);
    return `
      <div class="track-row anim-fade-up stagger-${Math.min(i % 5 + 1, 5)}" data-track="${track.id}">
        <div class="track-num">
          ${showNum ? `<span class="t-num">${String(i + 1).padStart(2, "0")}</span><span class="t-play">▶</span>` : ""}
        </div>
        <div class="track-info">
          <div class="track-cover-sm" style="--c1:${c1};--c2:${c2}"></div>
          <div class="track-meta">
            <div class="track-name">${track.title}</div>
            <div class="track-name-sub">${track.artist} · ${track.album}</div>
          </div>
        </div>
        <div class="track-col">${track.genre}</div>
        ${showLocal
          ? `<div><span class="local-status ${isLocal ? "ok" : "no"}">${isLocal ? "✓ 已收录" : "✗ 本地暂无"}</span></div>`
          : ""}
        <div class="track-dur">${fmtDur(track.dur)}</div>
        <div class="track-act">
          <button class="icon-btn" title="收藏">♡</button>
        </div>
      </div>`;
  }

  /** 榜单行 (紧凑版) */
  function chartRow(c, i) {
    const [c1, c2] = colorOf(i + 2);
    return `
      <div class="track-row chart-row" data-track="${c.local ? "t" + String(i + 1).padStart(2, "0") : ""}">
        <div class="track-num" style="font-size:15px;font-weight:700;color:${i < 3 ? "#9f7aea" : "var(--text-2)"}">${c.rank}</div>
        <div class="track-info">
          <div class="track-cover-sm" style="--c1:${c1};--c2:${c2}"></div>
          <div class="track-meta">
            <div class="track-name">${c.title}</div>
            <div class="track-name-sub">${c.artist}</div>
          </div>
        </div>
        <div class="track-col">${c.streams} 次播放</div>
        <div><span class="local-status ${c.local ? "ok" : "no"}">${c.local ? "✓ 已收录" : "✗ 本地暂无"}</span></div>
        <div class="track-act">
          ${c.local ? `<button class="icon-btn" title="播放">▶</button>` : `<button class="icon-btn" title="标记为想要">＋</button>`}
        </div>
      </div>`;
  }

  // 骨架屏
  function renderSkeleton(type) {
    switch (type) {
      case "tracks":
        return `
          <div class="page-section">
            <div class="section-head skeleton" style="height:24px;width:200px;margin-bottom:16px;border-radius:4px"></div>
            ${Array.from({ length: 5 }, () => `
              <div class="track-row skeleton" style="height:64px;margin-bottom:8px;border-radius:8px"></div>
            `).join("")}
          </div>`;
      case "cards":
        return `
          <div class="page-section">
            <div class="section-head skeleton" style="height:24px;width:200px;margin-bottom:16px;border-radius:4px"></div>
            <div class="media-list">
              ${Array.from({ length: 6 }, () => `
                <div class="media-block skeleton" style="height:200px;border-radius:12px"></div>
              `).join("")}
            </div>
          </div>`;
      case "profile":
        return `
          <div class="page-section">
            <div class="profile-head skeleton" style="height:80px;margin-bottom:20px;border-radius:12px"></div>
            <div class="stats-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
              ${Array.from({ length: 4 }, () => `
                <div class="stat-block skeleton" style="height:80px;border-radius:12px"></div>
              `).join("")}
            </div>
          </div>`;
      case "detail":
        return `
          <div class="page-section">
            <div class="playlist-hero skeleton" style="height:240px;border-radius:16px;margin-bottom:24px"></div>
            ${Array.from({ length: 5 }, () => `
              <div class="track-row skeleton" style="height:64px;margin-bottom:8px;border-radius:8px"></div>
            `).join("")}
          </div>`;
      default:
        return renderSkeleton("tracks");
    }
  }

  window.Pages.$ = $;
  window.Pages.formatTime = formatTime;
  window.Pages.formatNumber = formatNumber;
  window.Pages.pickN = pickN;
  window.Pages.pageHero = pageHero;
  window.Pages.quickRow = quickRow;
  window.Pages.viewToggleBtn = viewToggleBtn;
  window.Pages.mediaBlock = mediaBlock;
  window.Pages.artistChip = artistChip;
  window.Pages.rowFor = rowFor;
  window.Pages.chartRow = chartRow;
  window.Pages.renderSkeleton = renderSkeleton;
})();