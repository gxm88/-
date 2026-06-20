import * as THREE from 'three';
import { TOWER_CONFIGS } from './Tower.js';
import { ENEMY_CONFIGS } from './Enemy.js';

// 地形类型
const GRASS = 0;
const TREE = 1;
const ROCK = 2;
const GOLD = 3;
const WATER = 4;

// 常量
const GRID_SIZE = 25;       // 网格格数
const CELL_SIZE = 1.2;      // 每格世界尺寸
const DAY_LEN = 40;         // 白天时长（秒）
const NIGHT_LEN = 20;       // 夜晚时长

// 简易噪音（哈希伪随机）
function pseudoNoise(x, y, seed = 0) {
  const X = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return X - Math.floor(X);
}

function terrainNoise(x, y) {
  let n = 0;
  n += pseudoNoise(x, y, 1) * 0.5;
  n += pseudoNoise(x * 2.3, y * 2.3, 2) * 0.25;
  n += pseudoNoise(x * 4.7, y * 4.7, 3) * 0.125;
  return n;
}

function getTerrainType(col, row) {
  const cx = (GRID_SIZE - 1) / 2;
  const cz = (GRID_SIZE - 1) / 2;
  const dist = Math.sqrt((col - cx) ** 2 + (row - cz) ** 2);
  // 基地周边 2 格 — 必定是草地
  if (dist < 3) return GRASS;

  const n = terrainNoise(col * 0.3, row * 0.3);
  if (n < 0.05) return WATER;
  if (n < 0.25) return TREE;
  if (n < 0.4) return ROCK;
  if (n < 0.48) return GOLD;
  return GRASS;
}

export class EndlessGame {
  constructor(container) {
    this.container = container;

    // 场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 10, 40);

    // 相机
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(14, 18, 14);
    this.camera.lookAt(0, 0, 0);

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    // 光照
    this.ambientLight = new THREE.AmbientLight(0x8888ff, 0.7);
    this.scene.add(this.ambientLight);
    this.sunLight = new THREE.DirectionalLight(0xffffcc, 1.6);
    this.sunLight.position.set(12, 20, 8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 100;
    this.sunLight.shadow.camera.left = -30;
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 30;
    this.sunLight.shadow.camera.bottom = -30;
    this.scene.add(this.sunLight);

    const fill = new THREE.DirectionalLight(0x555599, 0.5);
    fill.position.set(-8, 6, -8);
    this.scene.add(fill);

    // 工具
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 80;
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.animId = null;

    // 相机控制（右键平移 / 中键水平旋转 / 滚轮缩放，缩放沿视线方向）
    this.camAngle = Math.PI / 4;       // 水平方位角
    this.camPitch = Math.atan2(18, 22); // 俯仰角（向上看，arctan(18/22) ≈ 39°）
    this.camDist = 22;                  // 相机到 target 的直线距离
    this.camTarget = new THREE.Vector3(0, 0, 0);
    this.isPanning = false;
    this.isRotating = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.towers = [];
    this.walls = [];
    this.workers = [];
    this.enemies = [];
    this.resources = [];       // {type, hp, maxHp, mesh, col, row}
    this.markers = [];          // 可建造标记
    this.lasers = [];           // 激光束（视觉）
    this.rangeRings = [];
    this.groundMeshes = [];
    this.gridLineGroup = null;

    // 游戏状态
    this.wood = 50;
    this.stone = 30;
    this.coins = 100;
    this.dayNum = 1;
    this.dayTime = 0;
    this.isNight = false;
    this.nightSpawnTimer = 0;
    this.nightEnemiesToSpawn = 0;
    this.kills = 0;
    this.baseHp = 100;
    this.baseMaxHp = 100;

    this.buildMode = null;     // arrow | cannon | ice | lightning | wall | worker
    this.selectedTower = null;  // 选中的塔
    this.selectedWorker = null; // 选中的工人

    // 拖拽放置状态（从底部按钮长按→拖到地图）
    this._dragBuildMode = null;   // 当前拖拽放置的类型
    this._dragBuildGhost = null;  // 预览幽灵 mesh（Group）
    this._dragHighlight = null;   // 当前格高亮（绿色圈=可放 红=不可）
    this._dragIsValid = false;    // 当前位置是否可放置

    // 长按拖拽状态
    this.isPressing = false;
    this.pressStartX = 0;
    this.pressStartY = 0;
    this.pressStartTime = 0;
    this.pressedEntity = null;    // 长按开始时按住的实体
    this.longPressMs = 320;       // 长按判定阈值（毫秒）
    this.longPressMoved = false;  // 长按期间是否已移动（取消短按用）
    this.pressMoved = false;      // press 期间是否移动过（独立标志，不影响拖拽）
    this.isDragging = false;     // 是否正在拖拽工人
    this.dragTarget = null;      // 拖拽目标 { wx, wz, isResource, resource }
    this._longPressTimer = null;

    // 弧线拖拽视觉
    this.dragArcPoints = [];  // 世界坐标点数组，render() 绘制抛物线
    // 预建弧线 mesh（避免每帧创建/销毁）
    this._arcLine = null;
    this._arcMat = new THREE.LineBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.9 });
    this._arcGeo = new THREE.BufferGeometry();
    // 目标圈圈指示（用 Mesh + RingGeometry，因为 RingGeometry 是面几何）
    this._targetRing = null;
    this._targetRingMat = new THREE.MeshBasicMaterial({ color: 0x66ffaa, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    this._targetRingGeo = new THREE.RingGeometry(0.7, 1.1, 32);

    this.onHUDUpdate = null;
    this.onGameOver = null;

    this.resize = () => this.onResize();
    window.addEventListener('resize', this.resize);

    // 输入事件
    this.setupInput();
  }

  // ========== 初始化地图 ==========
  createMap() {
    const halfGrid = (GRID_SIZE - 1) / 2;

    // 地面 — 为每格创建一个小方块（根据地形颜色不同）
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE; row++) {
        const terrain = getTerrainType(col, row);
        const wx = (col - halfGrid) * CELL_SIZE;
        const wz = (row - halfGrid) * CELL_SIZE;

        // 地面方块
        let color = 0x3a5a24;
        let height = 0.15;
        if (terrain === WATER) color = 0x1a4a8a;
        else if (terrain === TREE) color = 0x2a5a1a;
        else if (terrain === ROCK) color = 0x6a6a6a;
        else if (terrain === GOLD) color = 0x5a4a14;

        const tileGeo = new THREE.BoxGeometry(CELL_SIZE * 0.98, height, CELL_SIZE * 0.98);
        const tileMat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.1 });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set(wx, -height / 2, wz);
        tile.receiveShadow = true;
        this.scene.add(tile);
        this.groundMeshes.push(tile);

