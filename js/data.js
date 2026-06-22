/* ============================================================
   Mock 数据：曲库 / 歌手 / 专辑 / 歌单 / AI 推荐 / 用户 / 播放历史
   所有前端展示功能都依赖该模块（后台配置驱动）
   ============================================================ */

// 颜色池：给每张封面一个独特色调（完全无外部图片依赖）
const COLORS = [
  ["#9f7aea", "#3f2a6a"], ["#f78ca0", "#7d3a4d"], ["#6ec3f4", "#1d4b70"],
  ["#8bd17c", "#2c5a2a"], ["#f9a857", "#6a3a12"], ["#f16a70", "#6b2528"],
  ["#8a8ff5", "#2e3471"], ["#e8b9ff", "#5c3a72"], ["#4ec9c0", "#1a5c58"],
  ["#d39f6a", "#5a3a1c"], ["#b58bff", "#3a246a"], ["#f87171", "#6a2828"],
  ["#60a5fa", "#1e3a8a"], ["#fbbf24", "#7a5a10"], ["#34d399", "#065f46"],
  ["#c084fc", "#581c87"], ["#fb7185", "#881337"], ["#22d3ee", "#155e75"],
  ["#a3e635", "#4d7c0f"], ["#facc15", "#854d0e"], ["#e879f9", "#701a75"],
  ["#38bdf8", "#075985"], ["#f472b6", "#9d174d"], ["#84cc16", "#422006"],
];
const colorOf = (i) => COLORS[Math.abs(i) % COLORS.length];

