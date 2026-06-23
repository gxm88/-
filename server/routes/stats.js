const express = require('express');
const { db } = require('../db');
const os = require('os');
const router = express.Router();

// GET /stats - dashboard statistics
router.get('/', (req, res) => {
  try {
    const totalTracks = db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    
    // 24h play count
    const totalPlays24h = db.prepare(
      "SELECT COUNT(*) as count FROM play_history WHERE played_at >= datetime('now', '-1 day')"
    ).get().count;
    
    // AI calls today (sum of all ai_configs.calls_today)
    const aiCallsToday = db.prepare(
      'SELECT COALESCE(SUM(calls_today), 0) as total FROM ai_configs'
    ).get().total;
    
    // Storage
    const totalSize = totalTracks > 0 
      ? db.prepare("SELECT COALESCE(SUM(duration), 0) as total FROM tracks").get().total
      : 0;
    const storageUsed = (totalSize * 128 * 1024 / 8).toFixed(1); // rough estimate
    const storageTotal = '10.0 GB';
    
    // System
    const cpuLoad = (os.loadavg()[0] / os.cpus().length * 100).toFixed(0) + '%';
    const memLoad = ((1 - os.freemem() / os.totalmem()) * 100).toFixed(0) + '%';
    const tcpConnections = 0; // placeholder

    res.json({
      data: {
        total_tracks: totalTracks,
        total_users: totalUsers,
        total_plays_24h: totalPlays24h,
        ai_calls_today: aiCallsToday,
        storage_used: storageUsed + ' MB',
        storage_total: storageTotal,
        cpu_load: cpuLoad,
        mem_load: memLoad,
        tcp_connections: tcpConnections,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;