        // 可建造标记（草地且非基地）
        const cx = (GRID_SIZE - 1) / 2;
        const cz = (GRID_SIZE - 1) / 2;
        const distFromCenter = Math.sqrt((col - cx) ** 2 + (row - cz) ** 2);
        const isBase = distFromCenter < 2.5;

        if (terrain === GRASS && !isBase) {
          const markerGeo = new THREE.PlaneGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9);
          const markerMat = new THREE.MeshBasicMaterial({
            color: 0x335577,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide
          });
          const marker = new THREE.Mesh(markerGeo, markerMat);
          marker.rotation.x = -Math.PI / 2;
          marker.position.set(wx, 0.08, wz);
          marker.userData = { col, row, worldX: wx, worldZ: wz };
          marker.visible = false;  // 默认隐藏，进入建造模式才显示
          this.scene.add(marker);
          this.markers.push(marker);
        }

        // 资源对象
        if (terrain === TREE) this.spawnResource('tree', wx, wz, col, row);
        else if (terrain === ROCK) this.spawnResource('rock', wx, wz, col, row);
        else if (terrain === GOLD) this.spawnResource('gold', wx, wz, col, row);
      }
    }

    // 网格线（仅在可见时能看到 — 简单的网格帮助）
    const gridHelper = new THREE.GridHelper(GRID_SIZE * CELL_SIZE, GRID_SIZE, 0x334455, 0x223344);
    gridHelper.position.y = 0.02;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    this.scene.add(gridHelper);
    this.gridLineGroup = gridHelper;

    // 基地
    this.createBase();
  }

  createBase() {
    const baseGroup = new THREE.Group();

    // 基座（大立方块）
    const baseGeo = new THREE.BoxGeometry(CELL_SIZE * 3, 0.6, CELL_SIZE * 3);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x5555aa, emissive: 0x222244, emissiveIntensity: 0.4,
      roughness: 0.5, metalness: 0.5
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.3;
    base.castShadow = true;
    base.receiveShadow = true;
    baseGroup.add(base);

    // 顶层菱形（八面体）— 中心标志
    const crystalGeo = new THREE.OctahedronGeometry(0.7);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00ddff, emissive: 0x00aadd, emissiveIntensity: 0.6,
      roughness: 0.2, metalness: 0.8
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = 1.6;
    crystal.castShadow = true;
    baseGroup.add(crystal);
    this.baseCrystal = crystal;

    // 4 个小立方在四角
    const towerColor = 0x7777cc;
    for (const [dx, dz] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      const tGeo = new THREE.BoxGeometry(0.6, 1.2, 0.6);
      const tMat = new THREE.MeshStandardMaterial({
        color: towerColor, roughness: 0.4, metalness: 0.6
      });
      const t = new THREE.Mesh(tGeo, tMat);
      t.position.set(dx * CELL_SIZE * 0.8, 0.6, dz * CELL_SIZE * 0.8);
      t.castShadow = true;
      baseGroup.add(t);
    }

    this.scene.add(baseGroup);
    this.baseGroup = baseGroup;
  }

  spawnResource(kind, wx, wz, col, row) {
    let geo, color, hp, maxHp;
    if (kind === 'tree') {
      // 三角形（圆锥体）+ 小矩形
      const group = new THREE.Group();
      const trunkGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a24, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.25;
      trunk.castShadow = true;
      group.add(trunk);
      const leafGeo = new THREE.ConeGeometry(0.4, 0.8, 6);
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a7a2a, roughness: 0.6 });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = 0.9;
      leaf.castShadow = true;
      group.add(leaf);
      group.position.set(wx, 0, wz);
      geo = null;
      color = 0x2a7a2a;
      hp = 40;
      this.scene.add(group);
      this.resources.push({
        type: 'tree', hp, maxHp: hp, mesh: group, col, row, wx, wz
      });
    } else if (kind === 'rock') {
      const rockGeo = new THREE.DodecahedronGeometry(0.45);
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.8, metalness: 0.2 });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(wx, 0.4, wz);
      rock.rotation.y = Math.random() * Math.PI;
      rock.castShadow = true;
      this.scene.add(rock);
      this.resources.push({
        type: 'rock', hp: 70, maxHp: 70, mesh: rock, col, row, wx, wz
      });
    } else if (kind === 'gold') {
      const goldGeo = new THREE.IcosahedronGeometry(0.45);
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700, emissive: 0x886600, emissiveIntensity: 0.3,
        roughness: 0.3, metalness: 0.9
      });
      const gold = new THREE.Mesh(goldGeo, goldMat);
      gold.position.set(wx, 0.45, wz);
      gold.castShadow = true;
      this.scene.add(gold);
      this.resources.push({
        type: 'gold', hp: 50, maxHp: 50, mesh: gold, col, row, wx, wz
      });
    }
  }

  // ========== 塔建造 ==========
  buildTower(type, wx, wz) {
    const cfg = TOWER_CONFIGS[type];
    if (!cfg) return;
    if (this.wood < (cfg.cost * 0.5) || this.stone < (cfg.cost * 0.3)) return false;
    // 简化：使用金币消耗（与关卡模式一致的 tower_cost）
    if (this.coins < cfg.cost) return false;
    this.coins -= cfg.cost;

    const towerGroup = new THREE.Group();
    towerGroup.position.set(wx, 0, wz);

    // 基座方块
    const baseGeo = new THREE.BoxGeometry(CELL_SIZE * 0.8, 0.3, CELL_SIZE * 0.8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x444466, roughness: 0.7 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.15;
    base.castShadow = true;
    base.receiveShadow = true;
    towerGroup.add(base);

    // 塔身（根据类型用不同几何体）
    let topGeo;
    if (type === 'arrow') topGeo = new THREE.ConeGeometry(0.35, 1.0, 6);
    else if (type === 'cannon') topGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    else if (type === 'ice') topGeo = new THREE.OctahedronGeometry(0.5);
    else topGeo = new THREE.DodecahedronGeometry(0.5);

    const topMat = new THREE.MeshStandardMaterial({
      color: cfg.color, emissive: cfg.color, emissiveIntensity: 0.5,
      roughness: 0.3, metalness: 0.6
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.8;
    top.castShadow = true;
    towerGroup.add(top);

    // 范围圈（默认隐藏，选中后显示）
    const ringGeo = new THREE.RingGeometry(cfg.range - 0.05, cfg.range, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: cfg.color, side: THREE.DoubleSide, transparent: true, opacity: 0.25
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    ring.visible = false;
    towerGroup.add(ring);

    this.scene.add(towerGroup);

    const tower = {
      type, config: cfg, group: towerGroup, top,
      range: cfg.range, damage: cfg.damage, fireRate: cfg.fireRate,
      fireTimer: 0, level: 1, maxLevel: 3, ring
    };
    this.towers.push(tower);
    return true;
  }

  buildWall(wx, wz) {
    if (this.wood < 20) return false;
    this.wood -= 20;
    const wGeo = new THREE.BoxGeometry(CELL_SIZE * 0.95, 0.8, CELL_SIZE * 0.95);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.8 });
    const wall = new THREE.Mesh(wGeo, wMat);
    wall.position.set(wx, 0.4, wz);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this.walls.push({ mesh: wall, hp: 80, maxHp: 80, wx, wz });
    return true;
  }

  buildWorker(wx, wz) {
    if (this.wood < 25) return false;
    this.wood -= 25;
    // 菱形体 = OctahedronGeometry
    const workerGroup = new THREE.Group();
    const bodyGeo = new THREE.OctahedronGeometry(0.45);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x44aaff, emissive: 0x2266aa, emissiveIntensity: 0.4,
      roughness: 0.3, metalness: 0.5
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    workerGroup.add(body);

    // 小顶端方块
    const tipGeo = new THREE.OctahedronGeometry(0.15);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8
    });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 1.1;
    workerGroup.add(tip);

    // 透明大碰撞盒（更容易点到工人，不影响视觉）
    const hitGeo = new THREE.SphereGeometry(0.8, 12, 8);
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.y = 0.6;
    workerGroup.add(hit);

    workerGroup.position.set(wx, 0, wz);
    this.scene.add(workerGroup);

    this.workers.push({
      group: workerGroup, body, tip,
      wx, wz, target: null, // target resource or {wx,wz}
      state: 'idle',       // idle | moving | gathering
      gatherTimer: 0,
      gatherTarget: null,
      moveSpeed: 3.5,
      rotSpeed: 0
    });
    return true;
  }

  // ========== 升级 ==========
  upgradeTower(tower) {
    if (!tower || tower.level >= tower.maxLevel) return false;
    const cost = tower.config.upgradeCosts[tower.level] || Math.floor(tower.config.cost * 0.8);
    if (this.coins < cost) return false;
    this.coins -= cost;
    tower.level++;
    tower.damage = tower.config.upgradeDamage[tower.level - 1];
    tower.range = tower.config.upgradeRange[tower.level - 1];

    // 缩放塔身提示
    const s = 1 + (tower.level - 1) * 0.15;
    tower.top.scale.set(s, s, s);
    tower.top.position.y = 0.8 + (tower.level - 1) * 0.1;

    // 更新范围圈几何
    tower.ring.geometry.dispose();
    tower.ring.geometry = new THREE.RingGeometry(tower.range - 0.05, tower.range, 48);
    return true;
  }

  upgradeWall(wall) {
    const cost = 40;
    if (this.coins < cost) return false;
    if ((wall.level || 1) >= 3) return false;
    this.coins -= cost;
    wall.level = (wall.level || 1) + 1;
    wall.maxHp = 80 + (wall.level - 1) * 60;
    wall.hp = wall.maxHp;
    wall.mesh.scale.y = 1 + (wall.level - 1) * 0.3;
    wall.mesh.position.y = 0.4 * wall.mesh.scale.y;
    return true;
  }

  // ========== 游戏开始/结束 ==========
  start() {
    // 清理旧的
    this.cleanupWorld();

    this.towers = [];
    this.walls = [];
    this.workers = [];
    this.enemies = [];
    this.resources = [];
    this.markers = [];
    this.lasers = [];
    this.wood = 50;
    this.stone = 30;
    this.coins = 100;
    this.dayNum = 1;
    this.dayTime = 0;
    this.isNight = false;
    this.kills = 0;
    this.baseHp = 100;
    this.baseMaxHp = 100;

    this.createMap();

    // 重置相机状态并显示渲染器（处理"退出后再进入"的场景）
    this.camAngle = Math.PI / 4;
    this.camPitch = Math.atan2(18, 22);
    this.camDist = 22;
    this.camTarget.set(0, 0, 0);
    this.updateCamera();

    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.display = 'block';
      // 重新设置画布尺寸以适配当前窗口
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }

    this.updateHUD();
    if (!this.animId) this.animate();
  }

  cleanupWorld() {
    // 清理整个场景中的自定义对象
    const dispose = (obj) => {
      obj.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
      this.scene.remove(obj);
    };

    this.towers.forEach(t => dispose(t.group));
    this.walls.forEach(w => this.scene.remove(w.mesh) && w.mesh.geometry.dispose() && w.mesh.material.dispose());
    this.workers.forEach(w => dispose(w.group));
    for (const e of this.enemies) dispose(e.group);
    for (const r of this.resources) dispose(r.mesh);

    for (const m of this.markers) this.scene.remove(m), m.geometry.dispose(), m.material.dispose();
    for (const g of this.groundMeshes) g.geometry.dispose(), g.material.dispose(), this.scene.remove(g);
    this.markers = [];
    this.groundMeshes = [];
    if (this.gridLineGroup) {
      this.scene.remove(this.gridLineGroup);
      this.gridLineGroup.geometry.dispose();
      this.gridLineGroup.material.dispose();
    }
    if (this.baseGroup) dispose(this.baseGroup);
    this.towers = [];
    this.walls = [];
    this.workers = [];
    this.enemies = [];
    this.resources = [];
  }

  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
    this.running = false;
    // 强制隐藏渲染器 dom，防止在主页残留
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.display = 'none';
    }
  }

  cleanup() {
    this.stop();
    this.cleanupWorld();
    if (this._arcLine) { this.scene.remove(this._arcLine); this._arcLine = null; }
    if (this._arcGeo) { this._arcGeo.dispose(); this._arcGeo = null; }
    if (this._arcMat) { this._arcMat.dispose(); this._arcMat = null; }
    if (this._targetRing) { this.scene.remove(this._targetRing); this._targetRing = null; }
    if (this._targetRingGeo) { this._targetRingGeo.dispose(); this._targetRingGeo = null; }
    if (this._targetRingMat) { this._targetRingMat.dispose(); this._targetRingMat = null; }
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
    }
    window.removeEventListener('resize', this.resize);
    this.hideEntityPanel();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ========== 游戏循环 ==========
  animate() {
    this.animId = requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.update(delta);
    // 渲染拖拽弧线
    this.renderDragArc();
    this.renderer.render(this.scene, this.camera);
  }

  renderDragArc() {
    const pts = this.dragArcPoints;
    // 渲染/清理抛物线
    if (pts.length < 2) {
      if (this._arcLine) { this.scene.remove(this._arcLine); this._arcLine = null; }
    } else {
      // 用短段模拟虚线：偶数段才渲染
      const dashedPts = [];
      for (let i = 0; i < pts.length - 1; i++) {
        if (i % 2 === 0) {
          dashedPts.push(pts[i], pts[i + 1]);
        }
      }
      const pos = new Float32Array(dashedPts.length * 3);
      for (let i = 0; i < dashedPts.length; i++) {
        pos[i * 3] = dashedPts[i].x;
        pos[i * 3 + 1] = dashedPts[i].y;
        pos[i * 3 + 2] = dashedPts[i].z;
      }
      this._arcGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this._arcGeo.setDrawRange(0, dashedPts.length);
      if (!this._arcLine) {
        this._arcLine = new THREE.LineSegments(this._arcGeo, this._arcMat);
        this.scene.add(this._arcLine);
      }
      this._arcLine.geometry.attributes.position.needsUpdate = true;
    }
    // 渲染/清理目标圈圈
    if (this.dragTarget && this.dragTarget.isResource) {
      if (!this._targetRing) {
        this._targetRing = new THREE.Mesh(this._targetRingGeo, this._targetRingMat);
        this._targetRing.rotation.x = -Math.PI / 2;
        this.scene.add(this._targetRing);
      }
      this._targetRing.position.set(this.dragTarget.wx, 0.05, this.dragTarget.wz);
    } else {
      if (this._targetRing) { this.scene.remove(this._targetRing); this._targetRing = null; }
    }
  }

  update(dt) {
    // 昼夜循环
    this.dayTime += dt;
    const cycleLen = this.isNight ? NIGHT_LEN : DAY_LEN;
    if (this.dayTime >= cycleLen) {
      this.dayTime -= cycleLen;
      if (this.isNight) {
        // 白天开始
        this.isNight = false;
        this.dayNum++;
        this.coins += 50 + this.dayNum * 10;
      } else {
        this.isNight = true;
        this.nightEnemiesToSpawn = 4 + Math.floor(this.dayNum * 1.5);
        this.nightSpawnTimer = 0;
      }
      this.updateHUD();
    }

    // 光照随昼夜变化
    const dayProgress = this.dayTime / cycleLen;
    if (this.isNight) {
      this.ambientLight.color.setHex(0x222244);
      this.ambientLight.intensity = 0.4;
      this.sunLight.color.setHex(0x8888ff);
      this.sunLight.intensity = 0.6;
      this.scene.background = new THREE.Color(0x060618);
      if (this.gridLineGroup) this.gridLineGroup.material.color.set(0x445577);
    } else {
      this.ambientLight.color.setHex(0x8888ff);
      this.ambientLight.intensity = 0.7;
      this.sunLight.color.setHex(0xffffcc);
      this.sunLight.intensity = 1.6;
      this.scene.background = new THREE.Color(0x87a0c7);
      if (this.gridLineGroup) this.gridLineGroup.material.color.set(0x334455);
    }

    // 夜晚刷怪
    if (this.isNight && this.nightEnemiesToSpawn > 0) {
      this.nightSpawnTimer += dt;
      if (this.nightSpawnTimer >= 1.5) {
        this.nightSpawnTimer = 0;
        this.spawnEnemy();
        this.nightEnemiesToSpawn--;
      }
    }

    // 更新工人
    this.updateWorkers(dt);
    // 更新敌人
    this.updateEnemies(dt);
    // 更新塔
    this.updateTowers(dt);
    // 更新激光束
    this.updateLasers(dt);

    // 基地水晶旋转
    if (this.baseCrystal) {
      this.baseCrystal.rotation.y += dt * 1.5;
      this.baseCrystal.rotation.x += dt * 0.6;
      this.baseCrystal.position.y = 1.6 + Math.sin(performance.now() * 0.002) * 0.1;
    }

    // 检查游戏结束
    if (this.baseHp <= 0 && this.onGameOver) {
      this.onGameOver(this.dayNum, this.kills);
      this.onGameOver = null; // 只触发一次
    }
  }

  updateWorkers(dt) {
    const halfGrid = (GRID_SIZE - 1) / 2;
    for (const worker of this.workers) {
      // 空闲状态下轻微漂浮
      worker.tip.rotation.y += dt * 2;

      if (worker.state === 'gathering' && worker.gatherTarget) {
        worker.gatherTimer -= dt;
        // 发射激光视觉
        if (!worker.gatherLaser) {
          worker.gatherLaser = this.createLaserBeam(worker.group.position, worker.gatherTarget.mesh.position, 0x66ddff);
        } else {
          worker.gatherLaser.material.color.setHex(0x66ddff);
        }
        // 伤害资源
        const target = worker.gatherTarget;
        target.hp -= 35 * dt;
        if (target.hp <= 0) {
          // 收集成功
          if (target.type === 'tree') this.wood += 10;
          else if (target.type === 'rock') this.stone += 8;
          else if (target.type === 'gold') this.coins += 30;
          // 移除资源 mesh
          target.mesh.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
          });
          this.scene.remove(target.mesh);
          // 将格从资源列表中清除，并改造成草地可建造
          this.resources = this.resources.filter(r => r !== target);
          // 工人返回
          worker.gatherTarget = null;
          if (worker.gatherLaser) this.removeLaserBeam(worker.gatherLaser);
          worker.gatherLaser = null;
          worker.state = 'idle';
          // 给工人指派回到基地
          worker.target = { wx: 0, wz: 0, isBase: true };
          this.updateHUD();
        }
        continue;
      }

      // 移动
      if (worker.target) {
        const tw = worker.target.wx;
        const tz = worker.target.wz;
        const dx = tw - worker.group.position.x;
        const dz = tz - worker.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.3) {
          // 到达目标
          if (worker.target.isResource) {
            worker.state = 'gathering';
            worker.gatherTarget = worker.target.resource;
            worker.gatherTimer = worker.target.resource.hp / 35;
            worker.target = null;
          } else {
            worker.state = 'idle';
            worker.target = null;
          }
          continue;
        }
        const speed = worker.moveSpeed;
        const nx = dx / dist;
        const nz = dz / dist;
        worker.group.position.x += nx * speed * dt;
        worker.group.position.z += nz * speed * dt;

        // 朝向目标
        const desiredRot = Math.atan2(nx, nz);
        worker.group.rotation.y = smoothAngle(worker.group.rotation.y, desiredRot, dt * 6);
        // 身体轻微上下
        worker.body.position.y = 0.5 + Math.abs(Math.sin(performance.now() * 0.008)) * 0.15;
      }
    }
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      // 朝向基地
      const dx = -e.group.position.x;
      const dz = -e.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 1.2) {
        // 到达基地
        this.baseHp -= 10;
        e.alive = false;
        continue;
      }
      const nx = dx / dist;
      const nz = dz / dist;
      e.group.position.x += nx * e.speed * dt;
      e.group.position.z += nz * e.speed * dt;

      // 检查前方是否有墙
      for (const wall of this.walls) {
        if (wall.hp <= 0) continue;
        const wdx = e.group.position.x - wall.wx;
        const wdz = e.group.position.z - wall.wz;
        const wdist = Math.sqrt(wdx * wdx + wdz * wdz);
        if (wdist < CELL_SIZE * 0.6) {
          wall.hp -= 15 * dt;
          // 敌人稍微停住攻击
          e.group.position.x -= nx * e.speed * dt * 0.7;
          e.group.position.z -= nz * e.speed * dt * 0.7;
          if (wall.hp <= 0) {
            // 销毁墙
            this.scene.remove(wall.mesh);
            wall.mesh.geometry.dispose();
            wall.mesh.material.dispose();
          }
        }
      }

      // 旋转
      e.mesh.rotation.y += dt * 2;
      e.mesh.rotation.x += dt * 1.5;

      // 血条朝向相机
      if (e.healthBar) {
        e.healthBar.lookAt(this.camera.position);
        const ratio = Math.max(0, e.hp / e.maxHp);
        e.healthFill.scale.x = ratio;
        e.healthFill.position.x = -(1 - ratio) * 0.6;
        if (ratio < 0.3) e.healthFill.material.color.setHex(0xff3333);
        else if (ratio < 0.6) e.healthFill.material.color.setHex(0xffaa00);
        else e.healthFill.material.color.setHex(0x00ff88);
      }
    }
    // 清理死亡
    for (const e of this.enemies) {
      if (!e.alive) {
        e.group.traverse(c => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) c.material.dispose();
        });
        this.scene.remove(e.group);
      }
    }
    this.enemies = this.enemies.filter(e => e.alive);

    // 墙移除
    this.walls = this.walls.filter(w => w.hp > 0);
  }

  spawnEnemy() {
    // 根据天数选择类型
    let typeKey;
    if (this.dayNum >= 12) typeKey = 'boss';
    else if (this.dayNum >= 8) typeKey = 'sphere';
    else if (this.dayNum >= 5) typeKey = 'cylinder';
    else if (this.dayNum >= 3) typeKey = 'pyramid';
    else typeKey = 'smallCube';
    if (Math.random() < 0.15) typeKey = Object.keys(ENEMY_CONFIGS)[Math.min(Object.keys(ENEMY_CONFIGS).length - 1,
      Math.floor(Math.random() * Object.keys(ENEMY_CONFIGS).length))];

    const cfg = ENEMY_CONFIGS[typeKey];
    if (!cfg) return;

    // 从地图边缘随机生成
    const side = Math.floor(Math.random() * 4);
    const mapHalf = (GRID_SIZE * CELL_SIZE) / 2 - 1;
    let sx, sz;
    if (side === 0) { sx = -mapHalf + Math.random() * mapHalf * 2; sz = -mapHalf; }
    else if (side === 1) { sx = mapHalf; sz = -mapHalf + Math.random() * mapHalf * 2; }
    else if (side === 2) { sx = -mapHalf + Math.random() * mapHalf * 2; sz = mapHalf; }
    else { sx = -mapHalf; sz = -mapHalf + Math.random() * mapHalf * 2; }

    const group = new THREE.Group();
    let geo;
    if (cfg.geometry === 'box') geo = new THREE.BoxGeometry(cfg.size * 0.9, cfg.size * 0.9, cfg.size * 0.9);
    else if (cfg.geometry === 'tetrahedron') geo = new THREE.TetrahedronGeometry(cfg.size * 0.7);
    else if (cfg.geometry === 'cylinder') geo = new THREE.CylinderGeometry(cfg.size * 0.5, cfg.size * 0.5, cfg.size, 8);
    else if (cfg.geometry === 'sphere') geo = new THREE.SphereGeometry(cfg.size * 0.5, 16, 16);
    else geo = new THREE.IcosahedronGeometry(cfg.size * 0.6);
    const mat = new THREE.MeshStandardMaterial({
      color: cfg.color, emissive: cfg.color, emissiveIntensity: 0.6,
      roughness: 0.3, metalness: 0.5
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = cfg.size * 0.5 + 0.2;
    mesh.castShadow = true;
    group.add(mesh);

    // 血条（简化）
    const bgGeo = new THREE.PlaneGeometry(1.2, 0.12);
    const bg = new THREE.Mesh(bgGeo, new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide }));
    bg.position.y = cfg.size + 1.0;
    group.add(bg);
    const fgGeo = new THREE.PlaneGeometry(1.2, 0.12);
    const fg = new THREE.Mesh(fgGeo, new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide }));
    fg.position.y = cfg.size + 1.0;
    fg.position.z = 0.01;
    group.add(fg);

    group.position.set(sx, 0, sz);
    this.scene.add(group);

    // 难度缩放
    const hpScale = 1 + this.dayNum * 0.15;
    const hp = cfg.hp * hpScale;
    this.enemies.push({
      group, mesh, healthBar: bg, healthFill: fg,
      hp, maxHp: hp, speed: cfg.speed, damage: cfg.reward / 10 + this.dayNum,
      reward: cfg.reward, alive: true
    });
  }

  updateTowers(dt) {
    for (const tower of this.towers) {
      tower.fireTimer -= dt;
      // 寻找目标
      let target = null;
      let closestDist = tower.range + 1;
      for (const e of this.enemies) {
        const dx = e.group.position.x - tower.group.position.x;
        const dz = e.group.position.z - tower.group.position.z;
        const d = Math.hypot(dx, dz);
        if (d < closestDist) { closestDist = d; target = e; }
      }
      if (target && tower.fireTimer <= 0) {
        tower.fireTimer = 1 / tower.fireRate;
        // 发射激光束
        const beamColor = tower.config.color;
        this.createTemporaryLaser(
          tower.group.position.x, tower.group.position.y + 1, tower.group.position.z,
          target.group.position.x, target.group.position.y + 0.5, target.group.position.z,
          beamColor,
          0.15
        );
        target.hp -= tower.damage;
        // 冰塔减速
        if (tower.type === 'ice') {
          target.speed = Math.max(0.3, target.speed * 0.85);
        }
        // 塔身抖动
        tower.top.scale.set(1.15, 1.15, 1.15);
        setTimeout(() => {
          const s = 1 + (tower.level - 1) * 0.15;
          tower.top.scale.set(s, s, s);
        }, 80);

        if (target.hp <= 0) {
          target.alive = false;
          this.kills++;
          this.coins += target.reward;
          this.updateHUD();
        }
      }
    }
  }

  // ========== 激光束 ==========
  createTemporaryLaser(x1, y1, z1, x2, y2, z2, color, duration) {
    const from = new THREE.Vector3(x1, y1, z1);
    const to = new THREE.Vector3(x2, y2, z2);
    const dir = to.clone().sub(from);
    const length = dir.length();
    const geo = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const beam = new THREE.Mesh(geo, mat);

    // 定位
    beam.position.copy(from.clone().add(to).multiplyScalar(0.5));
    beam.lookAt(to);
    beam.rotateX(Math.PI / 2);
    this.scene.add(beam);
    this.lasers.push({ mesh: beam, ttl: duration, mat });
  }

  createLaserBeam(fromPos, toPos, color) {
    const from = fromPos.clone();
    const to = toPos.clone();
    from.y += 0.5;
    const dir = to.clone().sub(from);
    const length = dir.length() + 0.01;
    const geo = new THREE.CylinderGeometry(0.04, 0.04, length, 6);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const beam = new THREE.Mesh(geo, mat);
    beam.position.copy(from.clone().add(to).multiplyScalar(0.5));
    beam.lookAt(to);
    beam.rotateX(Math.PI / 2);
    this.scene.add(beam);
    return beam;
  }

  removeLaserBeam(beam) {
    this.scene.remove(beam);
    beam.geometry.dispose();
    beam.material.dispose();
  }

  updateLasers(dt) {
    for (const l of this.lasers) {
      l.ttl -= dt;
      l.mat.opacity = Math.max(0, l.ttl / 0.15) * 0.9;
    }
    this.lasers = this.lasers.filter(l => {
      if (l.ttl <= 0) {
        this.scene.remove(l.mesh);
        l.mesh.geometry.dispose();
        l.mesh.material.dispose();
        return false;
      }
      return true;
    });
  }

  // ========== 相机 ==========
  updateCamera() {
    // 用球坐标（水平角度+俯仰角+距离）计算相机位置
    // 缩放时只改变 camDist，方向（angle/pitch）保持不变
    const horizontal = this.camDist * Math.cos(this.camPitch);
    const x = this.camTarget.x + Math.cos(this.camAngle) * horizontal;
    const z = this.camTarget.z + Math.sin(this.camAngle) * horizontal;
    const y = this.camTarget.y + this.camDist * Math.sin(this.camPitch);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.camTarget);
  }

  // ========== 输入 ==========
  setupInput() {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => this.onMouseDown(e));
    dom.addEventListener('mousemove', (e) => this.onMouseMove(e));
    dom.addEventListener('mouseup', (e) => this.onMouseUp(e));
    dom.addEventListener('wheel', (e) => { e.preventDefault(); this.onWheel(e); }, { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    // 触摸支持
    dom.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.onMouseDown({ clientX: t.clientX, clientY: t.clientY, button: 0 });
      }
    });
    dom.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.onMouseMove({ clientX: t.clientX, clientY: t.clientY, button: 0 });
      }
    });
    dom.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onMouseUp({ clientX: 0, clientY: 0, button: 0 });
    });
  }

  onMouseDown(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 右键 -> 平移地图
    if (e.button === 2) {
      this.isPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      return;
    }

    // 中键 -> 旋转视角
    if (e.button === 1) {
      this.isRotating = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      return;
    }

    // 左键
    this.isPressing = true;
    this.pressStartX = e.clientX;
    this.pressStartY = e.clientY;
    this.pressStartTime = performance.now();
    this.longPressMoved = false;
    this.pressMoved = false;
    this.pressedEntity = null;

    // 建造模式：立即放置
    if (this.buildMode && ['arrow','cannon','ice','lightning','wall','worker'].includes(this.buildMode)) {
      const intersects = this.raycaster.intersectObjects(this.markers, false);
      if (intersects.length > 0) {
        const m = intersects[0].object;
        const ud = m.userData;
        if (this.buildMode === 'wall') this.buildWall(ud.worldX, ud.worldZ);
        else if (this.buildMode === 'worker') this.buildWorker(ud.worldX, ud.worldZ);
        else this.buildTower(this.buildMode, ud.worldX, ud.worldZ);
        this.updateHUD();
        this.isPressing = false;
        return;
      }
      this.isPressing = false;
      return;
    }

    // 检查点到了什么（基地 / 塔 / 工人 / 墙）
    const entity = this.pickEntity();
    if (entity) {
      this.pressedEntity = entity;
      // 工人：启动长按定时器（320ms 后无条件进入拖拽模式）
      if (entity.kind === 'worker') {
        this._longPressTimer = setTimeout(() => {
          if (this.isPressing && this.pressedEntity && this.pressedEntity.kind === 'worker') {
            this.isDragging = true;
          }
        }, this.longPressMs);
      }
    }
  }

  onMouseMove(e) {
    // 更新鼠标和射线（拖拽工人时也要用最新的鼠标位置）
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 右键平移
    if (this.isPanning) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      const camAng = this.camAngle;
      const rx = Math.sin(camAng), rz = -Math.cos(camAng);
      const fx = -Math.cos(camAng), fz = -Math.sin(camAng);
      const panFactor = this.camDist * 0.004;
      this.camTarget.x += (-rx * dx + fx * dy) * panFactor;
      this.camTarget.z += (-rz * dx + fz * dy) * panFactor;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateCamera();
      return;
    }

    // 中键旋转
    if (this.isRotating) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.camAngle += dx * 0.008;
      this.camPitch += dy * 0.006;
      if (this.camPitch < 0.15) this.camPitch = 0.15;
      if (this.camPitch > 1.3) this.camPitch = 1.3;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateCamera();
      return;
    }

    // 拖拽工人：进入拖拽模式后，计算弧线目标
    if (this.isDragging && this.pressedEntity && this.pressedEntity.kind === 'worker') {
      const groundHit = this.raycaster.intersectObjects(this.groundMeshes, false);
      const resHit = this.raycaster.intersectObjects(this.resources.map(r => r.mesh), true);
      let target = null;
      if (resHit.length > 0) {
        const g = findAncestorGroup(resHit[0].object, this.resources.map(r => r.mesh));
        target = this.resources.find(r => r.mesh === g);
      }
      if (target) {
        this.dragTarget = { wx: target.wx, wz: target.wz, isResource: true, resource: target };
      } else if (groundHit.length > 0) {
        const pt = groundHit[0].point;
        this.dragTarget = { wx: pt.x, wz: pt.z, isResource: false };
      }
      this.updateDragArc();
      return;
    }

    // 按下工人后移动鼠标 → 立即进入拖拽模式（不需要等 320ms）
    if (this.isPressing && this.pressedEntity && this.pressedEntity.kind === 'worker') {
      const moved = Math.abs(e.clientX - this.pressStartX) + Math.abs(e.clientY - this.pressStartY);
      if (moved > 6) {
        this.isDragging = true;
        this.pressMoved = true;  // 同时标记移动过，避免 mouseup 触发短按
        // 立即计算一次拖拽弧线
        const groundHit = this.raycaster.intersectObjects(this.groundMeshes, false);
        const resHit = this.raycaster.intersectObjects(this.resources.map(r => r.mesh), true);
        let target = null;
        if (resHit.length > 0) {
          const g = findAncestorGroup(resHit[0].object, this.resources.map(r => r.mesh));
          target = this.resources.find(r => r.mesh === g);
        }
        if (target) {
          this.dragTarget = { wx: target.wx, wz: target.wz, isResource: true, resource: target };
        } else if (groundHit.length > 0) {
          const pt = groundHit[0].point;
          this.dragTarget = { wx: pt.x, wz: pt.z, isResource: false };
        }
        this.updateDragArc();
        return;
      }
    }

    // 长按期间：记录是否移动（取消短按用，不影响拖拽）
    if (this.isPressing && this.pressedEntity) {
      const moved = Math.abs(e.clientX - this.pressStartX) + Math.abs(e.clientY - this.pressStartY);
      if (moved > 8) this.pressMoved = true;
    }
  }

  onMouseUp(e) {
    // 清除长按定时器
    if (this._longPressTimer) { clearTimeout(this._longPressTimer); this._longPressTimer = null; }

    this.isPanning = false;
    this.isRotating = false;

    if (!this.isPressing) return;
    this.isPressing = false;

    // 拖拽状态：释放工人 → 开始采集/移动
    if (this.isDragging) {
      this.isDragging = false;
      this.dragArcPoints = [];
      if (this.pressedEntity && this.pressedEntity.kind === 'worker' && this.dragTarget) {
        const worker = this.pressedEntity.entity;
        worker.target = { ...this.dragTarget };
        worker.state = 'moving';
      }
      this.pressedEntity = null;
      this.dragTarget = null;
      return;
    }

    // 如果长按期间移动了，不触发短按（但仍然释放拖拽）
    if (this.pressMoved) {
      this.pressMoved = false;
      this.pressedEntity = null;
      return;
    }

    // 短按 = 显示实体信息面板
    const entity = this.pickEntity();
    if (entity) {
      this.showEntityPanel(entity);
    } else {
      this.hideEntityPanel();
    }
    this.pressedEntity = null;
  }

  // 从射线检测中判断点到了什么实体（工人优先，避免被塔/基地挡住）
  pickEntity() {
    // 工人（优先）
    for (const w of this.workers) {
      const hits = this.raycaster.intersectObjects([w.group], true);
      if (hits.length > 0) {
        return {
          kind: 'worker', name: '工人', icon: '◈',
          entity: w,
          stats: [
            { label: '状态', value: w.state === 'idle' ? '空闲' : w.state === 'gathering' ? '采集中' : '移动中' }
          ],
          actions: [
            { label: '长按拖拽采集', disabled: true }
          ]
        };
      }
    }
    // 基地
    if (this.baseGroup) {
      const hits = this.raycaster.intersectObjects([this.baseGroup], true);
      if (hits.length > 0) {
        return { kind: 'base', name: '基地', icon: '🏰',
          stats: [
            { label: '血量', value: `${Math.floor(this.baseHp)} / ${this.baseMaxHp}` },
            { label: '状态', value: this.baseHp > 0 ? '正常' : '沦陷' }
          ],
          actions: []
        };
      }
    }
    // 塔
    for (const t of this.towers) {
      const hits = this.raycaster.intersectObjects([t.group], true);
      if (hits.length > 0) {
        const cfg = t.config;
        const upgCost = t.level < t.maxLevel ? cfg.upgradeCosts[t.level] : null;
        return {
          kind: 'tower', name: cfg.name, icon: cfg.icon || '△',
          entity: t,
          stats: [
            { label: '等级', value: `${t.level} / ${t.maxLevel}` },
            { label: '伤害', value: Math.floor(t.damage) },
            { label: '射程', value: t.range.toFixed(1) },
            { label: '攻速', value: t.fireRate.toFixed(1) + '/s' }
          ],
          actions: upgCost !== null ? [
            { label: `升级 (💰${upgCost})`, action: () => this.upgradeTower(t) }
          ] : [{ label: '已满级', disabled: true }]
        };
      }
    }
    // 墙
    for (const wall of this.walls) {
      const hits = this.raycaster.intersectObjects([wall.mesh], false);
      if (hits.length > 0) {
        const lvl = wall.level || 1;
        const upgCost = lvl < 3 ? 40 + lvl * 20 : null;
        return {
          kind: 'wall', name: '围墙', icon: '▣',
          entity: wall,
          stats: [
            { label: '血量', value: `${Math.floor(wall.hp)} / ${wall.maxHp}` },
            { label: '等级', value: lvl }
          ],
          actions: upgCost !== null ? [
            { label: `升级 (💰${upgCost})`, action: () => this.upgradeWall(wall) }
          ] : [{ label: '已满级', disabled: true }]
        };
      }
    }
    return null;
  }

  showEntityPanel(entity) {
    const panel = document.getElementById('entity-info-panel');
    if (!panel) return;
    document.getElementById('eip-icon').textContent = entity.icon;
    document.getElementById('eip-name').textContent = entity.name;
    const statsEl = document.getElementById('eip-stats');
    statsEl.innerHTML = entity.stats.map(s =>
      `<div class="eip-stat-row"><span>${s.label}</span><span>${s.value}</span></div>`
    ).join('');
    const actionsEl = document.getElementById('eip-actions');
    actionsEl.innerHTML = '';
    for (const a of entity.actions) {
      const btn = document.createElement('button');
      btn.className = 'eip-btn' + (a.disabled ? ' disabled' : '');
      btn.textContent = a.label;
      if (!a.disabled) btn.onclick = () => { a.action(); this.hideEntityPanel(); };
      actionsEl.appendChild(btn);
    }
    panel.classList.remove('hidden');
  }

  hideEntityPanel() {
    const panel = document.getElementById('entity-info-panel');
    if (panel) panel.classList.add('hidden');
  }

  screenToWorld(clientX, clientY) {
    const mx = (clientX / window.innerWidth) * 2 - 1;
    const my = -(clientY / window.innerHeight) * 2 + 1;
    const r = new THREE.Raycaster();
    r.setFromCamera(new THREE.Vector2(mx, my), this.camera);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pt = new THREE.Vector3();
    r.ray.intersectPlane(groundPlane, pt);
    return pt;
  }

  updateDragArc() {
    if (!this.pressedEntity || !this.dragTarget) { this.dragArcPoints = []; return; }
    const worker = this.pressedEntity.entity;
    if (!worker) { this.dragArcPoints = []; return; }
    const sx = worker.group.position.x;
    const sz = worker.group.position.z;
    const tx = this.dragTarget.wx;
    const tz = this.dragTarget.wz;
    const dist = Math.sqrt((tx - sx) ** 2 + (tz - sz) ** 2);
    const steps = Math.max(20, Math.floor(dist * 6));  // 足够密的点，配合虚线视觉
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = sx + (tx - sx) * t;
      const z = sz + (tz - sz) * t;
      const arcH = Math.sin(t * Math.PI) * Math.min(Math.max(dist * 0.45, 1), 4);  // 抛物线弧高
      pts.push(new THREE.Vector3(x, arcH + 0.5, z));
    }
    this.dragArcPoints = pts;
  }

  onWheel(e) {
    // 滚轮只缩放相机距离（向上滚=拉近；向下滚=拉远）
    const scale = Math.pow(0.92, -e.deltaY / 100);
    this.camDist = Math.max(8, Math.min(55, this.camDist * scale));
    this.updateCamera();
  }

  // ========== 外部接口 ==========
  // 开始拖拽放置（用于从底部按钮长按后调用）
  startDragBuild(type) {
    this._dragBuildMode = type;
    // 显示所有可建造标记
    for (const m of this.markers) m.visible = true;
    // 创建幽灵预览
    this._makeBuildGhost(type);
    // 创建当前位置高亮圈
    if (!this._dragHighlight) {
      const hGeo = new THREE.RingGeometry(CELL_SIZE * 0.45, CELL_SIZE * 0.5, 24);
      const hMat = new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      this._dragHighlight = new THREE.Mesh(hGeo, hMat);
      this._dragHighlight.rotation.x = -Math.PI / 2;
      this._dragHighlight.position.y = 0.1;
      this._dragHighlight.visible = false;
      this.scene.add(this._dragHighlight);
    }
  }

  // 结束拖拽放置（在当前鼠标位置尝试放置；若无坐标则只清理）
  endDragBuild(clientX, clientY) {
    let placed = false;
    if (this._dragBuildMode && clientX != null && clientY != null) {
      // 用射线找位置
      const prevMouse = this.mouse.clone();
      this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.markers, false);
      if (intersects.length > 0) {
        const ud = intersects[0].object.userData;
        const type = this._dragBuildMode;
        if (type === 'wall') placed = this.buildWall(ud.worldX, ud.worldZ);
        else if (type === 'worker') placed = this.buildWorker(ud.worldX, ud.worldZ);
        else placed = this.buildTower(type, ud.worldX, ud.worldZ);
      }
      this.mouse.copy(prevMouse);
    }
    this._cleanupDragBuild();
    if (placed) this.updateHUD();
    return placed;
  }

  // 每帧更新拖拽预览位置
  updateDragBuild(clientX, clientY) {
    if (!this._dragBuildMode) return;
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.markers, false);
    let targetCell = null;
    if (intersects.length > 0) {
      const ud = intersects[0].object.userData;
      targetCell = { wx: ud.worldX, wz: ud.worldZ };
    }
    // 如果有幽灵，移动到当前鼠标位置（若在格子上则贴格子）
    if (this._dragBuildGhost) {
      if (targetCell) {
        this._dragBuildGhost.position.set(targetCell.wx, 0, targetCell.wz);
        this._dragBuildGhost.visible = true;
      } else {
        // 贴着地面显示
        const groundHits = this.raycaster.intersectObjects(this.groundMeshes, false);
        if (groundHits.length > 0) {
          const p = groundHits[0].point;
          this._dragBuildGhost.position.set(p.x, 0, p.z);
          this._dragBuildGhost.visible = true;
        } else {
          this._dragBuildGhost.visible = false;
        }
      }
    }
    // 高亮当前格：绿色=可放置，红色=不可放置
    if (this._dragHighlight) {
      if (targetCell) {
        this._dragHighlight.visible = true;
        this._dragHighlight.position.set(targetCell.wx, 0.1, targetCell.wz);
        this._dragHighlight.material.color.setHex(0x66ff88);
        this._dragIsValid = true;
      } else {
        this._dragHighlight.visible = true;
        // 贴鼠标位置显示红圈
        const groundHits = this.raycaster.intersectObjects(this.groundMeshes, false);
        if (groundHits.length > 0) {
          const p = groundHits[0].point;
          this._dragHighlight.position.set(p.x, 0.1, p.z);
        }
        this._dragHighlight.material.color.setHex(0xff5566);
        this._dragIsValid = false;
      }
    }
  }

  // 取消/清理拖拽放置
  cancelDragBuild() {
    this._cleanupDragBuild();
  }

  _cleanupDragBuild() {
    this._dragBuildMode = null;
    if (this._dragBuildGhost) {
      this.scene.remove(this._dragBuildGhost);
      this._dragBuildGhost.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      this._dragBuildGhost = null;
    }
    if (this._dragHighlight) {
      this.scene.remove(this._dragHighlight);
      this._dragHighlight.geometry.dispose();
      this._dragHighlight.material.dispose();
      this._dragHighlight = null;
    }
    this._dragIsValid = false;
    // 隐藏所有可建造标记
    for (const m of this.markers) m.visible = false;
  }

  _makeBuildGhost(type) {
    const group = new THREE.Group();
    if (type === 'wall') {
      const g = new THREE.BoxGeometry(CELL_SIZE * 0.95, 0.8, CELL_SIZE * 0.95);
      const m = new THREE.MeshBasicMaterial({ color: 0x887755, transparent: true, opacity: 0.55, wireframe: false });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.y = 0.4;
      group.add(mesh);
    } else if (type === 'worker') {
      const g = new THREE.OctahedronGeometry(0.45);
      const m = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.55 });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.y = 0.5;
      group.add(mesh);
    } else {
      const cfg = TOWER_CONFIGS[type] || { color: 0xffffff };
      // 基座
      const bg = new THREE.BoxGeometry(CELL_SIZE * 0.8, 0.3, CELL_SIZE * 0.8);
      const bm = new THREE.MeshBasicMaterial({ color: 0x444466, transparent: true, opacity: 0.55 });
      const base = new THREE.Mesh(bg, bm);
      base.position.y = 0.15;
      group.add(base);
      // 顶部
      let topGeo;
      if (type === 'arrow') topGeo = new THREE.ConeGeometry(0.35, 1.0, 6);
      else if (type === 'cannon') topGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
      else if (type === 'ice') topGeo = new THREE.OctahedronGeometry(0.5);
      else topGeo = new THREE.DodecahedronGeometry(0.5);
      const tm = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.55 });
      const top = new THREE.Mesh(topGeo, tm);
      top.position.y = 0.8;
      group.add(top);
    }
    group.visible = false;
    this.scene.add(group);
    this._dragBuildGhost = group;
  }

  setBuildMode(mode) {
    this.buildMode = mode;
    // 显示/隐藏建造标记
    for (const m of this.markers) {
      m.visible = (mode === 'arrow' || mode === 'cannon' || mode === 'ice' ||
                    mode === 'lightning' || mode === 'wall' || mode === 'worker');
    }
    // 取消所有塔选中的范围圈显示
    for (const t of this.towers) t.ring.visible = false;
    this.selectedTower = null;
  }

  updateHUD() {
    if (this.onHUDUpdate) {
      this.onHUDUpdate({
        wood: Math.floor(this.wood),
        stone: Math.floor(this.stone),
        coins: Math.floor(this.coins),
        isNight: this.isNight,
        dayNum: this.dayNum,
        hp: Math.floor(this.baseHp),
        maxHp: this.baseMaxHp
      });
    }
  }
}

// 辅助：找到上级 group
function findAncestorGroup(obj, candidates) {
  let cur = obj;
  while (cur) {
    if (candidates.includes(cur)) return cur;
    cur = cur.parent;
  }
  return obj;
}

// 平滑角度插值
function smoothAngle(current, target, t) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(1, t);
}
