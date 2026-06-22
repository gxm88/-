/* ============================================================
   api.js · API 接口层
   - 封装所有后端请求
   - 无后端时自动降级为 data.js 中的 mock 数据
   - 所有页面通过此模块获取数据，为后续后端接入做好准备
   ============================================================ */

const API = (() => {
  const BASE = "/api";
  const TIMEOUT = 8000;

  // ---- 通用请求 ----
  async function request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError' || e.name === 'TimeoutError') {
        throw new Error('请求超时');
      }
      throw e;
    }
  }

  // ---- Mock 降级 ----
  function mock(method, path, body) {
    // 模拟网络延迟
    const delay = 80 + Math.random() * 120;

    return new Promise((resolve) => {
      setTimeout(() => {
        // ---- 歌曲 ----
        if (path === "/tracks" || path.startsWith("/tracks?")) {
          let result = [...TRACKS];
          // 简单过滤逻辑
          if (path.includes("genre=")) {
            const m = path.match(/genre=([^&]+)/);
            if (m) result = result.filter(t => t.genre === decodeURIComponent(m[1]));
          }
          if (path.includes("sort=")) {
            const m = path.match(/sort=([^&]+)/);
            if (m && m[1] === "plays") result.sort((a, b) => (b.year || 0) - (a.year || 0));
          }
          return resolve({ data: result, total: result.length });
        }
        if (path.startsWith("/tracks/")) {
          const id = path.split("/tracks/")[1];
          const t = TRACKS.find(x => x.id === id);
          return resolve(t ? { data: t } : { error: "not found" });
        }

        // ---- 歌单 ----
        if (path === "/playlists" || path.startsWith("/playlists?")) {
          let result = [...PLAYLISTS];
          if (path.includes("type=")) {
            const m = path.match(/type=([^&]+)/);
            if (m) result = result.filter(p => p.type === m[1]);
          }
          return resolve({ data: result, total: result.length });
        }
        if (path.startsWith("/playlists/")) {
          const id = path.split("/playlists/")[1];
          const p = PLAYLISTS.find(x => x.id === id);
          return resolve(p ? { data: p } : { error: "not found" });
        }

        // ---- 榜单 ----
        if (path === "/charts") return resolve({ data: CHARTS, total: CHARTS.length });
        if (path === "/charts/local") {
          const local = CHARTS.filter(c => c.local);
          return resolve({ data: local, total: local.length });
        }

        // ---- 认证 ----
        if (path === "/auth/login" && method === "POST") {
          const { role } = body || {};
          return resolve({ ok: true, user: { name: role === "admin" ? "管理员" : "普通用户", role: role || "user" } });
        }
        if (path === "/auth/logout" && method === "POST") return resolve({ ok: true });
        if (path === "/auth/me") {
          return resolve({ ok: true, user: { name: "普通用户", role: "user" } });
        }

        // ---- 用户 ----
        if (path === "/user/profile") return resolve({ data: USER_PROFILE });
        if (path === "/user/favorites") return resolve({ data: pickN(TRACKS, 10, 4) });
        if (path === "/user/history") return resolve({ data: pickN(TRACKS, 12, 2) });
        if (path.startsWith("/user/favorites/") && method === "POST") return resolve({ ok: true });
        if (path.startsWith("/user/favorites/") && method === "DELETE") return resolve({ ok: true });
        if (path.startsWith("/user/history/") && method === "POST") return resolve({ ok: true });

        // ---- AI ----
        if (path === "/ai/daily") return resolve({ data: pickN(TRACKS, 12, new Date().getDate() % 7) });
        if (path === "/ai/nlp" && method === "POST") {
          const { prompt } = body || {};
          return resolve({ data: pickN(TRACKS, 10, (prompt || "").length % 7), prompt });
        }
        if (path === "/ai/playlists") return resolve({ data: PLAYLISTS.filter(p => p.type === "ai") });
        if (path === "/ai/similar") return resolve({ data: pickN(TRACKS, 8, 1) });

        // ---- 搜索 ----
        if (path.startsWith("/search")) {
          const m = path.match(/q=([^&]+)/);
          const q = m ? decodeURIComponent(m[1]).toLowerCase() : "";
          const k = q;
          return resolve({
            tracks: TRACKS.filter(t => !k || t.title.toLowerCase().includes(k) || t.artist.toLowerCase().includes(k)),
            albums: ALBUMS.filter(a => !k || a.title.toLowerCase().includes(k) || a.artist.toLowerCase().includes(k)),
            artists: ARTISTS.filter(a => !k || a.name.toLowerCase().includes(k)),
            playlists: PLAYLISTS.filter(p => !k || p.title.toLowerCase().includes(k)),
            charts: CHARTS.filter(c => !k || c.title.toLowerCase().includes(k)),
          });
        }

        // ---- 管理后台 ----
        if (path === "/admin/stats") return resolve({ data: ADMIN_STATS });
        if (path === "/admin/users") return resolve({ data: [{ id: "u1", name: "管理员", role: "admin", lastLogin: "2026-06-22" }, { id: "u2", name: "普通用户", role: "user", lastLogin: "2026-06-21" }] });
        if (path === "/admin/scan" && method === "POST") return resolve({ ok: true, message: "扫描已触发" });
        if (path === "/admin/logs") return resolve({ data: ["[2026-06-22 09:00] 扫描完成 · 发现 0 个新文件"] });
        if (path === "/admin/ai-config" && method === "PUT") return resolve({ ok: true });
        if (path === "/admin/network") return resolve({ data: { tcp_connections: 7, status: "正常" } });

        // ---- 歌手 / 专辑 / 文件夹 ----
        if (path === "/artists") return resolve({ data: ARTISTS, total: ARTISTS.length });
        if (path.startsWith("/artists/")) {
          const id = path.split("/artists/")[1];
          const a = ARTISTS.find(x => x.id === id);
          return resolve(a ? { data: a, tracks: pickN(TRACKS, 10, a.id.charCodeAt(1) % 5) } : { error: "not found" });
        }
        if (path === "/albums") return resolve({ data: ALBUMS, total: ALBUMS.length });
        if (path.startsWith("/albums/")) {
          const id = path.split("/albums/")[1];
          const a = ALBUMS.find(x => x.id === id);
          return resolve(a ? { data: a, tracks: pickN(TRACKS, 8, a.id.charCodeAt(1) % 5) } : { error: "not found" });
        }
        if (path === "/folders") return resolve({ data: FOLDERS, total: FOLDERS.length });
        if (path.startsWith("/folders/")) return resolve({ data: pickN(TRACKS, 10, 0) });

        return resolve({ error: "unknown mock path" });
      }, delay);
    });
  }

  // ---- 公开 API ----
  return {
    // 歌曲
    getTracks: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request("GET", `/tracks${qs ? "?" + qs : ""}`);
    },
    getTrack: (id) => request("GET", `/tracks/${id}`),

    // 歌单
    getPlaylists: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request("GET", `/playlists${qs ? "?" + qs : ""}`);
    },
    getPlaylist: (id) => request("GET", `/playlists/${id}`),
    createPlaylist: (data) => request("POST", "/playlists", data),
    updatePlaylist: (id, data) => request("PUT", `/playlists/${id}`, data),
    deletePlaylist: (id) => request("DELETE", `/playlists/${id}`),

    // 榜单
    getCharts: () => request("GET", "/charts"),
    getLocalCharts: () => request("GET", "/charts/local"),

    // 认证
    login: (credentials) => request("POST", "/auth/login", credentials),
    logout: () => request("POST", "/auth/logout"),
    getMe: () => request("GET", "/auth/me"),

    // 用户
    getProfile: () => request("GET", "/user/profile"),
    getFavorites: () => request("GET", "/user/favorites"),
    getHistory: () => request("GET", "/user/history"),
    addFavorite: (trackId) => request("POST", `/user/favorites/${trackId}`),
    removeFavorite: (trackId) => request("DELETE", `/user/favorites/${trackId}`),
    addHistory: (trackId) => request("POST", `/user/history/${trackId}`),

    // AI
    getDailyRecommend: () => request("GET", "/ai/daily"),
    generateNLP: (prompt) => request("POST", "/ai/nlp", { prompt }),
    getAIPlaylists: () => request("GET", "/ai/playlists"),
    getSimilar: () => request("GET", "/ai/similar"),

    // 搜索
    search: (q) => request("GET", `/search?q=${encodeURIComponent(q)}`),

    // 管理后台
    getAdminStats: () => request("GET", "/admin/stats"),
    getAdminUsers: () => request("GET", "/admin/users"),
    triggerScan: () => request("POST", "/admin/scan"),
    getAdminLogs: () => request("GET", "/admin/logs"),
    updateAIConfig: (config) => request("PUT", "/admin/ai-config", config),
    getNetworkStatus: () => request("GET", "/admin/network"),

    // 歌手 / 专辑 / 文件夹
    getArtists: () => request("GET", "/artists"),
    getArtist: (id) => request("GET", `/artists/${id}`),
    getAlbums: () => request("GET", "/albums"),
    getAlbum: (id) => request("GET", `/albums/${id}`),
    getFolders: () => request("GET", "/folders"),
    getFolder: (path) => request("GET", `/folders/${encodeURIComponent(path)}`),

    // 配置
    getBaseURL: () => BASE,
    setBaseURL: (url) => { /* 允许动态修改 */ },
  };
})();