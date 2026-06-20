import * as THREE from 'three';
import { SceneManager } from './Scene.js';
import { Map } from './Map.js';
import { Tower, TOWER_CONFIGS } from './Tower.js';
import { Enemy } from './Enemy.js';
import { WaveManager } from './Wave.js';
import { getLevel, getStars } from './LevelData.js';

export class Game {
  constructor(sceneManager, uiManager) {
    this.sceneManager = sceneManager;
    this.scene = sceneManager.getScene();
    this.camera = sceneManager.getCamera();
    this.renderer = sceneManager.getRenderer();
    this.ui = uiManager;

    this.state = 'idle'; // idle | playing | gameover | victory
    this.levelConfig = null;
    this.lives = 20;
    this.gold = 200;
    this.score = 0;
    this.currentWave = 0;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.placementPreview = null;
    this.selectedTowerType = null;
    this.selectedTower = null; // 点击已放置的塔选中

    this.map = null;
    this.waveManager = new WaveManager();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 30;
    this.mouse = new THREE.Vector2();

    this.clock = new THREE.Clock();
    this.animFrameId = null;

    this.setupInputEvents();
    this.animate();
  }

  setupInputEvents() {
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.clearAllSelections();
    });
  }

  loadLevel(levelId) {
    this.levelConfig = getLevel(levelId);
    this.state = 'idle';
    this.lives = this.levelConfig.startLives;
    this.gold = this.levelConfig.startGold;
    this.score = 0;
    this.currentWave = 0;
    this.clearAll();
    this.selectedTowerType = null;
    this.selectedTower = null;
    this.removePlacementPreview();

    this.map = new Map(this.scene, this.levelConfig);
    this.waveManager.loadLevel(this.levelConfig.waveDefs);

    this.ui.updateHUD(this.lives, this.gold, this.score, 0, this.waveManager.totalWaves, '准备');
    this.ui.showWaveButton(true);
    this.ui.hideUpgradePanel();
    this.ui.hideGameOverlay();

    // 重启动画循环
    if (!this.animFrameId) {
      this.animate();
    }
  }

  clearAll() {
    this.towers.forEach(t => t.remove());
    this.enemies.forEach(e => e.remove());
    this.projectiles.forEach(p => {
      if (p.mesh.parent) this.scene.remove(p.mesh);
      p.remove();
    });
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.currentWave = 0;
  }

  startNextWave() {
    if (this.state !== 'idle' && this.state !== 'playing') return;
    this.state = 'playing';
    this.currentWave++;
    this.waveManager.startWave(this.currentWave - 1);
    this.ui.showWaveButton(false);
    this.ui.updateHUD(this.lives, this.gold, this.score, this.currentWave, this.waveManager.totalWaves, '战斗中');
    this.ui.hideUpgradePanel();
  }

  getGridCell(event) {
    if (!this.map) return null;
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.map.markers);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (obj.userData.col !== undefined) {
        return { col: obj.userData.col, row: obj.userData.row };
      }
    }
    return null;
  }

  getTowerAtCell(cell) {
    return this.towers.find(t => t.gridPos.col === cell.col && t.gridPos.row === cell.row);
  }

  onClick(event) {
    if (this.state !== 'playing' && this.state !== 'idle') return;
    if (!this.map) return;

    const cell = this.getGridCell(event);
    if (!cell) {
      this.clearAllSelections();
      return;
    }

    // 检查是否点击了已有塔
    const existingTower = this.getTowerAtCell(cell);
    if (existingTower) {
      this.selectPlacedTower(existingTower);
      return;
    }

    // 放置新塔
    if (this.selectedTowerType) {
      this.placeTower(cell);
    }
  }

  selectPlacedTower(tower) {
    this.selectedTowerType = null;
    this.selectedTower = tower;
    this.removePlacementPreview();
    this.ui.clearTowerSelection();
    this.ui.showUpgradePanel(tower, this.gold);
    tower.showRange(true);
  }

  placeTower(cell) {
    const config = TOWER_CONFIGS[this.selectedTowerType];
    if (!config) return;
    if (this.gold < config.cost) return;
    if (this.getTowerAtCell(cell)) return;

    const worldPos = this.map.getWorldPos(cell.col, cell.row);
    const tower = new Tower(config, cell, worldPos, this.scene);
    this.towers.push(tower);
    this.gold -= config.cost;
    this.ui.updateHUD(this.lives, this.gold, this.score, this.currentWave, this.waveManager.totalWaves,
      this.state === 'playing' ? '战斗中' : '准备');
    this.clearAllSelections();
  }

  upgradeTower() {
    if (!this.selectedTower) return;
    const cost = this.selectedTower.getUpgradeCost();
    if (cost <= 0 || this.gold < cost) return;
    this.gold -= cost;
    this.selectedTower.upgrade();
    this.ui.showUpgradePanel(this.selectedTower, this.gold);
    this.ui.updateHUD(this.lives, this.gold, this.score, this.currentWave, this.waveManager.totalWaves,
      this.state === 'playing' ? '战斗中' : '准备');
  }

  sellTower() {
    if (!this.selectedTower) return;
    const refund = Math.floor(this.selectedTower.config.cost * 0.5);
    this.gold += refund;
    this.selectedTower.remove();
    this.towers = this.towers.filter(t => t !== this.selectedTower);
    this.selectedTower = null;
    this.ui.hideUpgradePanel();
    this.ui.updateHUD(this.lives, this.gold, this.score, this.currentWave, this.waveManager.totalWaves,
      this.state === 'playing' ? '战斗中' : '准备');
  }

  clearAllSelections() {
    if (this.selectedTower) {
      this.selectedTower.showRange(false);
      this.selectedTower = null;
    }
    this.selectedTowerType = null;
    this.removePlacementPreview();
    this.ui.clearTowerSelection();
    this.ui.hideUpgradePanel();
  }

  onMouseMove(event) {
    if (this.state !== 'playing' && this.state !== 'idle') return;
    if (!this.map) return;

    const cell = this.getGridCell(event);
    if (this.selectedTowerType && cell) {
      this.showPlacementPreview(cell);
    } else {
      this.removePlacementPreview();
    }
  }

  showPlacementPreview(cell) {
    this.removePlacementPreview();
    const config = TOWER_CONFIGS[this.selectedTowerType];
    if (!config) return;

    const worldPos = this.map.getWorldPos(cell.col, cell.row);
    const existing = this.getTowerAtCell(cell);
    const canPlace = !existing && this.gold >= config.cost;

    const geo = new THREE.RingGeometry(config.range - 0.05, config.range, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: canPlace ? 0x00ff88 : 0xff3333,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    this.placementPreview = new THREE.Mesh(geo, mat);
    this.placementPreview.rotation.x = -Math.PI / 2;
    this.placementPreview.position.set(worldPos.x, 0.02, worldPos.z);
    this.scene.add(this.placementPreview);
  }

  removePlacementPreview() {
    if (this.placementPreview) {
      this.scene.remove(this.placementPreview);
      this.placementPreview.geometry?.dispose();
      this.placementPreview.material?.dispose();
      this.placementPreview = null;
    }
  }

  update(delta) {
    if (this.state !== 'playing') return;

    // 波次管理
    if (this.waveManager.waveActive) {
      const newEnemyConfigs = this.waveManager.getSpawns(delta);
      for (const config of newEnemyConfigs) {
        const enemy = new Enemy(config, this.map.getPath(), this.scene);
        this.enemies.push(enemy);
      }

      if (this.waveManager.isWaveComplete(this.enemies)) {
        this.waveManager.waveActive = false;
        if (this.currentWave >= this.waveManager.totalWaves) {
          this.state = 'victory';
          const stars = getStars(this.lives, this.levelConfig.startLives);
          this.ui.showVictory(this.score, stars);
          return;
        }
        this.ui.showWaveButton(true);
        this.ui.updateHUD(this.lives, this.gold, this.score, this.currentWave, this.waveManager.totalWaves, '波次完成');
      }
    }

    // 更新敌人
    for (const enemy of this.enemies) {
      enemy.update(delta);
      if (enemy.reachedEnd) {
        this.lives--;
        this.ui.updateHUD(this.lives, this.gold, this.score, this.currentWave, this.waveManager.totalWaves, '战斗中');
        if (this.lives <= 0) {
          this.state = 'gameover';
          this.ui.showGameOver(this.score, this.currentWave);
          return;
        }
      }
    }

    // 清理敌人
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        if (enemy.hp <= 0 && !enemy.reachedEnd) {
          this.gold += enemy.reward;
          this.score += enemy.reward;
        }
        enemy.remove();
      }
    }
    this.enemies = this.enemies.filter(e => e.alive);

    // 更新塔
    for (const tower of this.towers) {
      tower.update(delta, this.enemies, this.projectiles);
    }

    // 更新弹丸
    const newProjectiles = [];
    for (const proj of this.projectiles) {
      if (proj.alive) {
        if (!proj.mesh.parent) this.scene.add(proj.mesh);
        proj.update(delta);
        newProjectiles.push(proj);
      } else {
        if (proj.mesh.parent) this.scene.remove(proj.mesh);
        proj.remove();
      }
    }
    this.projectiles = newProjectiles;

    this.ui.updateHUD(this.lives, this.gold, this.score, this.currentWave, this.waveManager.totalWaves, '战斗中');
  }

  animate() {
    this.animFrameId = requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.update(delta);
    this.sceneManager.render();
  }

  cleanup() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.clearAll();
  }
}