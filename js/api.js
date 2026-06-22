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
      const res = await fetch(BASE + path, {
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
        if (path === "/login" && method === "POST") {
          const { username, password } = body || {};
          const isAdmin = username === "admin";
          const mockToken = "mock-token-" + Date.now();
          return resolve({
            ok: true,
            token: mockToken,
            user: {
              id: isAdmin ? 1 : 2,
              username: username || "user",
              name: isAdmin ? "管理员" : "普通用户",
              role: isAdmin ? "admin" : "user",
              avatar: (username || "U").charAt(0).toUpperCase()
            }
          });
        }
        if (path === "/logout" && method === "POST") return resolve({ ok: true });
        if (path === "/profile") {
          return resolve({ data: USER_PROFILE });
        }

        // ---- 用户 ----
        if (path === "/favorites") return resolve({ data: pickN(TRACKS, 10, 4) });
        if (path === "/history") return resolve({ data: pickN(TRACKS, 12, 2) });
        if (path.startsWith("/favorites/") && method === "POST") return resolve({ ok: true });
        if (path.startsWith("/favorites/") && method === "DELETE") return resolve({ ok: true });
        if (path.startsWith("/history/") && method === "POST") return resolve({ ok: true });

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
      const path = `/tracks${qs ? "?" + qs : ""}`;
      return request("GET", path).catch(() => mock("GET", path));
    },
    getTrack: (id) => {
      const path = `/tracks/${id}`;
      return request("GET", path).catch(() => mock("GET", path));
    },

    // 歌单
    getPlaylists: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      const path = `/playlists${qs ? "?" + qs : ""}`;
      return request("GET", path).catch(() => mock("GET", path));
    },
    getPlaylist: (id) => {
      const path = `/playlists/${id}`;
      return request("GET", path).catch(() => mock("GET", path));
    },
    createPlaylist: (data) => request("POST", "/playlists", data).catch(() => mock("POST", "/playlists", data)),
    updatePlaylist: (id, data) => request("PUT", `/playlists/${id}`, data).catch(() => mock("PUT", `/playlists/${id}`, data)),
    deletePlaylist: (id) => request("DELETE", `/playlists/${id}`).catch(() => mock("DELETE", `/playlists/${id}`)),

    // 榜单
    getCharts: () => request("GET", "/charts").catch(() => mock("GET", "/charts")),
    getLocalCharts: () => request("GET", "/charts/local").catch(() => mock("GET", "/charts/local")),

    // 认证
    login: (credentials) => request("POST", "/login", credentials).catch(() => mock("POST", "/login", credentials)),
    logout: () => request("POST", "/logout").catch(() => ({ ok: true })),
    getMe: () => request("GET", "/profile").catch(() => mock("GET", "/profile")),

    // 用户
    getProfile: () => request("GET", "/profile").catch(() => mock("GET", "/profile")),
    getFavorites: () => request("GET", "/favorites").catch(() => mock("GET", "/favorites")),
    getHistory: () => request("GET", "/history").catch(() => mock("GET", "/history")),
    addFavorite: (trackId) => request("POST", `/favorites/${trackId}`).catch(() => ({ ok: true })),
    removeFavorite: (trackId) => request("DELETE", `/favorites/${trackId}`).catch(() => ({ ok: true })),
    addHistory: (trackId) => request("POST", `/history/${trackId}`).catch(() => ({ ok: true })),

    // AI
    getDailyRecommend: () => request("GET", "/ai/daily").catch(() => mock("GET", "/ai/daily")),
    generateNLP: (prompt) => request("POST", "/ai/nlp", { prompt }).catch(() => mock("POST", "/ai/nlp", { prompt })),
    getAIPlaylists: () => request("GET", "/ai/playlists").catch(() => mock("GET", "/ai/playlists")),
    getSimilar: () => request("GET", "/ai/similar").catch(() => mock("GET", "/ai/similar")),

    // 搜索
    search: (q) => request("GET", `/search?q=${encodeURIComponent(q)}`).catch(() => mock("GET", `/search?q=${encodeURIComponent(q)}`)),

    // 管理后台
    getAdminStats: () => request("GET", "/admin/stats").catch(() => mock("GET", "/admin/stats")),
    getAdminUsers: () => request("GET", "/admin/users").catch(() => mock("GET", "/admin/users")),
    triggerScan: () => request("POST", "/admin/scan").catch(() => mock("POST", "/admin/scan")),
    getAdminLogs: () => request("GET", "/admin/logs").catch(() => mock("GET", "/admin/logs")),
    updateAIConfig: (config) => request("PUT", "/admin/ai-config", config).catch(() => mock("PUT", "/admin/ai-config", config)),
    getNetworkStatus: () => request("GET", "/admin/network").catch(() => mock("GET", "/admin/network")),

    // 歌手 / 专辑 / 文件夹
    getArtists: () => request("GET", "/artists").catch(() => mock("GET", "/artists")),
    getArtist: (id) => {
      const path = `/artists/${id}`;
      return request("GET", path).catch(() => mock("GET", path));
    },
    getAlbums: () => request("GET", "/albums").catch(() => mock("GET", "/albums")),
    getAlbum: (id) => {
      const path = `/albums/${id}`;
      return request("GET", path).catch(() => mock("GET", path));
    },
    getFolders: () => request("GET", "/folders").catch(() => mock("GET", "/folders")),
    getFolder: (path) => {
      const p = `/folders/${encodeURIComponent(path)}`;
      return request("GET", p).catch(() => mock("GET", p));
    },

    // 配置
    getBaseURL: () => BASE,
    setBaseURL: (url) => { /* 允许动态修改 */ },
  };
})();