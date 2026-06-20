import * as THREE from 'three';
import { SceneManager } from './Scene.js';
import { Map } from './Map.js';
import { Tower, TOWER_CONFIGS } from './Tower.js';
import { Enemy } from './Enemy.js';
import { WaveManager, TOTAL_WAVES } from './Wave.js';
import { UIManager } from './UI.js';

export class Game {
  constructor() {
    this.state = 'menu'; // menu | playing | gameover | victory
    this.lives = 20;
    this.gold = 200;
    this.score = 0;
    this.currentWave = 0;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.placementPreview = null;
    this.hoveredCell = null;

    this.sceneManager = new SceneManager(document.getElementById('game-container'));
    this.scene = this.sceneManager.getScene();
    this.camera = this.sceneManager.getCamera();
    this.renderer = this.sceneManager.getRenderer();

    this.map = new Map(this.scene);
    this.waveManager = new WaveManager();
    this.ui = new UIManager();

    this.setupUIEvents();
    this.setupRaycaster();

    this.clock = new THREE.Clock();
    this.lastTime = 0;

    this.ui.showMenu();
    this.animate();
  }

  setupUIEvents() {
    this.ui.onStart = () => this.startGame();
    this.ui.onRestart = () => this.restartGame();
    this.ui.onStartWave = () => this.startNextWave();
  }

  setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 30;
    this.mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.ui.clearSelection();
      this.removePlacementPreview();
    });
  }

  startGame() {
    this.state = 'playing';
    this.lives = 20;
    this.gold = 200;
    this.score = 0;
    this.currentWave = 0;
    this.clearAll();
    this.ui.hideMenu();
    this.ui.updateHUD(this.lives, this.gold, this.score, 0, TOTAL_WAVES, '准备');
    this.ui.showWaveButton(true);
  }

  restartGame() {
    this.clearAll();
    this.startGame();
  }

  clearAll() {
    this.towers.forEach(t => t.remove());
    this.enemies.forEach(e => e.remove());
    this.projectiles.forEach(p => p.remove());
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.currentWave = 0;
    this.waveManager = new WaveManager();
  }

  startNextWave() {
    if (this.state !== 'playing') return;
    this.currentWave++;
    this.waveManager.startWave(this.currentWave - 1);
    this.ui.showWaveButton(false);
    this.ui.updateHUD(this.lives, this.gold, this.score, this.currentWave, TOTAL_WAVES, '战斗中');
  }

  // 射线检测获取鼠标下的格子
  getGridCell(event) {
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

  onClick(event) {
    if (this.state !== 'playing') return;

    const cell = this.getGridCell(event);
    if (!cell) {
      this.ui.clearSelection();
      this.removePlacementPreview();
      return;
    }

    const selectedType = this.ui.selectedTower;
    if (!selectedType) return;

    const config = TOWER_CONFIGS[selectedType];
    if (!config) return;

    // 检查金币
    if (this.gold < config.cost) return;

    // 检查是否已有塔
    const existing = this.towers.find(t => t.gridPos.col === cell.col && t.gridPos.row === cell.row);
    if (existing) return;

    // 放置塔
    const worldPos = this.map.getWorldPos(cell.col, cell.row);
    const tower = new Tower(config, cell, worldPos, this.scene);
    this.towers.push(tower);
    this.gold -= config.cost;
    this.ui.updateHUD(this.lives, this.gold, this.score, this.currentWave, TOTAL_WAVES, '战斗中');
    this.ui.clearSelection();
    this.removePlacementPreview();
  }

  onMouseMove(event) {
    if (this.state !== 'playing') return;
    const cell = this.getGridCell(event);
    this.hoveredCell = cell;

    if (this.ui.selectedTower && cell) {
      this.showPlacementPreview(cell);
    } else {
      this.removePlacementPreview();
    }
  }

  showPlacementPreview(cell) {
    this.removePlacementPreview();

    const config = TOWER_CONFIGS[this.ui.selectedTower];
    if (!config) return;

    const worldPos = this.map.getWorldPos(cell.col, cell.row);
    const existing = this.towers.find(t => t.gridPos.col === cell.col && t.gridPos.row === cell.row);

    const geo = new THREE.RingGeometry(config.range - 0.05, config.range, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: existing ? 0xff3333 : (this.gold >= config.cost ? 0x00ff88 : 0xff3333),
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
      const newEnemyConfigs = this.waveManager.getSpawns(delta, this.map.getPath(), this.scene);
      for (const config of newEnemyConfigs) {
        const enemy = new Enemy(config, this.map.getPath(), this.scene);
        this.enemies.push(enemy);
      }

      // 检查波次完成
      if (this.waveManager.isWaveComplete(this.enemies)) {
        this.waveManager.waveActive = false;
        if (this.currentWave >= TOTAL_WAVES) {
          this.state = 'victory';
          this.ui.showVictory(this.score);
          return;
        }
        this.ui.showWaveButton(true);
        this.ui.updateHUD(this.lives, this.gold, this.score, this.currentWave, TOTAL_WAVES, '波次完成');
      }
    }

    // 更新敌人
    for (const enemy of this.enemies) {
      enemy.update(delta);
      if (enemy.reachedEnd) {
        this.lives--;
        this.ui.updateHUD(this.lives, this.gold, this.score, this.currentWave, TOTAL_WAVES, '战斗中');
        if (this.lives <= 0) {
          this.state = 'gameover';
          this.ui.showGameOver(this.score, this.currentWave);
          return;
        }
      }
    }

    // 清理死亡/到达终点的敌人
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
    for (const proj of this.projectiles) {
      if (proj.alive) {
        proj.update(delta);
      }
    }
    // 清理弹丸并添加到场景/移除
    const newProjectiles = [];
    for (const proj of this.projectiles) {
      if (proj.alive) {
        if (!proj.mesh.parent) {
          this.scene.add(proj.mesh);
        }
        newProjectiles.push(proj);
      } else {
        if (proj.mesh.parent) {
          this.scene.remove(proj.mesh);
        }
        proj.remove();
      }
    }
    this.projectiles = newProjectiles;

    // 更新 HUD
    this.ui.updateHUD(this.lives, this.gold, this.score, this.currentWave, TOTAL_WAVES,
      this.waveManager.waveActive ? '战斗中' : '准备');
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.update(delta);
    this.sceneManager.render();
  }
}