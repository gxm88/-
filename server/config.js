module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'musebox-dev-secret-key-change-in-production',
  JWT_EXPIRES: '7d',
  DB_PATH: process.env.DB_PATH || './data/musebox.db',
  MUSIC_DIR: process.env.MUSIC_DIR || './music',
};