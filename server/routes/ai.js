const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

router.use(auth);
router.use(admin);

function mapModel(m) {
  return {
    id: String(m.id),
    provider: m.provider,
    name: m.model_name,
    api_key: m.api_key ? m.api_key.substring(0, 6) + '...' : null,
    enabled: !!m.enabled,
    calls: m.calls_today || 0,
    description: m.description || '',
  };
}

// GET /ai/models
router.get('/models', (req, res) => {
  try {
    const models = db.prepare('SELECT * FROM ai_configs').all();
    res.json({ data: models.map(mapModel), total: models.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /ai/models
router.post('/models', (req, res) => {
  try {
    const { provider, model_name, api_key, enabled, description } = req.body;
    if (!provider || !model_name) {
      return res.status(400).json({ error: 'Provider and model_name are required' });
    }

    const result = db.prepare(
      'INSERT INTO ai_configs (provider, model_name, api_key, enabled, description) VALUES (?, ?, ?, ?, ?)'
    ).run(provider, model_name, api_key || null, enabled !== undefined ? (enabled ? 1 : 0) : 1, description || null);

    const model = db.prepare('SELECT * FROM ai_configs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: mapModel(model) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /ai/models/:id
router.put('/models/:id', (req, res) => {
  try {
    const { id } = req.params;
    const model = db.prepare('SELECT * FROM ai_configs WHERE id = ?').get(id);
    if (!model) {
      return res.status(404).json({ error: 'AI model not found' });
    }

    const { enabled, api_key, provider, model_name, description } = req.body;

    if (enabled !== undefined) {
      db.prepare('UPDATE ai_configs SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
    }
    if (api_key !== undefined) {
      db.prepare('UPDATE ai_configs SET api_key = ? WHERE id = ?').run(api_key, id);
    }
    if (provider) {
      db.prepare('UPDATE ai_configs SET provider = ? WHERE id = ?').run(provider, id);
    }
    if (model_name) {
      db.prepare('UPDATE ai_configs SET model_name = ? WHERE id = ?').run(model_name, id);
    }
    if (description !== undefined) {
      db.prepare('UPDATE ai_configs SET description = ? WHERE id = ?').run(description, id);
    }

    const updated = db.prepare('SELECT * FROM ai_configs WHERE id = ?').get(id);
    res.json({ data: mapModel(updated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /ai/models/:id
router.delete('/models/:id', (req, res) => {
  try {
    const { id } = req.params;
    const model = db.prepare('SELECT * FROM ai_configs WHERE id = ?').get(id);
    if (!model) {
      return res.status(404).json({ error: 'AI model not found' });
    }
    db.prepare('DELETE FROM ai_configs WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /ai/strategy
router.get('/strategy', (req, res) => {
  try {
    const keys = ['rec_count', 'cold_start', 'weight_play', 'weight_fav', 'weight_skip', 'refresh_time', 'crawler_netease', 'crawler_spotify', 'crawler_apple'];
    const rows = db.prepare('SELECT key, value FROM system_config WHERE key IN (' + keys.map(() => '?').join(',') + ')').all(...keys);
    const strategy = {};
    for (const row of rows) {
      strategy[row.key] = row.value;
    }
    res.json({ data: strategy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /ai/strategy
router.put('/strategy', (req, res) => {
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

module.exports = router;