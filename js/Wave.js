import { ENEMY_CONFIGS } from './Enemy.js';

// 波次定义
export const WAVE_DEFINITIONS = [
  // 波次1: 5个小方块
  [
    { type: 'smallCube', count: 5, interval: 0.8 }
  ],
  // 波次2: 8个小方块
  [
    { type: 'smallCube', count: 8, interval: 0.7 }
  ],
  // 波次3: 5个小方块 + 3个棱锥怪
  [
    { type: 'smallCube', count: 5, interval: 0.6 },
    { type: 'pyramid', count: 3, interval: 1.0 }
  ],
  // 波次4: 8个棱锥怪
  [
    { type: 'pyramid', count: 8, interval: 0.7 }
  ],
  // 波次5: 5个棱锥怪 + 3个圆柱兽
  [
    { type: 'pyramid', count: 5, interval: 0.6 },
    { type: 'cylinder', count: 3, interval: 1.0 }
  ],
  // 波次6: 8个圆柱兽 + 2个球体王
  [
    { type: 'cylinder', count: 8, interval: 0.7 },
    { type: 'sphere', count: 2, interval: 1.2 }
  ],
  // 波次7: 5个球体王 + 1个Boss
  [
    { type: 'sphere', count: 5, interval: 0.8 },
    { type: 'boss', count: 1, interval: 0 }
  ],
  // 波次8: 8个球体王 + 2个Boss
  [
    { type: 'sphere', count: 8, interval: 0.7 },
    { type: 'boss', count: 2, interval: 1.5 }
  ],
  // 波次9: 混合大军
  [
    { type: 'pyramid', count: 5, interval: 0.5 },
    { type: 'cylinder', count: 5, interval: 0.5 },
    { type: 'sphere', count: 5, interval: 0.5 },
    { type: 'boss', count: 1, interval: 0 }
  ],
  // 波次10: 终极Boss波
  [
    { type: 'boss', count: 3, interval: 2.0 },
    { type: 'sphere', count: 5, interval: 0.5 }
  ]
];

export const TOTAL_WAVES = WAVE_DEFINITIONS.length;

export class WaveManager {
  constructor() {
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

    const def = WAVE_DEFINITIONS[waveIndex];
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

  getSpawns(elapsed, path, scene) {
    const enemies = [];
    this.spawnTimer += elapsed;

    while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.spawnTimer) {
      const entry = this.spawnQueue.shift();
      const config = ENEMY_CONFIGS[entry.type];
      if (config) {
        // Scale HP based on wave
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