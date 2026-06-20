// 无尽生存模式 - 2D 塔防
// 程序生成无限地图 | 昼夜循环 | 基地扩张 | 激光采集 | 怪物袭击

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

// 资源属性
const RES_INFO = {
  [TREE]: { name: 'tree', hp: 40, reward: 5, colorDay: '#3a8a3a', colorNight: '#1a3a1a' },
  [ROCK]: { name: 'rock', hp: 70, reward: 4, colorDay: '#8a8a8a', colorNight: '#4a4a4a' },
  [GOLD]: { name: 'gold', hp: 55, reward: 8, colorDay: '#ffd700', colorNight: '#8a6a00' }
};

// 昼夜(秒)
const DAY_LEN = 75;
const NIGHT_LEN = 35;

// 激光参数
const LASER_RANGE = TILE * 1.2;
const LASER_DPS = 22;     // 每秒伤害

// 噪音函数
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

// ============== 多边形绘制工具 ==============

function drawPolygon(ctx, cx, cy, radius, sides, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i * Math.PI * 2) / sides;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawDiamond(ctx, cx, cy, radiusX, radiusY, rotation = 0) {
  ctx.beginPath();
  const points = [
    [0, -radiusY],
    [radiusX, 0],
    [0, radiusY],
    [-radiusX, 0]
  ];
  for (let i = 0; i < 4; i++) {
    const [px, py] = points[i];
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    const x = cx + px * cos - py * sin;
    const y = cy + px * sin + py * cos;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
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
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ============== 主类 ==============

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
    this.nightSpawnInterval = 1.5;
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

    this.buildMode = null;
    this.hoverCell = null;
    this.selectedUnit = null;

    // 资源节点: key -> { key, type, x, y, hp, maxHp, shakeT, dead }
    this.resourceCache = new Map();

    this.running = false;
    this.paused = false;

    this.resize();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);

    this.lastTime = 0;
    this.animId = null;
  }

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
    this.running = true;
    this.lastTime = performance.now();
    this.updateHUD();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
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

  update(dt) {
    // 昼夜
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

    // 夜晚刷怪
    if (this.isNight && this.running) {
      this.nightSpawnTimer += dt;
      const interval = Math.max(0.4, 1.5 - this.dayNum * 0.05);
      if (this.nightSpawnTimer >= interval && this.enemiesThisNight < this.maxEnemiesPerNight) {
        this.nightSpawnTimer = 0;
        this.spawnEnemy();
        this.enemiesThisNight++;
      }
    }

    // 更新单位
    for (const w of this.workers) this.updateWorker(w, dt);
    for (const e of this.enemies) this.updateEnemy(e, dt);
    for (const t of this.towers) this.updateTower(t, dt);
    for (const p of this.projectiles) this.updateProjectile(p, dt);

    // 更新资源节点震动计时
    for (const res of this.resourceCache.values()) {
      if (res.shakeT > 0) res.shakeT -= dt;
    }

    // 清理
    this.workers = this.workers.filter(w => w.alive);
    this.enemies = this.enemies.filter(e => e.alive);
    this.projectiles = this.projectiles.filter(p => p.alive);
    this.towers = this.towers.filter(t => t.alive);
    this.walls = this.walls.filter(w => w.alive);

    // 检测基地被攻击
    for (const e of this.enemies) {
      const dx = e.x - BASE_X * TILE;
      const dy = e.y - BASE_Y * TILE;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < TILE * 1.5) {
        this.baseHP -= e.damage * dt;
        e.alive = false;
        if (this.baseHP <= 0) {
          this.baseHP = 0;
          this.gameOver();
          return;
        }
      }
    }

    this.zoom += (this.targetZoom - this.zoom) * 5 * dt;
    this.updateHUD();
  }

  updateWorker(w, dt) {
    // 激光采集
    if (w.targetResource) {
      const res = w.targetResource;
      const cached = this.resourceCache.get(res.key);
      if (!cached || cached.hp <= 0) {
        // 资源已被破坏，返回待命
        w.targetResource = null;
        w.targetX = BASE_X * TILE + (Math.random() - 0.5) * TILE * 2;
        w.targetY = BASE_Y * TILE + (Math.random() - 0.5) * TILE * 2;
      } else {
        const dx = cached.x - w.x;
        const dy = cached.y - w.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > LASER_RANGE) {
          // 继续靠近
          const speed = 80;
          w.x += (dx / dist) * speed * dt;
          w.y += (dy / dist) * speed * dt;
        } else {
          // 在射程内，发射激光
          cached.hp -= LASER_DPS * dt;
          cached.shakeT = 0.15;
          if (cached.hp <= 0) {
            // 采集成功
            if (cached.type === TREE) this.wood += RES_INFO[TREE].reward;
            else if (cached.type === ROCK) this.stone += RES_INFO[ROCK].reward;
            else if (cached.type === GOLD) this.coins += RES_INFO[GOLD].reward;
            this.resourceCache.delete(cached.key);
            w.targetResource = null;
            // 回到基地待命
            w.targetX = BASE_X * TILE + (Math.random() - 0.5) * TILE * 2;
            w.targetY = BASE_Y * TILE + (Math.random() - 0.5) * TILE * 2;
          }
        }
        return;
      }
    }

    // 移动到目标
    const dx = w.targetX - w.x;
    const dy = w.targetY - w.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) {
      w.targetX = w.x;
      w.targetY = w.y;
      return;
    }
    const speed = 80;
    w.x += (dx / dist) * speed * dt;
    w.y += (dy / dist) * speed * dt;
  }

  updateEnemy(e, dt) {
    const dx = BASE_X * TILE - e.x;
    const dy = BASE_Y * TILE - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;

    // 检查前方是否有围墙
    let blocked = false;
    for (const wall of this.walls) {
      const wdx = e.x - wall.x;
      const wdy = e.y - wall.y;
      const wdist = Math.sqrt(wdx * wdx + wdy * wdy);
      if (wdist < TILE * 0.8) {
        wall.hp -= e.damage * dt * 2;
        blocked = true;
        if (wall.hp <= 0) wall.alive = false;
      }
    }
    if (blocked) return;

    const speed = 40 + this.dayNum * 3;
    e.x += (dx / dist) * speed * dt;
    e.y += (dy / dist) * speed * dt;
  }

  updateTower(t, dt) {
    t.fireTimer -= dt;
    if (t.fireTimer > 0) return;

    let closest = null;
    let closestDist = t.range * TILE;
    for (const e of this.enemies) {
      const dx = t.x - e.x;
      const dy = t.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = e;
      }
    }
    if (!closest) return;

    t.fireTimer = t.fireRate;
    // 激光塔瞬时攻击 + 视觉脉冲
    closest.hp -= t.damage;
    t.beamTarget = closest;
    t.beamT = 0.12;
    if (closest.hp <= 0) {
      closest.alive = false;
      this.kills++;
      this.coins += closest.reward;
    }
  }

  updateProjectile(p, dt) {
    // 保留旧逻辑以防未迁移，但我们现在塔用激光
    if (p.ttl === undefined) p.ttl = 0.5;
    p.ttl -= dt;
    if (p.ttl <= 0) { p.alive = false; return; }
  }

  spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 400 + Math.random() * 200;
    const x = BASE_X * TILE + Math.cos(angle) * spawnDist;
    const y = BASE_Y * TILE + Math.sin(angle) * spawnDist;
    const tier = Math.floor(this.dayNum / 3) + 1;
    this.enemies.push({
      x, y,
      hp: 15 + tier * 10 + this.dayNum * 3,
      maxHp: 15 + tier * 10 + this.dayNum * 3,
      damage: 3 + tier * 2,
      reward: 5 + tier * 3 + this.dayNum,
      alive: true,
      tier,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 1.5
    });
  }

  gameOver() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.onGameOver) this.onGameOver(this.dayNum, this.kills);
  }

  // ===== 渲染 =====
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = this.isNight ? '#0a0a18' : '#1a2a10';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    const halfW = w / this.zoom / 2;
    const halfH = h / this.zoom / 2;
    const minX = Math.floor((this.camX - halfW) / TILE) - 1;
    const maxX = Math.ceil((this.camX + halfW) / TILE) + 1;
    const minY = Math.floor((this.camY - halfH) / TILE) - 1;
    const maxY = Math.ceil((this.camY + halfH) / TILE) + 1;

    // 绘制地形 + 资源
    for (let tx = minX; tx <= maxX; tx++) {
      for (let ty = minY; ty <= maxY; ty++) {
        if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) continue;
        const terrain = getTerrain(tx, ty);
        const px = tx * TILE;
        const py = ty * TILE;

        // 地面底色
        if (terrain === WATER) {
          ctx.fillStyle = this.isNight ? '#0a1a3a' : '#1a4a8a';
        } else {
          ctx.fillStyle = this.isNight ? '#1a2a14' : '#3a5a24';
        }
        ctx.fillRect(px, py, TILE, TILE);

        // 资源几何体
        const key = `${tx},${ty}`;
        const cached = this.resourceCache.get(key);
        // 有 cached 说明正在被采集/已被采集(hp>0 才显示)，否则检查地形是否是资源
        if (cached) {
          // 显示带 HP 的资源
          this.drawResource(ctx, px + TILE / 2, py + TILE / 2, cached.type, cached.hp, cached.maxHp, cached.shakeT);
          continue;
        }
        if (terrain === TREE || terrain === ROCK || terrain === GOLD) {
          const info = RES_INFO[terrain];
          this.drawResource(ctx, px + TILE / 2, py + TILE / 2, terrain, info.hp, info.hp, 0);
          continue;
        }
      }
    }

    // 网格线
    ctx.strokeStyle = this.isNight ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)';
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

    // 工人激光 (在工人之前画激光线)
    for (const w of this.workers) {
      if (w.targetResource && this.resourceCache.has(w.targetResource.key)) {
        const res = this.resourceCache.get(w.targetResource.key);
        this.drawWorkerLaser(ctx, w, res);
      }
    }

    for (const w of this.workers) this.drawWorker(ctx, w);
    for (const e of this.enemies) this.drawEnemy(ctx, e);

    // 塔攻击激光脉冲
    for (const t of this.towers) {
      if (t.beamT > 0) {
        t.beamT -= 1 / 60;
        if (t.beamTarget && t.beamTarget.alive) {
          ctx.strokeStyle = 'rgba(120,240,255,' + Math.max(0, t.beamT / 0.12) + ')';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(t.x, t.y);
          ctx.lineTo(t.beamTarget.x, t.beamTarget.y);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,' + Math.max(0, t.beamT / 0.12) + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // 拖拽线
    if (this.dragUnit && this.dragUnitLine) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(this.dragUnit.x, this.dragUnit.y);
      ctx.lineTo(this.dragUnitLine.x, this.dragUnitLine.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 选中单位高亮
    if (this.selectedUnit) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.selectedUnit.x, this.selectedUnit.y, TILE * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 建造预览
    if (this.buildMode && this.hoverCell) {
      const hx = this.hoverCell.x * TILE + TILE / 2;
      const hy = this.hoverCell.y * TILE + TILE / 2;
      const terrain = getTerrain(this.hoverCell.x, this.hoverCell.y);
      const canPlace = terrain === GRASS;

      ctx.strokeStyle = canPlace ? 'rgba(0,255,136,0.6)' : 'rgba(255,51,51,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.rect(this.hoverCell.x * TILE + 2, this.hoverCell.y * TILE + 2, TILE - 4, TILE - 4);
      ctx.stroke();
      ctx.setLineDash([]);

      if (canPlace && this.buildMode === 'tower') {
        ctx.fillStyle = 'rgba(0,240,255,0.2)';
        drawPolygon(ctx, hx, hy, TILE * 0.35, 6);
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

  drawResource(ctx, cx, cy, type, hp, maxHp, shakeT) {
    const shake = shakeT > 0 ? (Math.random() - 0.5) * 4 : 0;
    const sx = cx + shake;
    const sy = cy + shake;

    if (type === TREE) {
      // 树干 (小矩形) + 树冠 (大三角形=多边形 3边)
      const dayColor = RES_INFO[TREE].colorDay;
      const nightColor = RES_INFO[TREE].colorNight;
      // 树干
      ctx.fillStyle = this.isNight ? '#3a2a1a' : '#6a4a24';
      ctx.fillRect(sx - 3, sy + TILE * 0.05, 6, TILE * 0.3);
      // 树冠 (三角形 叠加一个稍大的三角形)
      ctx.fillStyle = this.isNight ? nightColor : dayColor;
      drawPolygon(ctx, sx, sy - TILE * 0.1, TILE * 0.32, 3, -Math.PI / 2);
      ctx.fill();
      ctx.fillStyle = this.isNight ? '#2a4a1a' : '#4a7a2a';
      drawPolygon(ctx, sx, sy - TILE * 0.15, TILE * 0.18, 3, -Math.PI / 2);
      ctx.fill();
    } else if (type === ROCK) {
      // 岩石: 五边形
      ctx.fillStyle = this.isNight ? '#3a3a3a' : '#8a8a8a';
      drawPolygon(ctx, sx, sy, TILE * 0.35, 5, Math.PI * 0.1);
      ctx.fill();
      // 内层高光
      ctx.fillStyle = this.isNight ? '#5a5a5a' : '#aaaaaa';
      drawPolygon(ctx, sx - 2, sy - 3, TILE * 0.18, 5, Math.PI * 0.1);
      ctx.fill();
    } else if (type === GOLD) {
      // 金矿: 八边形 + 中心小菱形
      ctx.fillStyle = this.isNight ? '#6a5a00' : '#ffd700';
      drawPolygon(ctx, sx, sy, TILE * 0.3, 8, Math.PI / 8);
      ctx.fill();
      ctx.fillStyle = this.isNight ? '#8a7a00' : '#ffee44';
      drawDiamond(ctx, sx, sy, TILE * 0.12, TILE * 0.08);
      ctx.fill();
    }

    // HP 条 (只在被采集时显示)
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
    const bx = BASE_X * TILE;
    const by = BASE_Y * TILE;
    const r = this.baseRadius * TILE;

    // 基地地面(八边形)
    ctx.fillStyle = this.isNight ? '#1a2a0a' : '#2a4a18';
    drawPolygon(ctx, bx, by, r, 8);
    ctx.fill();

    // 基地建筑 (大正方形叠加小菱形)
    ctx.fillStyle = this.isNight ? '#3a3a4a' : '#5a5a7a';
    drawPolygon(ctx, bx, by, TILE * 0.7, 4, Math.PI / 4);
    ctx.fill();
    ctx.fillStyle = this.isNight ? '#4a4a5a' : '#8a8aaa';
    drawDiamond(ctx, bx, by, TILE * 0.4, TILE * 0.3);
    ctx.fill();

    // 血条
    const hpRatio = this.baseHP / this.baseMaxHP;
    ctx.fillStyle = '#333';
    ctx.fillRect(bx - TILE * 0.6, by - TILE * 0.9, TILE * 1.2, 5);
    ctx.fillStyle = hpRatio > 0.5 ? '#00ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillRect(bx - TILE * 0.6, by - TILE * 0.9, TILE * 1.2 * hpRatio, 5);
  }

  drawWall(ctx, wall) {
    // 围墙: 正方形带边框
    ctx.fillStyle = this.isNight ? '#4a4a3a' : '#8a8a6a';
    drawPolygon(ctx, wall.x, wall.y, TILE * 0.4, 4, Math.PI / 4);
    ctx.fill();
    ctx.strokeStyle = this.isNight ? '#2a2a1a' : '#5a5a3a';
    ctx.lineWidth = 2;
    drawPolygon(ctx, wall.x, wall.y, TILE * 0.4, 4, Math.PI / 4);
    ctx.stroke();
    // 内部分隔
    ctx.strokeStyle = this.isNight ? '#2a2a1a' : '#5a5a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wall.x - TILE * 0.25, wall.y);
    ctx.lineTo(wall.x + TILE * 0.25, wall.y);
    ctx.stroke();

    // 血条
    const hpR = wall.hp / wall.maxHp;
    if (hpR < 1) {
      ctx.fillStyle = '#333';
      ctx.fillRect(wall.x - TILE * 0.3, wall.y - TILE * 0.5, TILE * 0.6, 3);
      ctx.fillStyle = hpR > 0.5 ? '#0f0' : '#f80';
      ctx.fillRect(wall.x - TILE * 0.3, wall.y - TILE * 0.5, TILE * 0.6 * hpR, 3);
    }
  }

  drawTower(ctx, t) {
    if (t === this.selectedUnit) {
      ctx.strokeStyle = 'rgba(0,240,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.range * TILE, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 六边形塔基
    ctx.fillStyle = this.isNight ? '#003a4a' : '#007a9a';
    drawPolygon(ctx, t.x, t.y, TILE * 0.38, 6);
    ctx.fill();
    // 内部小六边形
    ctx.fillStyle = this.isNight ? '#006a8a' : '#00ddff';
    drawPolygon(ctx, t.x, t.y, TILE * 0.22, 6);
    ctx.fill();
    // 顶部菱形核心
    ctx.fillStyle = '#ffffff';
    drawDiamond(ctx, t.x, t.y, TILE * 0.08, TILE * 0.12);
    ctx.fill();
  }

  drawWorker(ctx, w) {
    // 工人: 菱形体
    ctx.fillStyle = this.isNight ? '#225588' : '#44aaff';
    drawDiamond(ctx, w.x, w.y, TILE * 0.22, TILE * 0.32);
    ctx.fill();
    // 内部亮菱形
    ctx.fillStyle = this.isNight ? '#6699cc' : '#aaddff';
    drawDiamond(ctx, w.x, w.y, TILE * 0.12, TILE * 0.18);
    ctx.fill();
    // 中心小圆点
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w.x, w.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawWorkerLaser(ctx, w, res) {
    // 激光效果: 多层线条
    const t = performance.now() / 100;
    const flicker = 0.7 + Math.sin(t) * 0.3;

    // 外层光晕
    ctx.strokeStyle = 'rgba(100,200,255,' + (0.25 * flicker) + ')';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(w.x, w.y);
    ctx.lineTo(res.x, res.y);
    ctx.stroke();

    // 中层
    ctx.strokeStyle = 'rgba(180,230,255,' + (0.6 * flicker) + ')';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 核心白亮线
    ctx.strokeStyle = 'rgba(255,255,255,' + flicker + ')';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 端点发光
    ctx.fillStyle = 'rgba(180,230,255,' + flicker + ')';
    ctx.beginPath();
    ctx.arc(res.x, res.y, TILE * 0.1 + Math.sin(t * 2) * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawEnemy(ctx, e) {
    // 旋转
    e.rot += (e.rotSpeed || 0) * 0.016;

    const colors = ['#ff4444', '#ff8800', '#ff00aa', '#aa00ff'];
    const color = colors[Math.min(e.tier - 1, colors.length - 1)];
    const size = TILE * 0.3 + e.tier * 2;

    // tier 1: 三角形, tier 2: 五边形, tier 3: 七边形, tier 4+: 星形
    ctx.fillStyle = color;
    if (e.tier >= 4) {
      drawStar(ctx, e.x, e.y, size, size * 0.5, 5, e.rot);
    } else {
      const sides = 3 + (e.tier - 1) * 2; // 3, 5, 7
      drawPolygon(ctx, e.x, e.y, size, sides, e.rot);
    }
    ctx.fill();

    // 内层暗
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    if (e.tier >= 4) {
      drawStar(ctx, e.x, e.y, size * 0.55, size * 0.25, 5, e.rot);
    } else {
      const sides = 3 + (e.tier - 1) * 2;
      drawPolygon(ctx, e.x, e.y, size * 0.55, sides, e.rot);
    }
    ctx.fill();

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
    const mmX = w - mmSize - 8;
    const mmY = h - mmSize - 55;
    const scale = mmSize / (WORLD_W * TILE);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(mmX - 2, mmY - 2, mmSize + 4, mmSize + 4);
    ctx.fillStyle = '#1a2a14';
    ctx.fillRect(mmX, mmY, mmSize, mmSize);

    // 基地
    ctx.fillStyle = '#00ff44';
    ctx.fillRect(mmX + BASE_X * TILE * scale - 2, mmY + BASE_Y * TILE * scale - 2, 4, 4);

    // 单位
    ctx.fillStyle = '#00aadd';
    for (const t of this.towers) {
      ctx.fillRect(mmX + t.x * scale - 1, mmY + t.y * scale - 1, 2, 2);
    }
    ctx.fillStyle = '#44aaff';
    for (const w2 of this.workers) {
      ctx.fillRect(mmX + w2.x * scale - 1, mmY + w2.y * scale - 1, 2, 2);
    }
    ctx.fillStyle = '#ff4444';
    for (const e of this.enemies) {
      ctx.fillRect(mmX + e.x * scale - 1, mmY + e.y * scale - 1, 2, 2);
    }

    // 视口
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mmX + (this.camX - w / 2 / this.zoom) * scale,
      mmY + (this.camY - h / 2 / this.zoom) * scale,
      w / this.zoom * scale,
      h / this.zoom * scale
    );
  }

  // ===== 输入处理 =====
  screenToWorld(sx, sy) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    return {
      x: (sx - w / 2) / this.zoom + this.camX,
      y: (sy - h / 2) / this.zoom + this.camY
    };
  }

  worldToCell(wx, wy) {
    return {
      x: Math.floor(wx / TILE),
      y: Math.floor(wy / TILE)
    };
  }

  findUnitAt(wx, wy) {
    const all = [...this.towers, ...this.workers, ...this.walls];
    for (const u of all) {
      const dx = u.x - wx;
      const dy = u.y - wy;
      if (Math.sqrt(dx * dx + dy * dy) < TILE * 0.5) return u;
    }
    return null;
  }

  findResourceAt(wx, wy) {
    const cell = this.worldToCell(wx, wy);
    const key = `${cell.x},${cell.y}`;
    const cached = this.resourceCache.get(key);
    // 如果缓存中存在且有 hp，则返回它；否则检查地形
    if (cached && cached.hp > 0) {
      return { key, x: cell.x * TILE + TILE / 2, y: cell.y * TILE + TILE / 2, type: cached.type, fromCache: true };
    }
    if (cached) return null; // 被采集但已死亡
    const terrain = getTerrain(cell.x, cell.y);
    if (terrain === TREE || terrain === ROCK || terrain === GOLD) {
      return { key, x: cell.x * TILE + TILE / 2, y: cell.y * TILE + TILE / 2, type: terrain, fromCache: false };
    }
    return null;
  }

  handleMouseDown(sx, sy) {
    const world = this.screenToWorld(sx, sy);
    const unit = this.findUnitAt(world.x, world.y);

    if (unit && (this.towers.includes(unit) || this.workers.includes(unit))) {
      this.dragUnit = unit;
      this.dragUnitLine = null;
      this.selectedUnit = unit;
      this.buildMode = null;
      return;
    }

    if (this.buildMode) {
      const cell = this.worldToCell(world.x, world.y);
      this.doBuild(cell.x, cell.y);
      return;
    }

    this.dragging = true;
    this.dragStartX = sx;
    this.dragStartY = sy;
    this.dragCamX = this.camX;
    this.dragCamY = this.camY;
    this.dragUnit = null;
    this.dragUnitLine = null;
    this.selectedUnit = null;
  }

  handleMouseMove(sx, sy) {
    const world = this.screenToWorld(sx, sy);

    if (this.dragUnit) {
      const resource = this.findResourceAt(world.x, world.y);
      if (resource) {
        this.dragUnitLine = { x: resource.x, y: resource.y };
      } else {
        this.dragUnitLine = { x: world.x, y: world.y };
      }
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
          // 建立资源 HP 缓存
          if (!resource.fromCache) {
            const info = RES_INFO[resource.type];
            this.resourceCache.set(resource.key, {
              key: resource.key,
              type: resource.type,
              x: resource.x,
              y: resource.y,
              hp: info.hp,
              maxHp: info.hp,
              shakeT: 0
            });
          }
          const cached = this.resourceCache.get(resource.key);
          unit.targetResource = cached;
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

  doBuild(cx, cy) {
    const terrain = getTerrain(cx, cy);
    if (terrain !== GRASS) return;

    const wx = cx * TILE + TILE / 2;
    const wy = cy * TILE + TILE / 2;

    if (this.buildMode === 'tower') {
      if (this.wood < 30 || this.stone < 10) return;
      this.wood -= 30;
      this.stone -= 10;
      this.towers.push({
        x: wx, y: wy,
        range: 3.5,
        damage: 10,
        fireRate: 0.8,
        fireTimer: 0,
        beamT: 0,
        beamTarget: null,
        alive: true
      });
    } else if (this.buildMode === 'wall') {
      if (this.wood < 10) return;
      this.wood -= 10;
      this.walls.push({
        x: wx, y: wy,
        hp: 50, maxHp: 50,
        alive: true
      });
    } else if (this.buildMode === 'worker') {
      if (this.wood < 20) return;
      this.wood -= 20;
      this.workers.push({
        x: wx, y: wy,
        targetX: wx, targetY: wy,
        targetResource: null,
        alive: true
      });
    }
    this.updateHUD();
  }

  setBuildMode(mode) {
    this.buildMode = this.buildMode === mode ? null : mode;
    this.selectedUnit = null;
    this.dragUnit = null;
    this.dragUnitLine = null;
  }

  updateHUD() {
    if (this.onHUDUpdate) {
      this.onHUDUpdate({
        wood: this.wood,
        stone: this.stone,
        coins: this.coins,
        isNight: this.isNight,
        dayNum: this.dayNum,
        hp: this.baseHP,
        maxHp: this.baseMaxHP
      });
    }
  }
}
