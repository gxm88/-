const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const multer = require('multer');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const tracksRoutes = require('./routes/tracks');
const playlistsRoutes = require('./routes/playlists');
const adminRoutes = require('./routes/admin');
const scannerRoutes = require('./routes/scanner');
const aiRoutes = require('./routes/ai');
const userRoutes = require('./routes/user');
const libraryRoutes = require('./routes/library');
const statsRoutes = require('./routes/stats');

const app = express();

app.use(cors());
app.use(express.json());

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, '..', 'music');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.wma', '.opus'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('不支持的音频格式: ' + ext));
  },
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

app.use('/music', express.static(path.resolve(__dirname, '..', 'music')));

app.use('/api', authRoutes);
app.use('/api/tracks', tracksRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', userRoutes);
app.use('/api', libraryRoutes);
app.use('/api/stats', statsRoutes);

// Upload route
app.post('/api/tracks/upload', upload.array('files', 20), (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: '请选择文件' });
    }

    const { db } = require('./db');
    const insertTrack = db.prepare(
      'INSERT INTO tracks (title, artist, album, genre, duration, path, play_count) VALUES (?, ?, ?, ?, ?, ?, 0)'
    );

    const results = [];
    for (const file of files) {
      const ext = path.extname(file.originalname);
      const title = path.basename(file.originalname, ext);
      const relativePath = `/music/${file.filename}`;

      const info = insertTrack.run(title, '未知歌手', '未知专辑', '其他', 180, relativePath);
      results.push({
        id: String(info.lastInsertRowid),
        title,
        path: relativePath,
        originalName: file.originalname,
        size: file.size,
      });
    }

    res.json({ data: results, total: results.length, message: `成功上传 ${files.length} 个文件` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.resolve(__dirname, '..')));

app.listen(config.PORT, () => {
  console.log(`MuseBox server running on http://localhost:${config.PORT}`);
});