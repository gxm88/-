window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { pageHero } = window.Pages;

  window.Pages.charts = async function() {
    const [chartsRes, tracksRes, artistsRes] = await Promise.all([
      API.getCharts(),
      API.getTracks(),
      API.getArtists(),
    ]);
    const charts = chartsRes.data;
    const tracks = tracksRes.data;
    const artists = artistsRes.data;
    const localCount = charts.filter(c => c.local).length;
    const missCount = charts.filter(c => !c.local).length;
    return `
      ${pageHero("全网热榜", "从主流音乐平台同步 · 标注本地收录状态 · 点击播放或标记想要", { brand: "实时榜单 · " + charts.length + " 首上榜" })}

      <div class="chart-columns anim-fade-up stagger-1">
        <div class="chart-col">
          <h3>全球热歌 Top 50</h3>
          <div class="muted">主流平台 · 实时聚合</div>
          ${charts.slice(0, 8).map((c, i) => `
            <div class="chart-song" data-track="${c.local ? "t" + String(i + 1).padStart(2, "0") : ""}">
              <span class="rank${i < 3 ? " top" : ""}">${String(c.rank).padStart(2, "0")}</span>
              <div class="info"><div class="t">${c.title}</div><div class="a">${c.artist}</div></div>
              <span class="tag ${c.local ? "ok" : "miss"}">${c.local ? "已收录" : "暂无"}</span>
            </div>`).join("")}
        </div>
        <div class="chart-col">
          <h3>本周新曲</h3>
          <div class="muted">曲库最近入库</div>
          ${tracks.slice(4, 12).map((t, i) => `
            <div class="chart-song" data-track="${t.id}">
              <span class="rank${i < 3 ? " top" : ""}">${String(i + 1).padStart(2, "0")}</span>
              <div class="info"><div class="t">${t.title}</div><div class="a">${t.artist}</div></div>
              <span class="tag ok">已收录</span>
            </div>`).join("")}
        </div>
        <div class="chart-col">
          <h3>本地热播</h3>
          <div class="muted">本站用户播放最多</div>
          ${tracks.slice(8, 16).map((t, i) => `
            <div class="chart-song" data-track="${t.id}">
              <span class="rank${i < 3 ? " top" : ""}">${String(i + 1).padStart(2, "0")}</span>
              <div class="info"><div class="t">${t.title}</div><div class="a">${t.artist}</div></div>
              <span class="tag ok">已收录</span>
            </div>`).join("")}
        </div>
      </div>

      <div class="ai-card anim-fade-up stagger-2" style="padding:24px 28px">
        <div>
          <div class="ai-card-title" style="font-size:18px;margin-top:0">与你的曲库匹配情况</div>
          <p class="ai-card-sub" style="margin-top:8px">热榜 ${charts.length} 首中，本地已收录 <strong style="color:var(--good)">${localCount}</strong> 首，未收录 <strong style="color:var(--warn)">${missCount}</strong> 首</p>
          <div class="ai-card-tags" style="margin-top:14px">
            <span class="ai-card-tag">✓ 已收录 ${Math.round(localCount / charts.length * 100)}%</span>
            <span class="ai-card-tag">热门艺人：${artists.slice(0, 4).map(a => a.name).join("、")}</span>
            <span class="ai-card-tag">${missCount} 首待补齐</span>
          </div>
        </div>
      </div>
    `;
  };
})();