// 无尽生存模式 - 2D 塔防
// 网格地图 | 战争迷雾 | 多塔类型 | 升级系统 | 怪物同步关卡模式

const TILE = 40;
const WORLD_W = 256;
const WORLD_H = 256;
const BASE_X = 128;
const BASE_Y = 128;
const BASE_RADIUS = 4;

// 地形
const GRASS = 0;
const TREE = 1;
const ROCK = 2;
const WATER = 3;
const GOLD = 4;

// 迷雾
const FOG_HIDDEN = 0;   // 从未探索
const FOG_VISIBLE = 2;  // 当前可见
const FOG_EXPLORED = 1; // 已探索但当前不可见

// 资源属性
const RES_INFO = {
  [TREE]: { name: 'tree', hp: 40, reward: 5, color: '#3a8a3a', colorNight: '#1a3a1a' },
  [ROCK]: { name: 'rock', hp: 70, reward: 4, color: '#8a8a8a', colorNight: '#4a4a4a' },
  [GOLD]: { name: 'gold', hp: 55, reward: 8, color: '#ffd700', colorNight: '#8a6a00' }
};

// 昼夜(秒)
const DAY_LEN = 75;
const NIGHT_LEN = 35;

// 激光参数
const LASER_RANGE = TILE * 1.2;
const LASER_DPS = 22;

// ===== 塔类型（与关卡模式同步） =====
const TOWER_TYPES = {
  arrow: {
    name: '箭塔', type: 'arrow', sides: 3, color: '#00f0ff', colorNight: '#005566',
    range: 2.5, damage: 25, fireRate: 1.0, costWood: 30, costStone: 10,
    upgradeCosts: [0, 60, 120], upgradeDamage: [25, 35, 50], upgradeRange: [2.5, 2.7, 3.0]
  },
  cannon: {
    name: '炮塔', type: 'cannon', sides: 4, color: '#ff3333', colorNight: '#661111',
    range: 2.0, damage: 60, fireRate: 0.5, costWood: 50, costStone: 25,
    upgradeCosts: [0, 100, 200], upgradeDamage: [60, 90, 130], upgradeRange: [2.0, 2.2, 2.5]
  },
  ice: {
    name: '冰塔', type: 'ice', sides: 6, color: '#66ccff', colorNight: '#224466',
    range: 2.2, damage: 15, fireRate: 1.2, costWood: 40, costStone: 15,
    upgradeCosts: [0, 80, 150], upgradeDamage: [15, 22, 32], upgradeRange: [2.2, 2.5, 2.8]
  },
  lightning: {
    name: '雷塔', type: 'lightning', sides: 5, color: '#ffff00', colorNight: '#666600',
    range: 3.0, damage: 40, fireRate: 0.8, costWood: 60, costStone: 40,
    upgradeCosts: [0, 130, 250], upgradeDamage: [40, 60, 85], upgradeRange: [3.0, 3.3, 3.8]
  }
};

// ===== 怪物配置（同步关卡模式 Enemy.js） =====
const ENEMY_TYPES = [
  { type: 'smallCube', name: '小方块', sides: 4, color: '#00ff88', hp: 100, speed: 40, damage: 5, reward: 10, tier: 1 },
  { type: 'pyramid', name: '棱锥怪', sides: 3, color: '#ff6600', hp: 200, speed: 32, damage: 8, reward: 20, tier: 2 },
  { type: 'cylinder', name: '圆柱兽', sides: 6, color: '#ff2d95', hp: 350, speed: 28, damage: 12, reward: 30, tier: 3 },
  { type: 'sphere', name: '球体王', sides: 0, color: '#b44dff', hp: 600, speed: 22, damage: 18, reward: 50, tier: 4 },
  { type: 'boss', name: '星形Boss', sides: 5, color: '#ffd700', hp: 1500, speed: 16, damage: 30, reward: 100, tier: 5, isStar: true }
];

// ===== 噪音函数 =====
function noise2D(x, y) {
  let n = Math.sin(x * 14.319 + y * 52.117) * 49321.723;
  n += Math.sin(x * 37.291 + y * 19.487) * 28741.551;
  n += Math.sin(x * 67.883 + y * 43.911) * 19531.229;
  return (n - Math.floor(n) + 1) % 1;
}

function getTerrain(x, y) {
  const dx = x - BASE_X, dy = y - BASE_Y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < BASE_RADIUS + 1) return GRASS;
  const n = noise2D(x * 0.7, y * 0.7);
  const n2 = noise2D(x * 1.3 + 5, y * 1.3 + 5);
  if (dist < BASE_RADIUS + 3) {
    if (n < 0.12) return TREE;
    if (n < 0.18) return ROCK;
    return GRASS;
  }
  if (n2 < 0.04) return WATER;
  if (n < 0.08) return GOLD;
  if (n < 0.22) return ROCK;
  if (n < 0.42) return TREE;
  return GRASS;
}

