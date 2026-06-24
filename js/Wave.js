import { ENEMY_CONFIGS } from './Enemy.js';

export class WaveManager {
  constructor() {
    this.currentWave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.allSpawned = false;
    this.waveActive = false;
    this.totalWaves = 0;
  }

  loadLevel(waveDefs) {
    this.waveDefs = waveDefs;
    this.totalWaves = waveDefs.length;
    this.currentWave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.allSpawned = false;
    this.waveActive = false;
  }

  startWave(waveIndex) {
    this.currentWave = waveIndex;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.allSpawned = false;
    this.waveActive = true;

    const def = this.waveDefs[waveIndex];
    if (!def) return;

    let delay = 0;
    for (const group of def) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({
          type: group.type,
          delay: delay
        });
        delay += group.interval;
      }
    }
  }

  getSpawns(elapsed) {
    const enemies = [];
    this.spawnTimer += elapsed;

    while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.spawnTimer) {
      const entry = this.spawnQueue.shift();
      const config = ENEMY_CONFIGS[entry.type];
      if (config) {
        const scaledConfig = { ...config };
        const waveMultiplier = 1 + (this.currentWave * 0.15);
        scaledConfig.hp = Math.round(config.hp * waveMultiplier);
        enemies.push(scaledConfig);
      }
    }

    if (this.spawnQueue.length === 0) {
      this.allSpawned = true;
    }

    return enemies;
  }

  isWaveComplete(activeEnemies) {
    return this.allSpawned && activeEnemies.length === 0;
  }
}