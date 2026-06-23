const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, config } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  res.json({ ok: true });
});

router.get('/profile', auth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, role, email, avatar, created_at, last_login FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 收藏数
    const favCount = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?').get(req.user.id).count;

    // 歌单数
    const playlistCount = db.prepare('SELECT COUNT(*) as count FROM playlists WHERE owner_id = ?').get(req.user.id).count;

    // 总收听分钟数 (收藏歌曲的 play_count 总和)
    const listenRow = db.prepare(
      'SELECT COALESCE(SUM(t.play_count), 0) as total FROM favorites f JOIN tracks t ON f.track_id = t.id WHERE f.user_id = ?'
    ).get(req.user.id);
    const listenMinutes = listenRow.total;

    // 热门曲风 (从收藏歌曲的 genre 聚合)
    const genreRows = db.prepare(
      'SELECT t.genre, COUNT(*) as cnt FROM favorites f JOIN tracks t ON f.track_id = t.id WHERE f.user_id = ? GROUP BY t.genre ORDER BY cnt DESC'
    ).all(req.user.id);
    const totalGenreCnt = genreRows.reduce((sum, g) => sum + g.cnt, 0);
    const topGenres = genreRows.map(g => ({
      name: g.genre,
      pct: totalGenreCnt > 0 ? Math.round((g.cnt / totalGenreCnt) * 100) : 0
    }));

    res.json({
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        avatar: user.avatar || user.username.charAt(0).toUpperCase(),
        listen_minutes: listenMinutes,
        fav_count: favCount,
        playlists: playlistCount,
        top_genres: topGenres,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;