// --- 歌曲 ---
const TRACKS = [
  { id: "t01", title: "Starlit Drive",     artist: "Aurora Lane",  album: "Neon Moon",   genre: "电子 / Synthwave", style: "Indie",  dur: 218, year: 2024,
    lyrics: "♪ 霓虹在车窗上流淌\n♪ 高速公路穿过城市的梦\n♪ 星光指引着方向\n♪ 在无尽的夜色中巡航\n♪ 引擎低吟着八十年代的旋律\n♪ 我们的速度超越了时间\n♪ 每一次加速都是一次心跳\n♪ 在星光照耀的公路上飞驰" },
  { id: "t02", title: "Midnight Library",  artist: "Paper Kite",   album: "Neon Moon",   genre: "独立民谣",        style: "Chill",  dur: 192, year: 2024,
    lyrics: "♪ 午夜的图书馆灯光昏黄\n♪ 纸页在指尖轻轻翻动\n♪ 每一本书都是一个世界\n♪ 在寂静中我听见自己的呼吸\n♪ 窗外的月光洒在书架上\n♪ 故事里的角色在轻声交谈\n♪ 我在这片文字的海洋里\n♪ 找到了属于我的秘密角落" },
  { id: "t03", title: "Ocean of Trees",    artist: "Hollow Pine",  album: "Ocean of Trees", genre: "氛围 / Post-rock", style: "Atmos", dur: 342, year: 2023 },
  { id: "t04", title: "Blue Highway",      artist: "Aurora Lane",  album: "Neon Moon",   genre: "电子 / Dream-pop", style: "Dream", dur: 231, year: 2024 },
  { id: "t05", title: "Honey & Smoke",     artist: "Ember Fells",  album: "Rust & Gold",  genre: "乡村摇滚",        style: "Warm",  dur: 208, year: 2022 },
  { id: "t06", title: "Paper Moon Rising", artist: "Paper Kite",   album: "Paper Moon",  genre: "独立民谣",        style: "Soft",  dur: 178, year: 2021 },
  { id: "t07", title: "Neon Cathedral",    artist: "Aurora Lane",  album: "Neon Moon",   genre: "电子 / Synthwave", style: "Synth", dur: 245, year: 2024 },
  { id: "t08", title: "Lost in the Garden",artist: "Hollow Pine",  album: "Ocean of Trees", genre: "氛围",          style: "Chill", dur: 298, year: 2023 },
  { id: "t09", title: "Golden Afternoons", artist: "Ember Fells",  album: "Rust & Gold",  genre: "乡村摇滚",        style: "Warm",  dur: 223, year: 2022 },
  { id: "t10", title: "Velvet Hours",      artist: "Cinder Row",   album: "Velvet Hours", genre: "爵士 / Lounge",  style: "Jazz",  dur: 276, year: 2020,
    lyrics: "♪ 天鹅绒般的时光缓缓流淌\n♪ 萨克斯在角落轻声吟唱\n♪ 酒杯里的冰块轻轻碰撞\n♪ 这个夜晚属于慵懒的爵士\n♪ 灯光昏黄如旧照片\n♪ 时间在这里放慢了脚步\n♪ 每一个音符都是温柔的拥抱\n♪ 在天鹅绒的时光里沉醉" },
  { id: "t11", title: "Silent Compass",    artist: "Cinder Row",   album: "Velvet Hours", genre: "爵士 / Slow",     style: "Late",  dur: 312, year: 2020 },
  { id: "t12", title: "Slow Letters",      artist: "Cinder Row",   album: "Velvet Hours", genre: "爵士",           style: "Late",  dur: 288, year: 2020 },
  { id: "t13", title: "Violet Room",       artist: "Marble Field", album: "Violet Room",  genre: "Dream Pop",       style: "Dream", dur: 234, year: 2019 },
  { id: "t14", title: "Winter Arcade",     artist: "Marble Field", album: "Violet Room",  genre: "Dream Pop",       style: "Cold",  dur: 211, year: 2019 },
  { id: "t15", title: "Summon the Rain",   artist: "Iron Orchid",  album: "Heavy Weather", genre: "Post-Hardcore",  style: "Heavy", dur: 264, year: 2018 },
  { id: "t16", title: "After the Storm",   artist: "Iron Orchid",  album: "Heavy Weather", genre: "Post-Hardcore",  style: "Heavy", dur: 297, year: 2018 },
  { id: "t17", title: "Soft Engine",       artist: "The Lowlights",album: "Soft Engine",  genre: "Indie Rock",      style: "Indie", dur: 212, year: 2021 },
  { id: "t18", title: "Ghost Passenger",   artist: "The Lowlights",album: "Soft Engine",  genre: "Indie Rock",      style: "Indie", dur: 237, year: 2021 },
  { id: "t19", title: "Lighthouse Keeper", artist: "The Lowlights",album: "Soft Engine",  genre: "Indie Rock",      style: "Calm", dur: 244, year: 2021 },
  { id: "t20", title: "Saffron Skies",     artist: "Ember Fells",  album: "Rust & Gold",  genre: "乡村摇滚",        style: "Warm",  dur: 206, year: 2022 },
  { id: "t21", title: "Slow Train North",  artist: "Ember Fells",  album: "Rust & Gold",  genre: "乡村摇滚",        style: "Slow",  dur: 289, year: 2022 },
  { id: "t22", title: "Dandelion Wish",    artist: "Paper Kite",   album: "Paper Moon",  genre: "独立民谣",        style: "Soft",  dur: 187, year: 2021 },
  { id: "t23", title: "Cloudline",         artist: "Hollow Pine",  album: "Ocean of Trees", genre: "氛围",         style: "Atmos", dur: 324, year: 2023 },
  { id: "t24", title: "Cathedral of Pines",artist: "Hollow Pine",  album: "Ocean of Trees", genre: "Post-rock",     style: "Atmos", dur: 398, year: 2023 },
  { id: "t25", title: "Echoes of You",     artist: "Aurora Lane",  album: "Neon Moon",   genre: "电子 / Dream-pop", style: "Dream", dur: 226, year: 2024 },
  { id: "t26", title: "Rust",              artist: "Ember Fells",  album: "Rust & Gold",  genre: "乡村摇滚",        style: "Warm",  dur: 245, year: 2022 },
  { id: "t27", title: "Marble",            artist: "Marble Field", album: "Violet Room",  genre: "Dream Pop",       style: "Dream", dur: 219, year: 2019 },
  { id: "t28", title: "Stormlight",        artist: "Iron Orchid",  album: "Heavy Weather", genre: "Post-Hardcore",  style: "Heavy", dur: 281, year: 2018 },
  { id: "t29", title: "Lanterns",          artist: "Paper Kite",   album: "Paper Moon",  genre: "独立民谣",        style: "Soft",  dur: 201, year: 2021 },
  { id: "t30", title: "Nightjar",          artist: "Cinder Row",   album: "Velvet Hours", genre: "爵士 / Slow",     style: "Late",  dur: 302, year: 2020 },
];

