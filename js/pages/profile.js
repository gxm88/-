window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { viewToggleBtn, mediaBlock, artistChip, rowFor } = window.Pages;

  window.Pages.profile = async function() {
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
  };

  window.Pages.profileColtab = async function(type) {
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
  };
})();