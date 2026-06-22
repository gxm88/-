/* ============================================================
   页面模块：每个页面一个渲染函数，内容通过 API 层获取
   视觉语言：夜晚沉浸听音空间 · 去卡片化 · 媒体块布局
   所有页面输出到同一个 body 容器 (page-body)，通过路由切换
   ============================================================ */

const Pages = (() => {
  const $ = (id) => document.getElementById(id);

  // ---- helpers ----

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

  // ============================================================
  // 骨架屏
  // ============================================================
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

  // ============================================================
  // 页面：首页
  // ============================================================
  async function home() {
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
  }

  // ============================================================
  // 页面：歌单广场
  // ============================================================
  async function discover() {
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
  }

  // ============================================================
  // 页面：AI 推荐中心
  // ============================================================
  async function aiCenter() {
    const [aiPlaylistsRes, similarRes, profileRes, playlistsRes] = await Promise.all([
      API.getAIPlaylists(),
      API.getSimilar(),
      API.getProfile(),
      API.getPlaylists(),
    ]);
    const aiPlaylists = aiPlaylistsRes.data;
    const similarTracks = similarRes.data;
    const userProfile = profileRes.data;
    const playlists = playlistsRes.data;

    return `
      ${pageHero("AI 智能推荐中心", "用语言描述心情，AI 从本地曲库匹配最合适的歌曲。所有计算仅在本地完成。", { brand: "AI · 智能推荐" })}

      <div class="ai-strategy-grid anim-fade-up stagger-1">
        <div class="ai-strategy-item" data-goto="ai-daily">
          <div class="icon-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 6.9L21 10l-5.5 4 1.7 7L12 17.8 6.8 21l1.7-7L3 10l6.6-1.1z"></path></svg>
          </div>
          <h3>每日个性化推荐</h3>
          <p>基于你的播放、收藏、跳过行为，每日自动生成 10 首专属歌单。越听越懂你。</p>
        </div>
        <div class="ai-strategy-item" data-goto="ai-nlp">
          <div class="icon-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <h3>自然语言生成歌单</h3>
          <p>输入场景、情绪、关键词，AI 即时匹配歌曲。例如："深夜地铁里的慢电子乐"。</p>
        </div>
        <div class="ai-strategy-item" data-goto="charts">
          <div class="icon-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path></svg>
          </div>
          <h3>全网热歌 · 本地补齐</h3>
          <p>聚合全网热搜，标注本地有无。识别缺失歌曲，一键补齐你的曲库。</p>
        </div>
      </div>

      <section class="page-section anim-fade-up stagger-2">
        <div class="section-head">
          <h3 class="section-title">AI 生成的推荐歌单</h3>
          ${viewToggleBtn("#ai-rec")}
        </div>
        <div class="media-list" id="ai-rec">
          ${aiPlaylists.map((p, i) => mediaBlock({
            title: p.title,
            sub: `${p.tracks} 首 · ${p.duration}`,
            type: "ai",
          }, i)).join("")}
        </div>
      </section>

      <section class="page-section anim-fade-up stagger-3">
        <div class="section-head">
          <h3 class="section-title">你的听歌画像</h3>
        </div>
        <div class="profile-bar-chart">
          <p style="font-size:12px;color:var(--text-3);margin-bottom:16px">基于近 30 天 ${userProfile.listen_minutes} 分钟播放量，AI 自动分析</p>
          ${userProfile.top_genres.map(g => `
            <div class="pbc-row">
              <div>${g.name}</div>
              <div class="pbc-bar"><div class="pbc-fill" style="width:${g.pct * 3}%"></div></div>
              <div class="pbc-val">${g.pct}%</div>
            </div>`).join("")}
          <div class="mini-spark">${userProfile.listening_7d.map(m => `<span style="height:${m * 0.25}px"></span>`).join("")}</div>
          <div style="margin-top:8px;font-size:11px;color:var(--text-3)">过去 7 天每日收听时长</div>
        </div>
      </section>

      <section class="page-section anim-fade-up stagger-4">
        <div class="section-head">
          <h3 class="section-title">相似推荐 · 基于当前播放</h3>
          ${viewToggleBtn("#ai-similar")}
        </div>
        <p style="color:var(--text-3);font-size:13px;margin-bottom:14px">与「Starlit Drive · Aurora Lane」在风格、情绪、节奏上相近的歌曲</p>
        <div class="track-list" id="ai-similar">
          ${similarTracks.map((t, i) => rowFor(t, i)).join("")}
        </div>
      </section>
    `;
  }

  // ============================================================
  // 页面：全部歌曲
  // ============================================================
  async function library() {
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
  }

  // ============================================================
  // 页面：每日个性化推荐
  // ============================================================
  async function aiDaily() {
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;
    const [dailyRes, playlistsRes, artistsRes, tracksRes] = await Promise.all([
      API.getDailyRecommend(),
      API.getPlaylists(),
      API.getArtists(),
      API.getTracks(),
    ]);
    const dailyTracks = dailyRes.data;
    const playlists = playlistsRes.data;
    const artists = artistsRes.data;
    const tracks = tracksRes.data;
    const topGenres = [...new Set(tracks.map(t => t.genre))].slice(0, 4);
    const topArtists = artists.slice(0, 5);

    return `
      ${pageHero("每日 AI 推荐", `${dateStr} · 基于你的听歌画像自动生成，每日更新`, { brand: "AI · 个性化推荐" })}

      <section class="page-section anim-fade-up stagger-1">
        <div class="section-head">
          <h3 class="section-title">你的听歌画像</h3>
        </div>
        <div class="profile-bar-chart" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
          ${topGenres.map((g, i) => {
            const pct = 85 - i * 12;
            const [c1, c2] = colorOf(i + 10);
            return `
            <div style="background:var(--bg-2);border-radius:var(--r-12);padding:18px 16px;text-align:center">
              <div style="font-size:13px;color:var(--text-2);margin-bottom:8px">${g}</div>
              <div class="bar" style="height:6px;background:var(--bg-3);border-radius:999px;overflow:hidden;margin-bottom:6px">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${c1},${c2});border-radius:999px"></div>
              </div>
              <div style="font-size:11px;color:var(--text-3)">${pct}% 偏好</div>
            </div>`;
          }).join("")}
        </div>
        <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:24px;background:var(--bg-2);border-radius:var(--r-12);padding:18px 22px">
          <div style="flex:1;min-width:140px">
            <div style="font-size:11px;color:var(--text-3);letter-spacing:1px;text-transform:uppercase">最爱艺人</div>
            <div style="font-size:15px;font-weight:600;margin-top:4px">${topArtists.map(a => a.name).join("、")}</div>
          </div>
          <div style="flex:1;min-width:140px">
            <div style="font-size:11px;color:var(--text-3);letter-spacing:1px;text-transform:uppercase">推荐依据</div>
            <div style="font-size:13px;color:var(--text-2);margin-top:4px">播放历史 · 收藏行为 · 跳过记录 · 时段偏好</div>
          </div>
          <button class="ai-card-cta" style="margin-top:0;white-space:nowrap" id="btn-refresh-daily">⟳ 刷新推荐</button>
        </div>
      </section>

      <section class="page-section anim-fade-up stagger-2">
        <div class="section-head">
          <h3 class="section-title">今日推荐曲目 · ${dailyTracks.length} 首</h3>
          ${viewToggleBtn("#daily-tracks")}
        </div>
        <div class="track-list" id="daily-tracks">
          ${dailyTracks.map((t, i) => rowFor(t, i)).join("")}
        </div>
      </section>

      <section class="page-section anim-fade-up stagger-3">
        <div class="section-head">
          <h3 class="section-title">相关 AI 歌单</h3>
          ${viewToggleBtn("#daily-playlists")}
        </div>
        <div class="media-list" id="daily-playlists">
          ${playlists.filter(p => p.type === "ai").map((p, i) => mediaBlock({
            title: p.title, sub: `${p.tracks} 首 · ${p.duration}`, type: "ai",
          }, i)).join("")}
        </div>
      </section>
    `;
  }

  // ============================================================
  // 页面：自然语言生成歌单
  // ============================================================
  async function aiNLP() {
    const prompts = [
      "深夜地铁里的慢电子乐",
      "阳光明媚的早晨，一杯咖啡",
      "失恋后的治愈系民谣",
      "跑步时的高能量摇滚",
      "雨天的氛围音乐",
      "复古 80 年代合成器浪潮",
    ];
    return `
      ${pageHero("自然语言生成歌单", "用自然语言描述场景、情绪或关键词，AI 即时从本地曲库匹配最合适的歌曲", { brand: "AI · 智能创作" })}

      <section class="page-section anim-fade-up stagger-1">
        <div class="nlp-input-area" style="background:var(--bg-2);border-radius:var(--r-16);padding:28px;margin-bottom:24px">
          <div style="display:flex;gap:12px;align-items:stretch">
            <div style="flex:1;position:relative">
              <svg style="position:absolute;left:16px;top:16px;color:var(--text-3);pointer-events:none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <input type="text" id="nlp-input" placeholder="描述你想要的音乐场景、情绪或风格…"
                style="width:100%;padding:14px 14px 14px 44px;background:var(--bg-3);border:1px solid var(--border);border-radius:var(--r-12);color:var(--text-1);font-size:14px;outline:none;box-sizing:border-box"
                autocomplete="off">
            </div>
            <button id="nlp-gen-btn" class="ai-card-cta" style="margin-top:0;padding:14px 28px;font-size:14px;white-space:nowrap">⟐ 生成歌单</button>
          </div>
          <div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:8px">
            <span style="font-size:11px;color:var(--text-3);letter-spacing:1px;margin-right:4px;display:flex;align-items:center">试试这些：</span>
            ${prompts.map(p => `<button class="nlp-prompt-pill" data-prompt="${p}" style="padding:6px 14px;background:var(--bg-3);border:1px solid var(--border);border-radius:999px;color:var(--text-2);font-size:12px;cursor:pointer;transition:all var(--t-fast)">${p}</button>`).join("")}
          </div>
        </div>
      </section>

      <div id="nlp-result-area">
        <section class="page-section anim-fade-up" style="text-align:center;padding:60px 0">
          <div style="font-size:48px;margin-bottom:16px;opacity:0.4">⟐</div>
          <p style="font-size:16px;color:var(--text-3)">输入一段描述，AI 将为你匹配合适的歌曲</p>
          <p style="font-size:13px;color:var(--text-dim);margin-top:6px">所有计算仅在本地完成，无需联网</p>
        </section>
      </div>
    `;
  }

  // ============================================================
  // 页面：AI 生成歌单（侧栏入口）
  // ============================================================
  async function aiPlaylists() {
    const aiPlaylistsRes = await API.getAIPlaylists();
    const aiPls = aiPlaylistsRes.data;
    const totalTracks = aiPls.reduce((sum, p) => sum + p.tracks, 0);
    return `
      ${pageHero("AI 生成歌单", "AI 根据你的听歌画像、心情、场景自动生成专属歌单，持续更新", { brand: "AI · 智能生成" })}

      <section class="page-section anim-fade-up stagger-1">
        <div class="section-head">
          <h3 class="section-title">全部 AI 歌单 · ${aiPls.length} 张 · ${totalTracks} 首</h3>
          ${viewToggleBtn("#ai-playlists-all")}
        </div>
        <div class="media-list" id="ai-playlists-all">
          ${aiPls.map((p, i) => mediaBlock({
            title: p.title,
            sub: p.desc,
            tracks: p.tracks,
            duration: p.duration,
            type: "ai",
          }, i)).join("")}
        </div>
      </section>

      <section class="page-section anim-fade-up stagger-2">
        <div style="background:linear-gradient(135deg,var(--bg-2),var(--bg-3));border-radius:var(--r-16);padding:28px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
          <div>
            <div style="font-size:18px;font-weight:600;margin-bottom:4px">想创建你自己的 AI 歌单？</div>
            <div style="font-size:13px;color:var(--text-2)">用自然语言描述你想要的音乐，AI 即时生成专属歌单</div>
          </div>
          <button class="ai-card-cta" style="margin-top:0" data-goto="ai-nlp">⟐ 开始创作</button>
        </div>
      </section>

      <section class="page-section anim-fade-up stagger-3">
        <div class="section-head">
          <h3 class="section-title">每日个性化推荐</h3>
        </div>
        <div class="ai-strategy-grid" style="grid-template-columns:1fr">
          <div class="ai-strategy-item" data-goto="ai-daily" style="display:flex;flex-direction:row;align-items:center;gap:20px;text-align:left;padding:22px 28px">
            <div class="icon-lg" style="flex-shrink:0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 6.9L21 10l-5.5 4 1.7 7L12 17.8 6.8 21l1.7-7L3 10l6.6-1.1z"></path></svg>
            </div>
            <div>
              <h3 style="margin:0 0 4px">每日 AI 推荐</h3>
              <p style="margin:0;font-size:13px;color:var(--text-2)">基于你的播放、收藏、跳过行为，每日自动生成 10 首专属歌单</p>
            </div>
            <span style="margin-left:auto;color:var(--text-3);font-size:20px">→</span>
          </div>
        </div>
      </section>
    `;
  }
  // ============================================================
  // 页面：全网热榜
  async function chartsPage() {
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
  }

  // ============================================================
  // 页面：歌手
  // ============================================================
  async function artists() {
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
  }

  // ============================================================
  // 页面：专辑
  // ============================================================
  async function albums() {
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
  }

  // ============================================================
  // 页面：专辑详情
  // ============================================================
  async function albumDetail(id) {
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
  }

  // ============================================================
  // 页面：文件夹
  // ============================================================
  async function folders() {
    const [foldersRes, tracksRes] = await Promise.all([
      API.getFolders(),
      API.getTracks(),
    ]);
    const folders = foldersRes.data;
    const tracks = tracksRes.data;

    return `
      ${pageHero("文件夹视图", "完全映射宿主机 /music 目录结构 · 直接以目录方式浏览与播放", { brand: folders.length + " 个目录" })}

      <div class="folder-breadcrumb anim-fade-up">
        <span>music</span><span class="sep">/</span>
      </div>
      <div class="section-head anim-fade-up stagger-1">
        <h3 class="section-title">目录列表 · ${folders.length} 个</h3>
        ${viewToggleBtn("#folders-grid")}
      </div>
      <div class="folder-grid anim-fade-up stagger-1" id="folders-grid">
        ${folders.map((f, i) => {
          const [c1, c2] = colorOf(i);
          return `
            <div class="folder-item" data-folder="${f.path}">
              <div class="folder-ic" style="background:${c1}22;color:${c1}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>
              </div>
              <div>
                <div class="folder-name">${f.name}</div>
                <div class="playlist-sub" style="margin-top:2px">${f.count} 首 · ${f.path}</div>
              </div>
            </div>`;
        }).join("")}
      </div>

      <div class="section-head anim-fade-up stagger-2" style="margin-top:28px">
        <h3 class="section-title">当前目录下的歌曲</h3>
        ${viewToggleBtn("#folder-tracks")}
      </div>
      <div class="track-list anim-fade-up stagger-2" id="folder-tracks">
        ${tracks.slice(0, 10).map((t, i) => rowFor(t, i)).join("")}
      </div>
    `;
  }

  // ============================================================
  // 页面：个人中心
  // ============================================================
  async function profile() {
    const [profileRes, favoritesRes, historyRes] = await Promise.all([
      API.getProfile(),
      API.getFavorites(),
      API.getHistory(),
    ]);
    const userProfile = profileRes.data;
    const favorites = favoritesRes.data;
    const history = historyRes.data;

    return `
      <section class="page-section anim-fade-up">
        <div class="profile-head">
          <div class="avatar-lg">L</div>
          <div>
            <div class="ph-type">Listener · 普通用户</div>
            <h2 class="profile-name">Listener_01</h2>
            <p class="profile-bio">在地铁和深夜咖啡馆听歌 · 偏爱 Dream-pop 和慢爵士。</p>
            <div class="profile-meta">
              <span>${userProfile.listen_minutes} 分钟总收听</span>
              <span>${userProfile.fav_count} 首收藏</span>
              <span>${userProfile.playlists} 张歌单</span>
              <span>加入于 2024 年 2 月</span>
            </div>
            <div class="profile-ctas">
              <button class="primary">编辑资料</button>
              <button>我的设置</button>
              <button>导出听歌报告</button>
            </div>
          </div>
        </div>

        <div class="stats-row anim-fade-up stagger-1">
          <div class="stat-block"><div class="stat-num">3,284</div><div class="stat-label">分钟 · 过去 30 天</div></div>
          <div class="stat-block"><div class="stat-num">182</div><div class="stat-label">收藏歌曲</div></div>
          <div class="stat-block"><div class="stat-num">28</div><div class="stat-label">收藏专辑</div></div>
          <div class="stat-block"><div class="stat-num">12</div><div class="stat-label">收藏歌手</div></div>
        </div>

        <div class="col-tabs anim-fade-up stagger-2" style="margin-top:16px">
          <button class="col-tab is-active" data-coltab="songs">收藏的歌曲</button>
          <button class="col-tab" data-coltab="albums">收藏的专辑</button>
          <button class="col-tab" data-coltab="artists">收藏的歌手</button>
          <button class="col-tab" data-coltab="playlists">我的歌单</button>
          <button class="col-tab" data-coltab="history">播放历史</button>
        </div>

        <div id="coltab-body"></div>
      </section>
    `;
  }

  async function profileColtab(type) {
    if (type === "songs") {
      const favRes = await API.getFavorites();
      const favTracks = favRes.data;
      return `
        <div class="section-head">
          <h3 class="section-title">收藏的歌曲</h3>
          ${viewToggleBtn("#prof-songs")}
        </div>
        <div class="track-list" id="prof-songs">${favTracks.map((t, i) => rowFor(t, i)).join("")}</div>`;
    }
    if (type === "albums") {
      const albumsRes = await API.getAlbums();
      const albums = albumsRes.data;
      return `
        <div class="section-head">
          <h3 class="section-title">收藏的专辑</h3>
          ${viewToggleBtn("#prof-albums")}
        </div>
        <div class="media-list" id="prof-albums">${albums.slice(0, 8).map((a, i) => mediaBlock({
        title: a.title, sub: a.artist + " · " + a.year, albumId: a.id,
      }, i)).join("")}</div>`;
    }
    if (type === "artists") {
      const artistsRes = await API.getArtists();
      const artists = artistsRes.data;
      return `
        <div class="section-head">
          <h3 class="section-title">收藏的歌手</h3>
          ${viewToggleBtn("#prof-artists")}
        </div>
        <div class="artist-scroll" id="prof-artists">${artists.slice(0, 8).map(artistChip).join("")}</div>`;
    }
    if (type === "playlists") {
      const playlistsRes = await API.getPlaylists();
      const playlists = playlistsRes.data;
      return `
        <div class="section-head">
          <h3 class="section-title">我的歌单</h3>
          ${viewToggleBtn("#prof-playlists")}
        </div>
        <div class="media-list" id="prof-playlists">${playlists.filter(p => p.type === "user").map((p, i) => mediaBlock({
        title: p.title, sub: `${p.tracks} 首 · ${p.duration}`, type: "user",
      }, i)).join("")}</div>`;
    }
    if (type === "history") {
      const histRes = await API.getHistory();
      const histTracks = histRes.data;
      return `
        <div class="filter-bar">
          <span class="filter-pill is-active">今天</span>
          <span class="filter-pill">本周</span>
          <span class="filter-pill">本月</span>
          <span class="filter-pill">全部</span>
          <span class="filter-spacer"></span>
          <span class="filter-pill">一键清空历史</span>
        </div>
        <div class="section-head">
          <h3 class="section-title">播放历史</h3>
          ${viewToggleBtn("#prof-history")}
        </div>
        <div class="track-list" id="prof-history">${histTracks.map((t, i) => rowFor(t, i)).join("")}</div>`;
    }
    return "";
  }

  // ============================================================
  // 页面：歌单详情
  // ============================================================
  async function playlistDetail(id) {
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
  }

  // ============================================================
  // 页面：搜索结果
  // ============================================================
  async function searchResults(q) {
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
  }

  // ============================================================
  // 管理员后台
  // ============================================================
  async function admin() {
    return `
      <section class="page-section anim-fade-up">
        ${pageHero("管理后台", "所有前台展示、AI 模型、曲库、用户权限均在这里配置。", { brand: "Administrator" })}

        <div class="admin-layout">
          <div>
            <div class="admin-side-menu">
              <div class="side-group-title" style="padding:4px 12px;font-size:11px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase">数据总览</div>
              <button class="admin-side-item is-active" data-adm="dashboard">📊 仪表盘</button>

              <div class="side-group-title" style="padding:14px 12px 4px;font-size:11px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase">曲库管理</div>
              <button class="admin-side-item" data-adm="library-mgmt">📁 目录挂载 / 扫描</button>
              <button class="admin-side-item" data-adm="metadata">✨ 元数据修复</button>
              <button class="admin-side-item" data-adm="ops">🧹 重复 / 冗余清理</button>

              <div class="side-group-title" style="padding:14px 12px 4px;font-size:11px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase">用户与内容</div>
              <button class="admin-side-item" data-adm="users">👥 用户管理</button>
              <button class="admin-side-item" data-adm="pl-edit">📝 歌单编辑</button>

              <div class="side-group-title" style="padding:14px 12px 4px;font-size:11px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase">AI 与服务</div>
              <button class="admin-side-item" data-adm="ai-config">⟐ AI 模型配置</button>
              <button class="admin-side-item" data-adm="network">🌐 网络 / TCP 服务</button>
              <button class="admin-side-item" data-adm="backup">🗄 日志 / 备份</button>
            </div>
          </div>

          <div id="admin-body"></div>
        </div>
      </section>
    `;
  }

  async function admDashboard() {
    const statsRes = await API.getAdminStats();
    const stats = statsRes.data;
    return `
      <div class="admin-hero-row anim-fade-up">
        <div class="admin-stat"><div class="as-num">${stats.total_tracks}</div><div class="as-label">收录歌曲</div><div class="as-trend">+ 24 新扫描</div></div>
        <div class="admin-stat"><div class="as-num">${stats.total_users}</div><div class="as-label">注册用户</div><div class="as-trend" style="color:var(--accent)">7 人在线</div></div>
        <div class="admin-stat"><div class="as-num">${stats.total_plays_24h}</div><div class="as-label">24 小时播放</div><div class="as-trend">+ 12% vs 昨天</div></div>
        <div class="admin-stat"><div class="as-num">${stats.ai_calls_today}</div><div class="as-label">AI 调用次数</div><div class="as-trend">3 个模型已启用</div></div>
      </div>

      <div class="admin-panel" style="margin-bottom:14px">
        <h3>存储与性能</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
          <div>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">磁盘 · ${stats.storage_used} / ${stats.storage_total}</div>
            <div class="bar" style="height:8px;background:var(--bg-3);border-radius:999px;overflow:hidden"><div style="height:100%;width:10%;background:linear-gradient(90deg,var(--accent),#c9b6ff);border-radius:999px"></div></div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">CPU · ${stats.cpu_load}</div>
            <div class="bar" style="height:8px;background:var(--bg-3);border-radius:999px;overflow:hidden"><div style="height:100%;width:32%;background:linear-gradient(90deg,#4ade80,#22d3ee);border-radius:999px"></div></div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">内存 · ${stats.mem_load}</div>
            <div class="bar" style="height:8px;background:var(--bg-3);border-radius:999px;overflow:hidden"><div style="height:100%;width:48%;background:linear-gradient(90deg,#fbbf24,#f87171);border-radius:999px"></div></div>
          </div>
        </div>
      </div>

      <div class="admin-panel">
        <h3>最近扫描</h3>
        <div class="scan-log">
<span class="ok">[2026-06-21 09:12:04] ▸ 扫描 /music/Synthwave · 发现 88 个新文件</span>
<span class="ok">[2026-06-21 09:12:11] ▸ 元数据补全 · 成功 86 / 88</span>
<span class="warn">[2026-06-21 09:12:13] ▸ 2 个文件缺少封面 · 从云端拉取</span>
<span class="ok">[2026-06-21 09:12:20] ▸ 封面拉取完成 · 2 / 2</span>
<span class="dim">[2026-06-21 09:12:22] ▸ 重复检测：发现 1 组潜在重复</span>
<span class="ok">[2026-06-21 09:12:24] ▸ TCP 连接数 ${stats.tcp_connections} · 心跳正常</span>
<span class="ok">[2026-06-21 09:12:30] ▸ AI 推荐缓存生成完毕 · 8 位用户</span>
        </div>
      </div>
    `;
  }

  async function admLibraryMgmt() {
    const foldersRes = await API.getFolders();
    const folders = foldersRes.data;
    return `
      <div class="admin-panel" style="margin-bottom:14px">
        <h3>目录挂载</h3>
        <p style="font-size:12px;color:var(--text-3);margin-bottom:14px">将宿主机目录映射到容器。修改后需重新扫描。</p>
        <div class="data-table" style="border:1px solid var(--border);border-radius:10px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:var(--bg-3)">
                <th style="padding:10px 14px;text-align:left;color:var(--text-3);font-size:12px">宿主机路径</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-3);font-size:12px">文件数</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-3);font-size:12px">状态</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-3);font-size:12px">最后扫描</th>
                <th style="padding:10px 14px;text-align:right;color:var(--text-3);font-size:12px">操作</th>
              </tr>
            </thead>
            <tbody>
              ${folders.map(f => `
                <tr style="border-top:1px solid var(--border)">
                  <td style="padding:10px 14px;font-size:13px"><code>${f.path}</code></td>
                  <td style="padding:10px 14px;font-size:13px;color:var(--text-2)">${f.count}</td>
                  <td style="padding:10px 14px;font-size:13px"><span class="status-dot">已挂载</span></td>
                  <td style="padding:10px 14px;font-size:12px;color:var(--text-3)">2 小时前</td>
                  <td style="padding:10px 14px;text-align:right"><button class="icon-btn">⋯</button></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div style="margin-top:14px;display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0">＋ 添加目录</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">立即全量扫描</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">增量扫描</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">后台定时任务</button>
        </div>
      </div>

      <div class="admin-panel">
        <h3>扫描日志</h3>
        <div class="scan-log">
<span class="ok">[09:12:04] ▸ 扫描 /music/Synthwave · 88 个新文件</span>
<span class="ok">[09:12:11] ▸ 元数据补全 · 成功 86 / 88</span>
<span class="warn">[09:12:13] ▸ 2 个文件缺少封面，拉取中...</span>
<span class="ok">[09:12:20] ▸ 封面拉取完成 · 2 / 2</span>
<span class="dim">[09:12:22] ▸ 重复检测：1 组潜在重复</span>
        </div>
      </div>
    `;
  }

  async function admUsers() {
    const usersRes = await API.getAdminUsers();
    const users = usersRes.data;
    return `
      <div class="admin-panel" style="margin-bottom:14px">
        <h3>用户管理</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:14px">
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:22px">24</div><div class="as-label">总用户</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:22px;color:var(--accent)">7</div><div class="as-label">在线</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:22px">2</div><div class="as-label">管理员</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:22px">22</div><div class="as-label">普通用户</div></div>
        </div>

        <table class="data-table">
          <thead>
            <tr><th>用户名</th><th>角色</th><th>邮箱</th><th>最近登录</th><th>状态</th><th style="text-align:right">操作</th></tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${u.name}</td>
                <td style="color:${u.role === 'admin' ? 'var(--accent)' : 'var(--text-2)'}">${u.role === 'admin' ? '管理员' : '普通用户'}</td>
                <td style="color:var(--text-3);font-size:12px">${u.email || '-'}</td>
                <td style="color:var(--text-3);font-size:12px">${u.lastLogin || '-'}</td>
                <td><span class="status-dot">正常</span></td>
                <td style="text-align:right"><button class="icon-btn">⋯</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="admin-panel">
        <h3>系统参数</h3>
        <div class="switch-row"><div><div style="font-size:13px">开放注册</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">允许新用户自主申请账号。关闭后仅管理员可创建。</div></div><div class="switch is-on"></div></div>
        <div class="switch-row"><div><div style="font-size:13px">邀请码注册</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">开启后新注册需要填写有效邀请码。</div></div><div class="switch"></div></div>
        <div class="switch-row"><div><div style="font-size:13px">每日 AI 推荐自动生成</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">自动在凌晨 3:00 为每位用户生成个性化推荐。</div></div><div class="switch is-on"></div></div>
      </div>
    `;
  }

  async function admAIConfig() {
    const models = [
      { name: "DeepSeek · Music LLM", desc: "用于自然语言 → 歌单匹配", key: "sk-...7a2f", calls: 184, enabled: true },
      { name: "本地 · 小模型 (FastRec)",  desc: "本地私有化推荐引擎，无外部请求", key: "-", calls: 642, enabled: true },
      { name: "Qwen · 情绪识别",            desc: "情绪标签生成，用于情绪匹配", key: "sk-...q2nM", calls: 112, enabled: false },
    ];
    return `
      <div class="admin-panel" style="margin-bottom:14px">
        <h3>AI 模型管理</h3>
        <div style="margin-bottom:14px;color:var(--text-3);font-size:12px">多模型接入 · 云端 API 与本地私有化模型兼容 · 可按调用限流</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
          ${models.map(m => `
            <div class="admin-stat" style="padding:18px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center">
              <div>
                <div style="font-weight:600">${m.name}</div>
                <div style="font-size:12px;color:var(--text-3);margin-top:4px">${m.desc}</div>
                <div style="font-size:11px;color:var(--text-dim);margin-top:10px;font-family:monospace">API Key: ${m.key}</div>
                <div style="font-size:11px;color:var(--text-3);margin-top:4px">今日调用 · ${m.calls} 次</div>
              </div>
              <div class="switch ${m.enabled ? "is-on" : ""}"></div>
            </div>`).join("")}
        </div>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0">＋ 添加模型</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">调用统计</button>
        </div>
      </div>

      <div class="admin-panel" style="margin-bottom:14px">
        <h3>推荐策略</h3>
        <div class="two-col-form">
          <div class="form-field"><label>推荐数量（每日）</label><input type="text" value="10 首" /></div>
          <div class="form-field"><label>冷启动策略</label><select><option>用热门榜单填充</option><option>用 AI 随机探索</option></select></div>
          <div class="form-field"><label>行为权重 · 播放完成</label><input type="text" value="0.55" /></div>
          <div class="form-field"><label>行为权重 · 收藏</label><input type="text" value="0.30" /></div>
          <div class="form-field"><label>行为权重 · 跳过</label><input type="text" value="-0.15" /></div>
          <div class="form-field"><label>推荐刷新时间</label><input type="text" value="每日 03:00" /></div>
        </div>
      </div>

      <div class="admin-panel">
        <h3>全网热榜爬虫</h3>
        <div class="switch-row"><div><div>网易云 · 热歌榜</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">每日 02:00 同步</div></div><div class="switch is-on"></div></div>
        <div class="switch-row"><div><div>Spotify · Global Top 50</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">每 6 小时同步一次</div></div><div class="switch is-on"></div></div>
        <div class="switch-row"><div><div>Apple Music · Daily Top 100</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">每日 02:30 同步</div></div><div class="switch"></div></div>
      </div>
    `;
  }

  async function admNetwork() {
    const statsRes = await API.getAdminStats();
    const stats = statsRes.data;
    return `
      <div class="admin-panel" style="margin-bottom:14px">
        <h3>站点配置</h3>
        <div class="two-col-form">
          <div class="form-field"><label>站点名称</label><input type="text" value="MuseBox · 私有音乐" /></div>
          <div class="form-field"><label>Logo</label><input type="text" value="default" /></div>
          <div class="form-field"><label>公网地址</label><input type="text" value="https://music.mydomain.local" /></div>
          <div class="form-field"><label>版权信息</label><input type="text" value="© 2026 MuseBox · 仅供个人使用" /></div>
        </div>
      </div>

      <div class="admin-panel" style="margin-bottom:14px">
        <h3>TCP 实时服务</h3>
        <div class="two-col-form">
          <div class="form-field"><label>端口</label><input type="text" value="8787" /></div>
          <div class="form-field"><label>心跳间隔 (秒)</label><input type="text" value="30" /></div>
          <div class="form-field"><label>最大同时连接数</label><input type="text" value="1024" /></div>
          <div class="form-field"><label>弱网重连策略</label><select><option>指数退避</option></select></div>
        </div>

        <div style="margin-top:16px">
          <h3 style="font-size:14px;margin-bottom:10px">当前连接 (${stats.tcp_connections})</h3>
          <table class="data-table">
            <thead><tr><th>客户端</th><th>用户</th><th>版本</th><th>延迟</th><th>状态</th></tr></thead>
            <tbody>
              <tr><td>iPhone 15 · iOS 17</td><td>listener_01</td><td style="color:var(--text-3);font-size:12px">v1.2.4</td><td>32 ms</td><td><span class="status-dot">正常</span></td></tr>
              <tr><td>iPad · iPadOS 17</td><td>nightrain</td><td style="color:var(--text-3);font-size:12px">v1.2.4</td><td>48 ms</td><td><span class="status-dot">正常</span></td></tr>
              <tr><td>Mac · Chrome 128</td><td>cafe.m</td><td style="color:var(--text-3);font-size:12px">Web</td><td>12 ms</td><td><span class="status-dot">正常</span></td></tr>
              <tr><td>Android 14</td><td>listener_01</td><td style="color:var(--text-3);font-size:12px">v1.2.4</td><td>58 ms</td><td><span class="status-dot">正常</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-panel">
        <h3>网络 / 安全</h3>
        <div class="switch-row"><div><div>HTTPS 强制</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">所有 HTTP 请求重定向到 HTTPS</div></div><div class="switch is-on"></div></div>
        <div class="switch-row"><div><div>IP 黑白名单</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">白名单模式 · 仅允许 192.168.0.0/16</div></div><div class="switch is-on"></div></div>
        <div class="switch-row"><div><div>接口限流</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">每 IP 每分钟 120 次</div></div><div class="switch is-on"></div></div>
      </div>
    `;
  }

  async function admBackup() {
    return `
      <div class="admin-panel" style="margin-bottom:14px">
        <h3>系统日志</h3>
        <div class="filter-bar" style="margin-bottom:14px">
          <span class="filter-pill is-active">全部</span>
          <span class="filter-pill">系统</span>
          <span class="filter-pill">播放</span>
          <span class="filter-pill">错误</span>
          <span class="filter-pill">操作</span>
          <span class="filter-spacer"></span>
          <span class="filter-pill">导出</span>
        </div>
        <div class="scan-log">
<span class="ok">[09:12:04] INFO · 扫描 /music/Synthwave 完成 · 88 个文件</span>
<span class="ok">[09:12:20] INFO · AI 推荐缓存生成 · 8 位用户</span>
<span class="warn">[09:12:25] WARN · listener_18 连续 API 请求 120 次/min · 触发限流</span>
<span class="ok">[09:13:02] INFO · user nightrain 从 iPhone 登录 (TCP)</span>
<span class="ok">[09:13:04] INFO · user nightrain 开始播放 "Starlit Drive" · 进度同步</span>
<span class="dim">[09:13:10] DEBUG · 双端同步队列 · 3 条命令 · 0 冲突</span>
<span class="ok">[09:14:00] INFO · 每日备份完成 · /backup/musebox-20260621.gz · 184 MB</span>
        </div>
      </div>

      <div class="admin-panel">
        <h3>备份与恢复</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
          <div class="admin-stat" style="padding:16px"><div class="as-num" style="font-size:18px">每日自动备份</div><div class="as-label" style="margin-top:4px">03:30 · 保留最近 14 份</div></div>
          <div class="admin-stat" style="padding:16px"><div class="as-num" style="font-size:18px">最近备份</div><div class="as-label" style="margin-top:4px">2026-06-21 03:30 · 184 MB</div></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0">立即备份</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">导入配置</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">导出配置</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">从备份恢复</button>
        </div>
      </div>
    `;
  }

  async function admMetadata() {
    const statsRes = await API.getAdminStats();
    const stats = statsRes.data;
    return `
      <div class="admin-panel">
        <h3>元数据修复</h3>
        <p style="font-size:12px;color:var(--text-3);margin-bottom:14px">自动从音乐指纹与云端数据源补齐标题、歌手、专辑、封面、歌词。</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:14px">
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px">${stats.total_tracks}</div><div class="as-label">已扫描歌曲</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px;color:var(--good)">1,248</div><div class="as-label">元数据完整</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px;color:var(--warn)">36</div><div class="as-label">需要修复</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px;color:var(--text-3)">8</div><div class="as-label">缺失封面</div></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0">一键修复</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">歌词重新匹配</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">封面重新拉取</button>
        </div>
      </div>
    `;
  }

  async function admOps() {
    return `
      <div class="admin-panel">
        <h3>重复检测与冗余清理</h3>
        <p style="font-size:12px;color:var(--text-3);margin-bottom:14px">基于文件指纹 + 元数据的双重比对，识别可能的重复。</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px">
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px">3</div><div class="as-label">重复歌曲组</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px">12</div><div class="as-label">孤立元数据记录</div></div>
          <div class="admin-stat" style="padding:14px"><div class="as-num" style="font-size:20px">42 MB</div><div class="as-label">可释放空间</div></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0">运行检测</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">批量编辑</button>
        </div>
      </div>
    `;
  }

  async function admPlaylistEdit() {
    const playlistsRes = await API.getPlaylists();
    const playlists = playlistsRes.data;
    return `
      <div class="admin-panel">
        <h3>官方歌单编辑</h3>
        <div class="media-list">
          ${playlists.filter(p => p.type === "official").map((p, i) => mediaBlock({
            title: p.title, sub: `${p.tracks} 首 · ${p.duration}`, type: "official",
          }, i)).join("")}
        </div>
        <div style="margin-top:20px;display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0">新建官方歌单</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">用户公开歌单审核</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">首页推荐置顶位</button>
        </div>
      </div>
    `;
  }

  return {
    home, discover: discover, charts: chartsPage, aiCenter: aiCenter,
    aiDaily, aiNLP, aiPlaylists,
    library, artists, albums, albumDetail, folders,
    profile, profileColtab: profileColtab, playlistDetail: playlistDetail, searchResults,
    viewToggleBtn, rowFor,
    admin, admDashboard, admLibraryMgmt, admUsers, admAIConfig,
    admNetwork, admBackup, admMetadata, admOps, admPlaylistEdit,
    renderSkeleton,
  };
})();