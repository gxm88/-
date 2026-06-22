const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const authRoutes = require('./routes/auth');
const tracksRoutes = require('./routes/tracks');
const playlistsRoutes = require('./routes/playlists');
const adminRoutes = require('./routes/admin');
const scannerRoutes = require('./routes/scanner');
const aiRoutes = require('./routes/ai');
const userRoutes = require('./routes/user');
const libraryRoutes = require('./routes/library');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api/tracks', tracksRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', userRoutes);
app.use('/api', libraryRoutes);

app.use(express.static(path.resolve(__dirname, '..')));

app.listen(config.PORT, () => {
  console.log(`MuseBox server running on http://localhost:${config.PORT}`);
});