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
}

initTables();
seedData();

module.exports = {
  db,
  config,
};