// ===== 多边形绘制工具 =====
function drawPolygon(ctx, cx, cy, radius, sides, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i * Math.PI * 2) / sides;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawDiamond(ctx, cx, cy, rx, ry, rotation = 0) {
  ctx.beginPath();
  const pts = [[0, -ry], [rx, 0], [0, ry], [-rx, 0]];
  for (let i = 0; i < 4; i++) {
    const c = Math.cos(rotation), s = Math.sin(rotation);
    const x = cx + pts[i][0] * c - pts[i][1] * s;
    const y = cy + pts[i][0] * s + pts[i][1] * c;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawStar(ctx, cx, cy, outerR, innerR, points, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = rotation + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// 绘制程序化纹理围墙
function drawWallTexture(ctx, cx, cy, size, night) {
  const h = size * 0.8;
  // 主体
  ctx.fillStyle = night ? '#4a4a3a' : '#8a8a6a';
  drawPolygon(ctx, cx, cy, h * 0.5, 4, Math.PI / 4);
  ctx.fill();
  // 十字纹理
  ctx.strokeStyle = night ? '#2a2a1a' : '#5a5a3a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - h * 0.35, cy - h * 0.35);
  ctx.lineTo(cx + h * 0.35, cy + h * 0.35);
  ctx.moveTo(cx + h * 0.35, cy - h * 0.35);
  ctx.lineTo(cx - h * 0.35, cy + h * 0.35);
  ctx.stroke();
  // 边框
  ctx.strokeStyle = night ? '#3a3a2a' : '#6a6a4a';
  ctx.lineWidth = 2;
  drawPolygon(ctx, cx, cy, h * 0.5, 4, Math.PI / 4);
  ctx.stroke();
  // 小砖块纹理
  ctx.fillStyle = night ? '#3a3a2a' : '#6a6a4a';
  ctx.fillRect(cx - 3, cy - h * 0.15, 6, 6);
  ctx.fillRect(cx - 3, cy + h * 0.05, 6, 6);
}

export class EndlessGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.towers = [];
    this.walls = [];
    this.workers = [];
    this.enemies = [];
    this.projectiles = [];

    this.baseHP = 100;
    this.baseMaxHP = 100;
    this.baseRadius = BASE_RADIUS;

    this.wood = 50;
    this.stone = 30;
    this.coins = 100;

    this.dayTime = 0;
    this.dayNum = 1;
    this.isNight = false;
    this.nightSpawnTimer = 0;
    this.enemiesThisNight = 0;
    this.maxEnemiesPerNight = 4;
    this.kills = 0;

    this.camX = BASE_X * TILE - 400;
    this.camY = BASE_Y * TILE - 240;
    this.zoom = 1;
    this.targetZoom = 1;

    this.dragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragCamX = 0;
    this.dragCamY = 0;
    this.dragUnit = null;
    this.dragUnitLine = null;

    this.buildMode = null;  // 'arrow'|'cannon'|'ice'|'lightning'|'wall'|'worker'|'upgrade'
    this.hoverCell = null;
    this.selectedUnit = null;

    this.resourceCache = new Map();

    // 战争迷雾: key(tx,ty) -> FOG_HIDDEN|FOG_EXPLORED|FOG_VISIBLE
    this.fogMap = new Map();
    // 初始基地周围可见
    this.revealArea(BASE_X, BASE_Y, BASE_RADIUS + 2);

    this.running = false;
    this.paused = false;

    this.resize();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);

    this.lastTime = 0;
    this.animId = null;
  }

  revealArea(cx, cy, radius) {
    for (let tx = Math.floor(cx - radius); tx <= Math.ceil(cx + radius); tx++) {
      for (let ty = Math.floor(cy - radius); ty <= Math.ceil(cy + radius); ty++) {
        const dx = tx - cx, dy = ty - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          this.fogMap.set(`${tx},${ty}`, FOG_EXPLORED);
        }
      }
    }
  }

  updateFog() {
    // 重置 visible -> explored
    for (const [k, v] of this.fogMap) {
      if (v === FOG_VISIBLE) this.fogMap.set(k, FOG_EXPLORED);
    }
    // 从所有己方单位更新可见度
    const revealTile = (wx, wy, r) => {
      const cx = Math.floor(wx / TILE);
      const cy = Math.floor(wy / TILE);
      for (let tx = cx - r; tx <= cx + r; tx++) {
        for (let ty = cy - r; ty <= cy + r; ty++) {
          const dx = tx - cx, dy = ty - cy;
          if (dx * dx + dy * dy <= r * r) {
            this.fogMap.set(`${tx},${ty}`, FOG_VISIBLE);
          }
        }
      }
    };

    revealTile(BASE_X, BASE_Y, BASE_RADIUS + 2);
    for (const t of this.towers) revealTile(t.x, t.y, Math.ceil(t.range) + 1);
    for (const w of this.workers) revealTile(w.x, w.y, 3);
  }

  // ===== 生命周期 =====
  start() {
    this.towers = [];
    this.walls = [];
    this.workers = [];
    this.enemies = [];
    this.projectiles = [];
    this.baseHP = this.baseMaxHP;
    this.baseRadius = BASE_RADIUS;
    this.wood = 50;
    this.stone = 30;
    this.coins = 100;
    this.dayTime = 0;
    this.dayNum = 1;
    this.isNight = false;
    this.nightSpawnTimer = 0;
    this.enemiesThisNight = 0;
    this.maxEnemiesPerNight = 4;
    this.kills = 0;
    this.camX = BASE_X * TILE - this.canvas.width / 2;
    this.camY = BASE_Y * TILE - this.canvas.height / 2;
    this.zoom = 1;
    this.targetZoom = 1;
    this.buildMode = null;
    this.selectedUnit = null;
    this.dragUnit = null;
    this.dragUnitLine = null;
    this.resourceCache.clear();
    this.fogMap.clear();
    this.revealArea(BASE_X, BASE_Y, BASE_RADIUS + 2);
    this.running = true;
    this.lastTime = performance.now();
    this.updateHUD();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
  }

  cleanup() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
  }

  resize() {
    this.canvas.width = this.canvas.clientWidth * devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * devicePixelRatio;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  loop() {
    if (!this.running) return;
    this.animId = requestAnimationFrame(() => this.loop());
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.2) dt = 0.2;
    if (this.paused) dt = 0;
    this.update(dt);
    this.render();
  }

  // ===== 更新 =====
  update(dt) {
    this.dayTime += dt;
    const cycleLen = this.isNight ? NIGHT_LEN : DAY_LEN;
    if (this.dayTime >= cycleLen) {
      this.dayTime -= cycleLen;
      this.isNight = !this.isNight;
      if (this.isNight) {
        this.enemiesThisNight = 0;
        this.nightSpawnTimer = 0;
        this.maxEnemiesPerNight = 4 + this.dayNum * 2;
      } else {
        this.dayNum++;
        this.coins += 20 + this.dayNum * 5;
      }
      this.updateHUD();
    }

    if (this.isNight && this.running) {
      this.nightSpawnTimer += dt;
      const interval = Math.max(0.4, 1.5 - this.dayNum * 0.05);
      if (this.nightSpawnTimer >= interval && this.enemiesThisNight < this.maxEnemiesPerNight) {
        this.nightSpawnTimer = 0;
        this.spawnEnemy();
        this.enemiesThisNight++;
      }
    }

    for (const w of this.workers) this.updateWorker(w, dt);
    for (const e of this.enemies) this.updateEnemy(e, dt);
    for (const t of this.towers) this.updateTower(t, dt);

    for (const res of this.resourceCache.values()) {
      if (res.shakeT > 0) res.shakeT -= dt;
    }

    this.workers = this.workers.filter(w => w.alive);
    this.enemies = this.enemies.filter(e => e.alive);
    this.towers = this.towers.filter(t => t.alive);
    this.walls = this.walls.filter(w => w.alive);

    for (const e of this.enemies) {
      const dx = e.x - BASE_X * TILE;
      const dy = e.y - BASE_Y * TILE;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < TILE * 1.5) {
        this.baseHP -= e.damage * dt;
        e.alive = false;
        if (this.baseHP <= 0) { this.baseHP = 0; this.gameOver(); return; }
      }
    }

    this.zoom += (this.targetZoom - this.zoom) * 5 * dt;
    this.updateFog();
    this.updateHUD();
  }

  updateWorker(w, dt) {
    if (w.targetResource) {
      const cached = this.resourceCache.get(w.targetResource.key);
      if (!cached || cached.hp <= 0) {
        w.targetResource = null;
        w.targetX = BASE_X * TILE + (Math.random() - 0.5) * TILE * 2;
        w.targetY = BASE_Y * TILE + (Math.random() - 0.5) * TILE * 2;
      } else {
        const dx = cached.x - w.x, dy = cached.y - w.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > LASER_RANGE) {
          w.x += (dx / dist) * 80 * dt;
          w.y += (dy / dist) * 80 * dt;
        } else {
          cached.hp -= LASER_DPS * dt;
          cached.shakeT = 0.15;
          if (cached.hp <= 0) {
            if (cached.type === TREE) this.wood += RES_INFO[TREE].reward;
            else if (cached.type === ROCK) this.stone += RES_INFO[ROCK].reward;
            else if (cached.type === GOLD) this.coins += RES_INFO[GOLD].reward;
            this.resourceCache.delete(cached.key);
            w.targetResource = null;
            w.targetX = BASE_X * TILE + (Math.random() - 0.5) * TILE * 2;
            w.targetY = BASE_Y * TILE + (Math.random() - 0.5) * TILE * 2;
          }
        }
        return;
      }
    }
    const dx = w.targetX - w.x, dy = w.targetY - w.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) { w.targetX = w.x; w.targetY = w.y; return; }
    const speed = 80;
    w.x += (dx / dist) * speed * dt;
    w.y += (dy / dist) * speed * dt;
  }

  updateEnemy(e, dt) {
    const dx = BASE_X * TILE - e.x, dy = BASE_Y * TILE - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;
    let blocked = false;
    for (const wall of this.walls) {
      const wdx = e.x - wall.x, wdy = e.y - wall.y;
      if (Math.sqrt(wdx * wdx + wdy * wdy) < TILE * 0.8) {
        wall.hp -= e.damage * dt * 2;
        blocked = true;
        if (wall.hp <= 0) wall.alive = false;
      }
    }
    if (blocked) return;
    e.x += (dx / dist) * e.speed * dt;
    e.y += (dy / dist) * e.speed * dt;
    // 减速恢复
    if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      if (e.slowTimer <= 0) e.speed = e.baseSpeed;
    }
  }

  updateTower(t, dt) {
    t.fireTimer -= dt;
    if (t.fireTimer > 0) return;
    let closest = null, closestDist = t.range * TILE;
    for (const e of this.enemies) {
      const dx = t.x - e.x, dy = t.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) { closestDist = dist; closest = e; }
    }
    if (!closest) return;
    t.fireTimer = t.fireRate;
    closest.hp -= t.damage;
    t.beamTarget = closest;
    t.beamT = 0.12;
    // 冰塔减速
    if (t.type === 'ice') {
      closest.slowTimer = 1.0;
      closest.speed = closest.baseSpeed * 0.5;
    }
    if (closest.hp <= 0) {
      closest.alive = false;
      this.kills++;
      this.coins += closest.reward;
    }
  }

  spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 400 + Math.random() * 200;
    const x = BASE_X * TILE + Math.cos(angle) * spawnDist;
    const y = BASE_Y * TILE + Math.sin(angle) * spawnDist;

    // 根据天数选择怪物类型（同步关卡模式）
    let idx = 0;
    if (this.dayNum >= 15) idx = 4;      // boss
    else if (this.dayNum >= 10) idx = 3; // sphere
    else if (this.dayNum >= 6) idx = 2;  // cylinder
    else if (this.dayNum >= 3) idx = 1;  // pyramid
    // 有小概率出高级怪
    if (Math.random() < 0.15 && idx < 4) idx = Math.min(idx + 1, 4);

    const cfg = ENEMY_TYPES[idx];
    const hpScale = 1 + this.dayNum * 0.15;
    this.enemies.push({
      x, y,
      hp: Math.floor(cfg.hp * hpScale),
      maxHp: Math.floor(cfg.hp * hpScale),
      damage: cfg.damage + Math.floor(this.dayNum * 0.5),
      speed: cfg.speed,
      baseSpeed: cfg.speed,
      reward: cfg.reward + this.dayNum,
      alive: true,
      enemyType: cfg,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 1.5,
      slowTimer: 0
    });
  }

  gameOver() {
    this.running = false;
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    if (this.onGameOver) this.onGameOver(this.dayNum, this.kills);
  }

  // ===== 渲染 =====
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = this.isNight ? '#0a0a18' : '#1a2a10';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    const rect = this.canvas.getBoundingClientRect ? this.canvas : { width: w, height: h };
    const halfW = w / this.zoom / 2;
    const halfH = h / this.zoom / 2;
    const minX = Math.floor((this.camX - halfW) / TILE) - 1;
    const maxX = Math.ceil((this.camX + halfW) / TILE) + 1;
    const minY = Math.floor((this.camY - halfH) / TILE) - 1;
    const maxY = Math.ceil((this.camY + halfH) / TILE) + 1;

    // 绘制地形
    for (let tx = minX; tx <= maxX; tx++) {
      for (let ty = minY; ty <= maxY; ty++) {
        if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) continue;
        const fog = this.fogMap.get(`${tx},${ty}`) || FOG_HIDDEN;
        if (fog === FOG_HIDDEN) {
          ctx.fillStyle = this.isNight ? '#060610' : '#0a0a14';
          ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
          continue;
        }
        const terrain = getTerrain(tx, ty);
        const px = tx * TILE, py = ty * TILE;
        if (terrain === WATER) {
          ctx.fillStyle = this.isNight ? '#0a1a3a' : '#1a4a8a';
        } else {
          ctx.fillStyle = this.isNight ? '#1a2a14' : '#3a5a24';
        }
        ctx.fillRect(px, py, TILE, TILE);

        if (fog === FOG_EXPLORED) {
          // 已探索但不可见，画面变暗
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(px, py, TILE, TILE);
          // 不画资源
          continue;
        }

        // 资源
        const key = `${tx},${ty}`;
        const cached = this.resourceCache.get(key);
        if (cached) {
          this.drawResource(ctx, px + TILE / 2, py + TILE / 2, cached.type, cached.hp, cached.maxHp, cached.shakeT);
          continue;
        }
        if (terrain === TREE || terrain === ROCK || terrain === GOLD) {
          const info = RES_INFO[terrain];
          this.drawResource(ctx, px + TILE / 2, py + TILE / 2, terrain, info.hp, info.hp, 0);
        }
      }
    }

    // 网格线（仅可见区域）
    ctx.strokeStyle = this.isNight ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let tx = minX; tx <= maxX; tx++) {
      ctx.beginPath();
      ctx.moveTo(tx * TILE, minY * TILE);
      ctx.lineTo(tx * TILE, (maxY + 1) * TILE);
      ctx.stroke();
    }
    for (let ty = minY; ty <= maxY; ty++) {
      ctx.beginPath();
      ctx.moveTo(minX * TILE, ty * TILE);
      ctx.lineTo((maxX + 1) * TILE, ty * TILE);
      ctx.stroke();
    }

    this.drawBase(ctx);

    for (const wall of this.walls) this.drawWall(ctx, wall);
    for (const t of this.towers) this.drawTower(ctx, t);

    // 工人激光
    for (const w of this.workers) {
      if (w.targetResource && this.resourceCache.has(w.targetResource.key)) {
        this.drawWorkerLaser(ctx, w, this.resourceCache.get(w.targetResource.key));
      }
    }
    for (const w of this.workers) this.drawWorker(ctx, w);
    for (const e of this.enemies) this.drawEnemy(ctx, e);

    // 塔攻击激光
    for (const t of this.towers) {
      if (t.beamT > 0) {
        t.beamT -= 1 / 60;
        if (t.beamTarget && t.beamTarget.alive) {
          const alpha = Math.max(0, t.beamT / 0.12);
          ctx.strokeStyle = `rgba(120,240,255,${alpha})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.beamTarget.x, t.beamTarget.y); ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          // 冰塔蓝光
          if (t.type === 'ice') {
            ctx.strokeStyle = `rgba(100,180,255,${alpha * 0.6})`;
            ctx.lineWidth = 5;
            ctx.stroke();
          }
        }
      }
    }

    // 拖拽线
    if (this.dragUnit && this.dragUnitLine) {
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath(); ctx.moveTo(this.dragUnit.x, this.dragUnit.y);
      ctx.lineTo(this.dragUnitLine.x, this.dragUnitLine.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    // 选中单位高亮
    if (this.selectedUnit) {
      ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.selectedUnit.x, this.selectedUnit.y, TILE * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      // 升级进度点
      if (this.selectedUnit.level !== undefined && this.selectedUnit.level < 3) {
        for (let i = 0; i < this.selectedUnit.level; i++) {
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(this.selectedUnit.x + (i - 1) * 6, this.selectedUnit.y - TILE * 0.55, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 建造预览
    if (this.buildMode && this.hoverCell) {
      const hx = this.hoverCell.x * TILE + TILE / 2, hy = this.hoverCell.y * TILE + TILE / 2;
      const terrain = getTerrain(this.hoverCell.x, this.hoverCell.y);
      const canPlace = terrain === GRASS;
      ctx.strokeStyle = canPlace ? 'rgba(0,255,136,0.6)' : 'rgba(255,51,51,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.rect(this.hoverCell.x * TILE + 2, this.hoverCell.y * TILE + 2, TILE - 4, TILE - 4);
      ctx.stroke();
      ctx.setLineDash([]);

      if (canPlace && TOWER_TYPES[this.buildMode]) {
        const cfg = TOWER_TYPES[this.buildMode];
        ctx.fillStyle = (cfg.color + '33');
        drawPolygon(ctx, hx, hy, TILE * 0.35, cfg.sides);
        ctx.fill();
      }
      if (canPlace && this.buildMode === 'wall') {
        ctx.fillStyle = 'rgba(138,138,106,0.2)';
        drawPolygon(ctx, hx, hy, TILE * 0.35, 4, Math.PI / 4);
        ctx.fill();
      }
    }

    ctx.restore();

    if (this.isNight) {
      ctx.fillStyle = 'rgba(5, 5, 20, 0.35)';
      ctx.fillRect(0, 0, w, h);
    }

    this.drawMinimap(ctx, w, h);
  }

  // ===== 绘制函数 =====
  drawResource(ctx, cx, cy, type, hp, maxHp, shakeT) {
    const shake = shakeT > 0 ? (Math.random() - 0.5) * 4 : 0;
    const sx = cx + shake, sy = cy + shake;
    if (type === TREE) {
      ctx.fillStyle = this.isNight ? '#3a2a1a' : '#6a4a24';
      ctx.fillRect(sx - 3, sy + TILE * 0.05, 6, TILE * 0.3);
      ctx.fillStyle = this.isNight ? '#1a3a1a' : '#3a8a3a';
      drawPolygon(ctx, sx, sy - TILE * 0.1, TILE * 0.32, 3, -Math.PI / 2); ctx.fill();
      ctx.fillStyle = this.isNight ? '#2a4a1a' : '#4a7a2a';
      drawPolygon(ctx, sx, sy - TILE * 0.15, TILE * 0.18, 3, -Math.PI / 2); ctx.fill();
    } else if (type === ROCK) {
      ctx.fillStyle = this.isNight ? '#3a3a3a' : '#8a8a8a';
      drawPolygon(ctx, sx, sy, TILE * 0.35, 5, Math.PI * 0.1); ctx.fill();
      ctx.fillStyle = this.isNight ? '#5a5a5a' : '#aaaaaa';
      drawPolygon(ctx, sx - 2, sy - 3, TILE * 0.18, 5, Math.PI * 0.1); ctx.fill();
    } else if (type === GOLD) {
      ctx.fillStyle = this.isNight ? '#6a5a00' : '#ffd700';
      drawPolygon(ctx, sx, sy, TILE * 0.3, 8, Math.PI / 8); ctx.fill();
      ctx.fillStyle = this.isNight ? '#8a7a00' : '#ffee44';
      drawDiamond(ctx, sx, sy, TILE * 0.12, TILE * 0.08); ctx.fill();
    }
    if (hp < maxHp - 0.01) {
      const ratio = Math.max(0, hp / maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(cx - TILE * 0.35, cy - TILE * 0.45, TILE * 0.7, 4);
      let barColor = '#00ff44';
      if (type === GOLD) barColor = '#ffcc00';
      if (type === ROCK) barColor = '#cccccc';
      ctx.fillStyle = barColor;
      ctx.fillRect(cx - TILE * 0.35, cy - TILE * 0.45, TILE * 0.7 * ratio, 4);
    }
  }

  drawBase(ctx) {
    const bx = BASE_X * TILE, by = BASE_Y * TILE;
    const r = this.baseRadius * TILE;
    ctx.fillStyle = this.isNight ? '#1a2a0a' : '#2a4a18';
    drawPolygon(ctx, bx, by, r, 8); ctx.fill();
    ctx.fillStyle = this.isNight ? '#3a3a4a' : '#5a5a7a';
    drawPolygon(ctx, bx, by, TILE * 0.7, 4, Math.PI / 4); ctx.fill();
    ctx.fillStyle = this.isNight ? '#4a4a5a' : '#8a8aaa';
    drawDiamond(ctx, bx, by, TILE * 0.4, TILE * 0.3); ctx.fill();
    const hpRatio = this.baseHP / this.baseMaxHP;
    ctx.fillStyle = '#333';
    ctx.fillRect(bx - TILE * 0.6, by - TILE * 0.9, TILE * 1.2, 5);
    ctx.fillStyle = hpRatio > 0.5 ? '#00ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillRect(bx - TILE * 0.6, by - TILE * 0.9, TILE * 1.2 * hpRatio, 5);
  }

  drawWall(ctx, wall) {
    drawWallTexture(ctx, wall.x, wall.y, TILE, this.isNight);
    const hpR = wall.hp / wall.maxHp;
    if (hpR < 1) {
      ctx.fillStyle = '#333';
      ctx.fillRect(wall.x - TILE * 0.3, wall.y - TILE * 0.5, TILE * 0.6, 3);
      ctx.fillStyle = hpR > 0.5 ? '#0f0' : '#f80';
      ctx.fillRect(wall.x - TILE * 0.3, wall.y - TILE * 0.5, TILE * 0.6 * hpR, 3);
    }
  }

  drawTower(ctx, t) {
    const cfg = t.cfg;
    const night = this.isNight;
    if (t === this.selectedUnit) {
      ctx.strokeStyle = 'rgba(0,240,255,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.range * TILE, 0, Math.PI * 2); ctx.stroke();
    }
    // 塔基多边形
    const outerColor = night ? cfg.colorNight : cfg.color;
    ctx.fillStyle = outerColor;
    drawPolygon(ctx, t.x, t.y, TILE * 0.38, cfg.sides); ctx.fill();
    // 内层
    const innerColor = night ? TOWER_TYPES.arrow.colorNight : cfg.color;
    ctx.fillStyle = innerColor;
    ctx.globalAlpha = 0.6;
    drawPolygon(ctx, t.x, t.y, TILE * 0.22, cfg.sides); ctx.fill();
    ctx.globalAlpha = 1;
    // 等级标记
    ctx.fillStyle = '#ffffff';
    drawDiamond(ctx, t.x, t.y, TILE * 0.08, TILE * 0.12); ctx.fill();
    // 升级星星
    if (t.level > 1) {
      ctx.fillStyle = '#ffd700';
      for (let i = 0; i < t.level - 1; i++) {
        ctx.beginPath();
        ctx.arc(t.x + (i - 0.5) * 5 + 2, t.y - TILE * 0.45, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawWorker(ctx, w) {
    ctx.fillStyle = this.isNight ? '#225588' : '#44aaff';
    drawDiamond(ctx, w.x, w.y, TILE * 0.22, TILE * 0.32); ctx.fill();
    ctx.fillStyle = this.isNight ? '#6699cc' : '#aaddff';
    drawDiamond(ctx, w.x, w.y, TILE * 0.12, TILE * 0.18); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(w.x, w.y, 2, 0, Math.PI * 2); ctx.fill();
  }

  drawWorkerLaser(ctx, w, res) {
    const t = performance.now() / 100;
    const flicker = 0.7 + Math.sin(t) * 0.3;
    ctx.strokeStyle = `rgba(100,200,255,${0.25 * flicker})`; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(res.x, res.y); ctx.stroke();
    ctx.strokeStyle = `rgba(180,230,255,${0.6 * flicker})`; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${flicker})`; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = `rgba(180,230,255,${flicker})`;
    ctx.beginPath(); ctx.arc(res.x, res.y, TILE * 0.1 + Math.sin(t * 2) * 3, 0, Math.PI * 2); ctx.fill();
  }

  drawEnemy(ctx, e) {
    if (!e.enemyType) return;
    const cfg = e.enemyType;
    e.rot += (e.rotSpeed || 0) * 0.016;
    const size = TILE * 0.3 + (cfg.tier || 1) * 2;
    const color = cfg.color;

    ctx.fillStyle = color;
    if (cfg.isStar) {
      drawStar(ctx, e.x, e.y, size, size * 0.5, 5, e.rot);
    } else if (cfg.sides === 0) {
      // sphere → 圆
      ctx.beginPath(); ctx.arc(e.x, e.y, size, 0, Math.PI * 2);
    } else {
      drawPolygon(ctx, e.x, e.y, size, cfg.sides, e.rot);
    }
    ctx.fill();

    // 内层
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    if (cfg.isStar) {
      drawStar(ctx, e.x, e.y, size * 0.55, size * 0.25, 5, e.rot);
    } else if (cfg.sides === 0) {
      ctx.beginPath(); ctx.arc(e.x, e.y, size * 0.55, 0, Math.PI * 2);
    } else {
      drawPolygon(ctx, e.x, e.y, size * 0.55, cfg.sides, e.rot);
    }
    ctx.fill();

    // 减速效果
    if (e.slowTimer > 0) {
      ctx.fillStyle = `rgba(100,200,255,${e.slowTimer * 0.3})`;
      ctx.beginPath(); ctx.arc(e.x, e.y, size + 4, 0, Math.PI * 2); ctx.fill();
    }

    // 血条
    const hpR = e.hp / e.maxHp;
    if (hpR < 1) {
      ctx.fillStyle = '#333';
      ctx.fillRect(e.x - TILE * 0.25, e.y - size - 6, TILE * 0.5, 3);
      ctx.fillStyle = '#ff3333';
      ctx.fillRect(e.x - TILE * 0.25, e.y - size - 6, TILE * 0.5 * hpR, 3);
    }
  }

  drawMinimap(ctx, w, h) {
    const mmSize = 100;
    const mmX = w - mmSize - 8, mmY = h - mmSize - 55;
    const scale = mmSize / (WORLD_W * TILE);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(mmX - 2, mmY - 2, mmSize + 4, mmSize + 4);
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(mmX, mmY, mmSize, mmSize);
    // 已探索区域
    ctx.fillStyle = '#1a2a14';
    for (const [k, v] of this.fogMap) {
      if (v >= FOG_EXPLORED) {
        const [tx, ty] = k.split(',').map(Number);
        ctx.fillRect(mmX + tx * TILE * scale, mmY + ty * TILE * scale, TILE * scale, TILE * scale);
      }
    }
    // 基地
    ctx.fillStyle = '#00ff44';
    ctx.fillRect(mmX + BASE_X * TILE * scale - 2, mmY + BASE_Y * TILE * scale - 2, 4, 4);
    // 单位
    ctx.fillStyle = '#00aadd';
    for (const t of this.towers) ctx.fillRect(mmX + t.x * scale - 1, mmY + t.y * scale - 1, 2, 2);
    ctx.fillStyle = '#44aaff';
    for (const w2 of this.workers) ctx.fillRect(mmX + w2.x * scale - 1, mmY + w2.y * scale - 1, 2, 2);
    ctx.fillStyle = '#ff4444';
    for (const e of this.enemies) ctx.fillRect(mmX + e.x * scale - 1, mmY + e.y * scale - 1, 2, 2);
    // 视口
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    ctx.strokeRect(
      mmX + (this.camX - w / 2 / this.zoom) * scale,
      mmY + (this.camY - h / 2 / this.zoom) * scale,
      w / this.zoom * scale, h / this.zoom * scale
    );
  }

  // ===== 输入处理 =====
  screenToWorld(sx, sy) {
    const w = this.canvas.width, h = this.canvas.height;
    return { x: (sx - w / 2) / this.zoom + this.camX, y: (sy - h / 2) / this.zoom + this.camY };
  }

  worldToCell(wx, wy) {
    return { x: Math.floor(wx / TILE), y: Math.floor(wy / TILE) };
  }

  findUnitAt(wx, wy) {
    const all = [...this.towers, ...this.workers, ...this.walls];
    for (const u of all) {
      if (Math.sqrt((u.x - wx) ** 2 + (u.y - wy) ** 2) < TILE * 0.5) return u;
    }
    return null;
  }

  findResourceAt(wx, wy) {
    const cell = this.worldToCell(wx, wy);
    const key = `${cell.x},${cell.y}`;
    const cached = this.resourceCache.get(key);
    if (cached && cached.hp > 0) {
      return { key, x: cell.x * TILE + TILE / 2, y: cell.y * TILE + TILE / 2, type: cached.type, fromCache: true };
    }
    if (cached) return null;
    const terrain = getTerrain(cell.x, cell.y);
    if (terrain === TREE || terrain === ROCK || terrain === GOLD) {
      return { key, x: cell.x * TILE + TILE / 2, y: cell.y * TILE + TILE / 2, type: terrain, fromCache: false };
    }
    return null;
  }

  handleMouseDown(sx, sy) {
    const world = this.screenToWorld(sx, sy);
    const unit = this.findUnitAt(world.x, world.y);

    // 升级模式：点击塔升级
    if (this.buildMode === 'upgrade') {
      if (unit && this.towers.includes(unit)) {
        this.upgradeTower(unit);
        return;
      }
      if (unit && this.walls.includes(unit)) {
        this.upgradeWall(unit);
        return;
      }
      return;
    }

    if (unit && (this.towers.includes(unit) || this.workers.includes(unit))) {
      this.dragUnit = unit;
      this.dragUnitLine = null;
      this.selectedUnit = unit;
      this.buildMode = null;
      if (this.onBuildModeChange) this.onBuildModeChange(null);
      return;
    }

    if (this.buildMode && TOWER_TYPES[this.buildMode]) {
      const cell = this.worldToCell(world.x, world.y);
      this.doBuildTower(cell.x, cell.y);
      return;
    }
    if (this.buildMode === 'wall') {
      const cell = this.worldToCell(world.x, world.y);
      this.doBuildWall(cell.x, cell.y);
      return;
    }
    if (this.buildMode === 'worker') {
      const cell = this.worldToCell(world.x, world.y);
      this.doBuildWorker(cell.x, cell.y);
      return;
    }

    this.dragging = true;
    this.dragStartX = sx; this.dragStartY = sy;
    this.dragCamX = this.camX; this.dragCamY = this.camY;
    this.dragUnit = null; this.dragUnitLine = null;
    this.selectedUnit = null;
  }

  handleMouseMove(sx, sy) {
    const world = this.screenToWorld(sx, sy);
    if (this.dragUnit) {
      const resource = this.findResourceAt(world.x, world.y);
      this.dragUnitLine = resource ? { x: resource.x, y: resource.y } : { x: world.x, y: world.y };
      return;
    }
    if (this.dragging) {
      this.camX = this.dragCamX - (sx - this.dragStartX) / this.zoom;
      this.camY = this.dragCamY - (sy - this.dragStartY) / this.zoom;
      return;
    }
    if (this.buildMode) {
      this.hoverCell = this.worldToCell(world.x, world.y);
    }
  }

  handleMouseUp(sx, sy) {
    if (this.dragUnit) {
      const world = this.screenToWorld(sx, sy);
      const resource = this.findResourceAt(world.x, world.y);
      if (resource) {
        const unit = this.dragUnit;
        if (this.workers.includes(unit)) {
          unit.targetX = resource.x;
          unit.targetY = resource.y;
          if (!resource.fromCache) {
            const info = RES_INFO[resource.type];
            this.resourceCache.set(resource.key, {
              key: resource.key, type: resource.type,
              x: resource.x, y: resource.y,
              hp: info.hp, maxHp: info.hp, shakeT: 0
            });
          }
          unit.targetResource = this.resourceCache.get(resource.key);
        }
      }
      this.dragUnit = null;
      this.dragUnitLine = null;
      return;
    }
    this.dragging = false;
  }

  handleWheel(delta) {
    this.targetZoom = Math.max(0.4, Math.min(2.5, this.targetZoom - delta * 0.001));
  }

  // ===== 建造 =====
  doBuildTower(cx, cy) {
    const terrain = getTerrain(cx, cy);
    if (terrain !== GRASS) return;
    const cfg = TOWER_TYPES[this.buildMode];
    if (!cfg) return;
    if (this.wood < cfg.costWood || this.stone < cfg.costStone) return;
    this.wood -= cfg.costWood;
    this.stone -= cfg.costStone;
    this.towers.push({
      x: cx * TILE + TILE / 2, y: cy * TILE + TILE / 2,
      type: cfg.type, cfg, level: 1,
      damage: cfg.upgradeDamage[0], range: cfg.upgradeRange[0],
      fireRate: cfg.fireRate, fireTimer: 0,
      beamT: 0, beamTarget: null, alive: true
    });
    this.updateHUD();
  }

  doBuildWall(cx, cy) {
    if (getTerrain(cx, cy) !== GRASS) return;
    if (this.wood < 10) return;
    this.wood -= 10;
    this.walls.push({
      x: cx * TILE + TILE / 2, y: cy * TILE + TILE / 2,
      hp: 50, maxHp: 50, alive: true
    });
    this.updateHUD();
  }

  doBuildWorker(cx, cy) {
    if (getTerrain(cx, cy) !== GRASS) return;
    if (this.wood < 20) return;
    this.wood -= 20;
    this.workers.push({
      x: cx * TILE + TILE / 2, y: cy * TILE + TILE / 2,
      targetX: cx * TILE + TILE / 2, targetY: cy * TILE + TILE / 2,
      targetResource: null, alive: true
    });
    this.updateHUD();
  }

  // ===== 升级 =====
  upgradeTower(tower) {
    if (tower.level >= 3) return;
    const cost = tower.cfg.upgradeCosts[tower.level];
    if (this.coins < cost) return;
    this.coins -= cost;
    tower.level++;
    tower.damage = tower.cfg.upgradeDamage[tower.level - 1];
    tower.range = tower.cfg.upgradeRange[tower.level - 1];
    this.selectedUnit = tower;
    this.updateHUD();
  }

  upgradeWall(wall) {
    if (wall.level >= 3) return;
    const cost = 20 + (wall.level || 1) * 15;
    if (this.coins < cost) return;
    this.coins -= cost;
    wall.level = (wall.level || 1) + 1;
    wall.maxHp = 50 + (wall.level - 1) * 30;
    wall.hp = wall.maxHp;
    this.selectedUnit = wall;
    this.updateHUD();
  }

  // ===== 模式切换 =====
  setBuildMode(mode) {
    this.buildMode = this.buildMode === mode ? null : mode;
    this.selectedUnit = null;
    this.dragUnit = null;
    this.dragUnitLine = null;
    if (this.onBuildModeChange) this.onBuildModeChange(this.buildMode);
  }

  updateHUD() {
    if (this.onHUDUpdate) {
      this.onHUDUpdate({
        wood: this.wood, stone: this.stone, coins: this.coins,
        isNight: this.isNight, dayNum: this.dayNum,
        hp: this.baseHP, maxHp: this.baseMaxHP
      });
    }
    if (this.onSelectedUnitUpdate && this.selectedUnit) {
      this.onSelectedUnitUpdate(this.selectedUnit);
    }
  }
}