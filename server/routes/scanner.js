const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

router.use(auth);
router.use(admin);

// GET /scanner/folders
router.get('/folders', (req, res) => {
  try {
    const folders = db.prepare('SELECT * FROM folders').all();
    res.json({ data: folders, total: folders.length });
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

// POST /scanner/scan/:folderId
router.post('/scan/:folderId', (req, res) => {
  try {
    const { folderId } = req.params;
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Simulate scan: random track count between 10 and 100
    const trackCount = Math.floor(Math.random() * 91) + 10;

    db.prepare('UPDATE folders SET track_count = ?, last_scan = datetime(?), status = ? WHERE id = ?')
      .run(trackCount, 'now', 'active', folderId);

    db.prepare('INSERT INTO scan_logs (folder_id, type, message) VALUES (?, ?, ?)')
      .run(folderId, 'info', `Scan started for ${folder.path}`);
    db.prepare('INSERT INTO scan_logs (folder_id, type, message) VALUES (?, ?, ?)')
      .run(folderId, 'info', `Found ${trackCount} audio files`);
    db.prepare('INSERT INTO scan_logs (folder_id, type, message) VALUES (?, ?, ?)')
      .run(folderId, 'success', `Successfully scanned ${trackCount} tracks`);

    const updated = db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId);
    res.json(updated);
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