// --- 歌手 ---
const ARTISTS = [
  { id: "a01", name: "Aurora Lane",   tag: "电子 / Dream-pop",  listeners: "128k" },
  { id: "a02", name: "Paper Kite",    tag: "独立民谣",           listeners: "56k" },
  { id: "a03", name: "Hollow Pine",   tag: "氛围 / Post-rock",   listeners: "32k" },
  { id: "a04", name: "Ember Fells",   tag: "乡村摇滚",           listeners: "44k" },
  { id: "a05", name: "Cinder Row",    tag: "爵士 / Lounge",      listeners: "28k" },
  { id: "a06", name: "Marble Field",  tag: "Dream Pop",          listeners: "22k" },
  { id: "a07", name: "Iron Orchid",   tag: "Post-Hardcore",      listeners: "39k" },
  { id: "a08", name: "The Lowlights", tag: "Indie Rock",         listeners: "71k" },
  { id: "a09", name: "Blue Lantern",  tag: "City Pop",           listeners: "18k" },
  { id: "a10", name: "Silver Coast",  tag: "Shoegaze",           listeners: "15k" },
];

// --- 专辑 ---
const ALBUMS = [
  { id: "al01", title: "Neon Moon",        artist: "Aurora Lane",   year: 2024, tracks: 11 },
  { id: "al02", title: "Paper Moon",       artist: "Paper Kite",    year: 2021, tracks: 9 },
  { id: "al03", title: "Ocean of Trees",   artist: "Hollow Pine",   year: 2023, tracks: 7 },
  { id: "al04", title: "Rust & Gold",      artist: "Ember Fells",   year: 2022, tracks: 10 },
  { id: "al05", title: "Velvet Hours",     artist: "Cinder Row",    year: 2020, tracks: 12 },
  { id: "al06", title: "Violet Room",      artist: "Marble Field",  year: 2019, tracks: 8 },
  { id: "al07", title: "Heavy Weather",    artist: "Iron Orchid",   year: 2018, tracks: 11 },
  { id: "al08", title: "Soft Engine",      artist: "The Lowlights", year: 2021, tracks: 10 },
];

// --- 歌单 ---
const PLAYLISTS = [
  { id: "p01", title: "深夜地铁 · 通勤电子",       desc: "柔和的 synthwave 与 dream-pop 搭配。", tracks: 14, duration: "56 分钟", type: "user" },
  { id: "p02", title: "咖啡香 · 清晨民谣",          desc: "适合安静的早晨。",                    tracks: 12, duration: "48 分钟", type: "user" },
  { id: "p03", title: "雨天的 Post-rock",          desc: "长段、重氛围、无词的雨日配乐。",        tracks: 8,  duration: "1h 42m",  type: "user" },
  { id: "p04", title: "每日 AI 推荐 · 6月21日",     desc: "基于你的听歌画像自动生成，每日更新。",  tracks: 10, duration: "42 分钟", type: "ai" },
  { id: "p05", title: "AI · 沉浸式工作流",          desc: "低干扰，高专注度。",                   tracks: 12, duration: "50 分钟", type: "ai" },
  { id: "p06", title: "AI · 适合周五夜晚的微醺摇滚", desc: "情绪识别 · 微醺 / 放松",              tracks: 11, duration: "45 分钟", type: "ai" },
  { id: "p07", title: "官方 · 本周新上架",          desc: "编辑精选本地曲库更新。",               tracks: 18, duration: "1h 12m", type: "official" },
  { id: "p08", title: "官方 · 深夜爵士合集",         desc: "慢爵士与 lounge。",                   tracks: 14, duration: "1h 04m", type: "official" },
  { id: "p09", title: "我的收藏 · 精选",             desc: "按心情收藏的单曲。",                   tracks: 22, duration: "1h 30m", type: "user" },
];

