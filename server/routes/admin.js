const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

router.use(auth);
router.use(admin);

// GET /admin/stats
router.get('/stats', (req, res) => {
  try {
    const total_tracks = db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;
    const total_users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const total_plays_24h = db.prepare(
      "SELECT COUNT(*) as count FROM play_history WHERE played_at >= datetime('now', '-1 day')"
    ).get().count;
    const ai_calls_today = db.prepare(
      'SELECT COALESCE(SUM(calls_today), 0) as total FROM ai_configs'
    ).get().total;
    const storage_used = 2147483648; // 2 GB simulated
    const storage_total = 10737418240; // 10 GB simulated
    const cpu_load = 0.35;
    const mem_load = 0.62;
    const tcp_connections = 12;

    res.json({ data: {
      total_tracks,
      total_users,
      total_plays_24h,
      ai_calls_today,
      storage_used,
      storage_total,
      cpu_load,
      mem_load,
      tcp_connections,
    }});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, role, email, avatar, created_at, last_login FROM users').all();
    res.json({ data: users, total: users.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/users
router.post('/users', (req, res) => {
  try {
    const { username, password, role, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, role, email) VALUES (?, ?, ?, ?)'
    ).run(username, hash, role || 'user', email || null);

    res.status(201).json({ id: result.lastInsertRowid, username, role: role || 'user', email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/users/:id
router.put('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { role, email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
    }
    if (role) {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    }
    if (email !== undefined) {
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, id);
    }

    const updated = db.prepare('SELECT id, username, role, email, avatar, created_at, last_login FROM users WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/users/:id
router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/playlists
router.get('/playlists', (req, res) => {
  try {
    const playlists = db.prepare('SELECT * FROM playlists').all();
    res.json({ data: playlists, total: playlists.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/playlists
router.post('/playlists', (req, res) => {
  try {
    const { name, type, tracks, cover, duration } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }
    const result = db.prepare(
      'INSERT INTO playlists (name, type, tracks, cover, duration) VALUES (?, ?, ?, ?, ?)'
    ).run(name, type || 'user', JSON.stringify(tracks || []), cover || null, duration || null);
    res.status(201).json({ id: result.lastInsertRowid, name, type: type || 'user' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/playlists/:id
router.put('/playlists/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, tracks, cover, duration } = req.body;

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (name) {
      db.prepare('UPDATE playlists SET name = ? WHERE id = ?').run(name, id);
    }
    if (type) {
      db.prepare('UPDATE playlists SET type = ? WHERE id = ?').run(type, id);
    }
    if (tracks) {
      db.prepare('UPDATE playlists SET tracks = ? WHERE id = ?').run(JSON.stringify(tracks), id);
    }
    if (cover !== undefined) {
      db.prepare('UPDATE playlists SET cover = ? WHERE id = ?').run(cover, id);
    }
    if (duration !== undefined) {
      db.prepare('UPDATE playlists SET duration = ? WHERE id = ?').run(duration, id);
    }

    const updated = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/playlists/:id
router.delete('/playlists/:id', (req, res) => {
  try {
    const { id } = req.params;
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/site-config
router.get('/site-config', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM system_config').all();
    const config = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    res.json({ data: config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/site-config
router.put('/site-config', (req, res) => {
  try {
    const updates = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, datetime('now'))");
    const updateMany = db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        stmt.run(key, String(value));
      }
    });
    updateMany();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/logs
router.get('/logs', (req, res) => {
  try {
    const scanLogs = db.prepare('SELECT * FROM scan_logs ORDER BY created_at DESC LIMIT 50').all();
    const playHistory = db.prepare(
      'SELECT ph.*, t.title as track_title FROM play_history ph LEFT JOIN tracks t ON ph.track_id = t.id ORDER BY ph.played_at DESC LIMIT 50'
    ).all();
    res.json({ data: { scan_logs: scanLogs, play_history: playHistory } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/backup
router.post('/backup', (req, res) => {
  try {
    const filename = `musebox-backup-${Date.now()}.db`;
    const size = 1024 * 1024 * 5; // 5 MB simulated
    db.prepare('INSERT INTO backups (filename, size) VALUES (?, ?)').run(filename, size);
    const backup = db.prepare('SELECT * FROM backups WHERE filename = ?').get(filename);
    res.status(201).json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/backups
router.get('/backups', (req, res) => {
  try {
    const backups = db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all();
    res.json({ data: backups, total: backups.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/backup/restore
router.post('/backup/restore', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;