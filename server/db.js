const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const config = require('./config');

const dbPath = path.resolve(__dirname, config.DB_PATH);
const fs = require('fs');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      email TEXT,
      avatar TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT,
      title TEXT NOT NULL,
      artist TEXT,
      album TEXT,
      genre TEXT,
      duration INTEGER,
      cover_path TEXT,
      lyrics TEXT,
      play_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'user',
      owner_id INTEGER,
      tracks TEXT DEFAULT '[]',
      cover TEXT,
      duration TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      track_count INTEGER DEFAULT 0,
      last_scan TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS scan_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER,
      type TEXT,
      message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT,
      model_name TEXT,
      api_key TEXT,
      enabled INTEGER DEFAULT 1,
      calls_today INTEGER DEFAULT 0,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      size INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER,
      track_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY(user_id, track_id)
    );

    CREATE TABLE IF NOT EXISTS play_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      track_id INTEGER,
      played_at TEXT DEFAULT (datetime('now')),
      progress REAL DEFAULT 0
    );
  `);
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) return;

  const salt = bcrypt.genSaltSync(10);

  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, role, email, avatar) VALUES (?, ?, ?, ?, ?)'
  );
  insertUser.run('admin', bcrypt.hashSync('admin', salt), 'admin', 'admin@musebox.com', null);
  insertUser.run('user', bcrypt.hashSync('user', salt), 'user', 'user@musebox.com', null);
  insertUser.run('guest', bcrypt.hashSync('guest', salt), 'guest', 'guest@musebox.com', null);

  const insertTrack = db.prepare(
    'INSERT INTO tracks (title, artist, album, genre, duration, play_count, cover_path, lyrics, path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const tracks = [
    { title: 'Night Drive', artist: 'Synthwave Master', album: 'Midnight Collection', genre: 'Synthwave', duration: 245, play_count: 1200, cover_path: '/covers/night-drive.jpg', lyrics: 'Driving through the neon night...', path: '/music/Synthwave/night-drive.mp3' },
    { title: 'Digital Dreams', artist: 'Cyberpunk Artist', album: 'Neon Future', genre: 'Electronic', duration: 198, play_count: 890, cover_path: '/covers/digital-dreams.jpg', lyrics: 'In a world of digital streams...', path: '/music/Electronic/digital-dreams.mp3' },
    { title: 'Morning Coffee', artist: 'Jazz Ensemble', album: 'Smooth Mornings', genre: 'Jazz', duration: 312, play_count: 650, cover_path: '/covers/morning-coffee.jpg', lyrics: 'Waking up to the sound of jazz...', path: '/music/Jazz/morning-coffee.mp3' },
    { title: 'Summer Vibes', artist: 'Beach Collective', album: 'Endless Summer', genre: 'Pop', duration: 267, play_count: 2100, cover_path: '/covers/summer-vibes.jpg', lyrics: 'Sun is shining, waves are crashing...', path: '/music/Pop/summer-vibes.mp3' },
    { title: 'Rainy Day', artist: 'Lo-Fi Girl', album: 'Chill Beats', genre: 'Lo-Fi', duration: 178, play_count: 3400, cover_path: '/covers/rainy-day.jpg', lyrics: 'Raindrops on the window pane...', path: '/music/Lo-Fi/rainy-day.mp3' },
    { title: 'Electric Pulse', artist: 'Bass Drop', album: 'Club Nights', genre: 'EDM', duration: 223, play_count: 780, cover_path: '/covers/electric-pulse.jpg', lyrics: 'Feel the bass drop through your veins...', path: '/music/EDM/electric-pulse.mp3' },
    { title: 'Acoustic Sunset', artist: 'Folk Trio', album: 'Campfire Stories', genre: 'Folk', duration: 290, play_count: 450, cover_path: '/covers/acoustic-sunset.jpg', lyrics: 'Golden hour by the river side...', path: '/music/Folk/acoustic-sunset.mp3' },
    { title: 'Urban Groove', artist: 'Hip Hop Collective', album: 'Street Poetry', genre: 'Hip Hop', duration: 256, play_count: 1500, cover_path: '/covers/urban-groove.jpg', lyrics: 'Walking through the city streets...', path: '/music/Hip-Hop/urban-groove.mp3' },
    { title: 'Orchestral Dawn', artist: 'Classical Ensemble', album: 'Symphony Vol.1', genre: 'Classical', duration: 420, play_count: 320, cover_path: '/covers/orchestral-dawn.jpg', lyrics: null, path: '/music/Classical/orchestral-dawn.mp3' },
    { title: 'Midnight Blues', artist: 'Blues Band', album: 'Dark Hours', genre: 'Blues', duration: 334, play_count: 560, cover_path: '/covers/midnight-blues.jpg', lyrics: 'The clock strikes twelve and I feel blue...', path: '/music/Blues/midnight-blues.mp3' },
  ];

  const insertMany = db.transaction(() => {
    for (const t of tracks) {
      insertTrack.run(t.title, t.artist, t.album, t.genre, t.duration, t.play_count, t.cover_path, t.lyrics, t.path);
    }
  });
  insertMany();

  const insertPlaylist = db.prepare(
    "INSERT INTO playlists (name, type, owner_id, tracks, cover, duration) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const playlists = [
    { name: 'Favorites', type: 'user', owner_id: 1, tracks: '[1,2,3,5,7]', cover: '/covers/favorites.jpg', duration: '24:15' },
    { name: 'Workout Mix', type: 'user', owner_id: 1, tracks: '[2,6,8]', cover: '/covers/workout.jpg', duration: '11:17' },
    { name: 'Chill Evening', type: 'user', owner_id: 2, tracks: '[3,5,10]', cover: '/covers/chill.jpg', duration: '13:44' },
    { name: 'Road Trip', type: 'user', owner_id: 2, tracks: '[1,4,7]', cover: '/covers/roadtrip.jpg', duration: '13:22' },
    { name: 'Top Hits 2024', type: 'system', owner_id: null, tracks: '[1,4,6,8]', cover: '/covers/tophits.jpg', duration: '16:31' },
    { name: 'Jazz Collection', type: 'system', owner_id: null, tracks: '[3]', cover: '/covers/jazz.jpg', duration: '5:12' },
    { name: 'Electronic Beats', type: 'system', owner_id: null, tracks: '[2,6]', cover: '/covers/electronic.jpg', duration: '7:01' },
    { name: 'Guest Picks', type: 'user', owner_id: 3, tracks: '[5,9,10]', cover: '/covers/guest.jpg', duration: '15:32' },
  ];

  const insertPlaylists = db.transaction(() => {
    for (const p of playlists) {
      insertPlaylist.run(p.name, p.type, p.owner_id, p.tracks, p.cover, p.duration);
    }
  });
  insertPlaylists();

  const insertFolder = db.prepare(
    'INSERT INTO folders (path, track_count) VALUES (?, ?)'
  );
  insertFolder.run('/music/Synthwave', 88);
  insertFolder.run('/music/Jazz', 52);
  insertFolder.run('/music/Electronic', 34);

  const insertAIConfig = db.prepare(
    'INSERT INTO ai_configs (provider, model_name, enabled, calls_today, description) VALUES (?, ?, ?, ?, ?)'
  );
  insertAIConfig.run('DeepSeek', 'Music LLM', 1, 42, 'DeepSeek Music recommendation LLM');
  insertAIConfig.run('FastRec', 'local', 1, 156, 'FastRec local recommendation engine');
  insertAIConfig.run('Qwen', 'emotion', 0, 0, 'Qwen emotion-based recommendation');

  const insertConfig = db.prepare(
    'INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)'
  );

  const systemConfigs = {
    'site_name': 'MuseBox',
    'logo': '/assets/logo.svg',
    'public_url': 'http://localhost:3000',
    'copyright': '© 2024 MuseBox Music Player',
    'tcp_port': '9090',
    'tcp_heartbeat': '30',
    'max_connections': '100',
    'https_force': 'false',
    'ip_whitelist': '',
    'rate_limit': '100',
    'open_registration': 'true',
    'invite_only': 'false',
    'auto_ai_recommend': 'true',
    'rec_count': '20',
    'cold_start': 'popular',
    'weight_play': '0.5',
    'weight_fav': '0.3',
    'weight_skip': '0.2',
    'refresh_time': '3600',
    'crawler_netease': 'false',
    'crawler_spotify': 'false',
    'crawler_apple': 'false',
  };

  const insertConfigs = db.transaction(() => {
    for (const [key, value] of Object.entries(systemConfigs)) {
      insertConfig.run(key, value);
    }
  });
  insertConfigs();

  const insertScanLog = db.prepare(
    'INSERT INTO scan_logs (folder_id, type, message) VALUES (?, ?, ?)'
  );
  insertScanLog.run(1, 'info', 'Scan started for /music/Synthwave');
  insertScanLog.run(1, 'info', 'Found 88 audio files in /music/Synthwave');
  insertScanLog.run(1, 'success', 'Successfully scanned 88 tracks');
  insertScanLog.run(1, 'warning', '3 files missing cover art');
}

initTables();
seedData();

module.exports = {
  db,
  config,
};