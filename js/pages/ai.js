window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { pageHero, viewToggleBtn, mediaBlock, rowFor } = window.Pages;

  window.Pages.aiCenter = async function() {
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
  };

  window.Pages.aiDaily = async function() {
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
  };

  window.Pages.aiNLP = async function() {
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
  };

  window.Pages.aiPlaylists = async function() {
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
  };
})();