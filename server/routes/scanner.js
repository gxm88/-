const express = require('express');
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

router.use(auth);
router.use(admin);

// GET /scanner/folders
router.get('/folders', (req, res) => {
  try {
    const musicDir = path.resolve(__dirname, '..', '..', 'music');
    const folders = db.prepare('SELECT * FROM folders').all();
    
    let musicDirInfo = null;
    if (fs.existsSync(musicDir)) {
      const files = fs.readdirSync(musicDir).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.wma', '.opus'].includes(ext);
      });
      const trackCount = db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;
      musicDirInfo = {
        path: '/music',
        file_count: files.length,
        db_track_count: trackCount,
      };
    }

    res.json({ data: folders, total: folders.length, music_dir: musicDirInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /scanner/folders
router.post('/folders', (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Folder path is required' });
    }

    const existing = db.prepare('SELECT * FROM folders WHERE path = ?').get(path);
    if (existing) {
      return res.status(400).json({ error: 'Folder already exists' });
    }

    const result = db.prepare('INSERT INTO folders (path, track_count) VALUES (?, 0)').run(path);
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /scanner/folders/:id
router.delete('/folders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    db.prepare('DELETE FROM folders WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /scanner/scan
router.post('/scan', (req, res) => {
  try {
    const musicDir = path.resolve(__dirname, '..', '..', 'music');
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir, { recursive: true });
    }

    const files = fs.readdirSync(musicDir).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.wma', '.opus'].includes(ext);
    });

    const existing = db.prepare('SELECT path FROM tracks').all().map(r => r.path);
    
    const insertTrack = db.prepare(
      'INSERT INTO tracks (title, artist, album, genre, duration, path, play_count) VALUES (?, ?, ?, ?, ?, ?, 0)'
    );

    let added = 0;
    let skipped = 0;

    for (const file of files) {
      const fullPath = `/music/${file}`;
      if (existing.includes(fullPath)) {
        skipped++;
        continue;
      }

      const ext = path.extname(file);
      const name = path.basename(file, ext);
      // Try to parse "artist - title" or "title" format
      let title = name;
      let artist = '未知歌手';
      if (name.includes(' - ')) {
        const parts = name.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }
      
      insertTrack.run(title, artist, '未知专辑', '其他', 180, fullPath);
      added++;
    }

    res.json({
      data: { added, skipped, total: files.length },
      message: `扫描完成: 新增 ${added} 首, 跳过 ${skipped} 首 (已存在)`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /scanner/metadata
router.get('/metadata', (req, res) => {
  try {
    res.json({ data: {
      complete: 85,
      needs_repair: 12,
      missing_cover: 3,
    }});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /scanner/metadata/repair
router.post('/metadata/repair', (req, res) => {
  res.json({ ok: true });
});

// GET /scanner/duplicates
router.get('/duplicates', (req, res) => {
  try {
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /scanner/duplicates/cleanup
router.post('/duplicates/cleanup', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;