// --- 全站热榜（含 本地有无 标记） ---
const CHARTS = [
  { rank: 1, title: "Starlit Drive",     artist: "Aurora Lane",   streams: "18.2M", local: true },
  { rank: 2, title: "Velvet Hours",      artist: "Cinder Row",    streams: "12.4M", local: true },
  { rank: 3, title: "Ocean of Trees",    artist: "Hollow Pine",   streams: "10.1M", local: true },
  { rank: 4, title: "Honey & Smoke",     artist: "Ember Fells",   streams: "9.6M",  local: true },
  { rank: 5, title: "Midnight Library",  artist: "Paper Kite",    streams: "8.8M",  local: true },
  { rank: 6, title: "Winter Arcade",     artist: "Marble Field",  streams: "7.2M",  local: true },
  { rank: 7, title: "After the Storm",   artist: "Iron Orchid",   streams: "6.9M",  local: true },
  { rank: 8, title: "Neon Cathedral",    artist: "Aurora Lane",   streams: "6.4M",  local: true },
  { rank: 9, title: "Dandelion Wish",    artist: "Paper Kite",    streams: "5.8M",  local: true },
  { rank: 10, title: "Summon the Rain",  artist: "Iron Orchid",   streams: "5.1M",  local: true },
  { rank: 11, title: "Lighthouse Keeper",artist: "The Lowlights", streams: "4.8M",  local: false },
  { rank: 12, title: "Cathedral of Pines",artist: "Hollow Pine",  streams: "4.4M",  local: false },
  { rank: 13, title: "Nightjar",         artist: "Cinder Row",    streams: "3.9M",  local: false },
  { rank: 14, title: "Silent Compass",   artist: "Cinder Row",    streams: "3.6M",  local: false },
  { rank: 15, title: "Cloudline",        artist: "Hollow Pine",   streams: "3.1M",  local: false },
  { rank: 16, title: "Stormlight",       artist: "Iron Orchid",   streams: "2.8M",  local: false },
  { rank: 17, title: "Rust",             artist: "Ember Fells",   streams: "2.5M",  local: false },
  { rank: 18, title: "Blue Highway",     artist: "Aurora Lane",   streams: "2.3M",  local: false },
];

// --- Banners ---
const BANNERS = [
  { tag: "AI 每日精选", isAI: true, title: "今日 · 你的 10 首专属推荐", sub: "基于你的最近 14 天听歌画像，由 AI 重新为你挑选。", c1: "#6b5ed6", c2: "#1b1535" },
  { tag: "新专辑",       isAI: false, title: "Neon Moon · Aurora Lane", sub: "2024 年度最受期待的 dream-pop 新专，已同步到你的曲库。", c1: "#4a3fa8", c2: "#0f0a25" },
  { tag: "专题",         isAI: false, title: "下雨的下午 · 慢爵士合集", sub: "精选 14 首慢爵士，配雨声与咖啡，适合专注阅读。", c1: "#3a5a7a", c2: "#0a121f" },
];

// --- 文件夹视图（映射宿主机目录结构） ---
const FOLDERS = [
  { name: "Lofi & Chill",    count: 124, path: "/music/Lofi and Chill" },
  { name: "Synthwave",       count: 88,  path: "/music/Synthwave" },
  { name: "Jazz / Lounge",   count: 61,  path: "/music/Jazz" },
  { name: "Post-rock",       count: 44,  path: "/music/Post-rock" },
  { name: "Indie Folk",      count: 73,  path: "/music/Indie Folk" },
  { name: "Country Rock",    count: 39,  path: "/music/Country Rock" },
  { name: "Dream Pop",       count: 52,  path: "/music/Dream Pop" },
  { name: "Post-Hardcore",   count: 28,  path: "/music/Post-Hardcore" },
];

// --- AI 推荐用的 用户画像数据 ---
const USER_PROFILE = {
  listen_minutes: 3284,
  fav_count: 182,
  playlists: 8,
  top_genres: [
    { name: "Dream-pop",  pct: 28 },
    { name: "独立民谣",   pct: 22 },
    { name: "慢爵士",     pct: 16 },
    { name: "Synthwave",  pct: 14 },
    { name: "Post-rock",  pct: 12 },
    { name: "乡村摇滚",   pct: 8 },
  ],
  listening_7d: [42, 68, 55, 91, 74, 102, 88], // 分钟
};

// --- 管理员仪表盘统计 ---
const ADMIN_STATS = {
  total_tracks: 1284,
  total_artists: 287,
  total_albums: 312,
  total_users: 24,
  total_plays_24h: 1842,
  storage_used: "48.6 GB",
  storage_total: "500 GB",
  cpu_load: "32%",
  mem_load: "48%",
  ai_calls_today: 214,
  ai_models: 3,
  tcp_connections: 7,
};

// --- 工具 ---
function fmtDur(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function pickN(arr, n, offset = 0) {
  const r = [];
  for (let i = 0; i < n; i++) r.push(arr[(offset + i) % arr.length]);
  return r;
}
function trackById(id) {
  return TRACKS.find(t => t.id === id);
}
