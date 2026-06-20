import * as THREE from 'three';

// 防御塔配置
export const TOWER_CONFIGS = {
  arrow: {
    type: 'arrow',
    name: '箭塔',
    geometry: 'cone',
    color: 0x00f0ff,
    range: 2.5,
    damage: 25,
    fireRate: 1.0,
    cost: 50,
    description: '基础塔，攻速快，性价比高',
    upgradeCosts: [0, 60, 120],
    upgradeDamage: [25, 35, 50],
    upgradeRange: [2.5, 2.7, 3.0]
  },
  cannon: {
    type: 'cannon',
    name: '炮塔',
    geometry: 'box',
    color: 0xff3333,
    range: 2.0,
    damage: 60,
    fireRate: 0.5,
    cost: 100,
    description: '高伤害，范围小，适合集火',
    upgradeCosts: [0, 100, 200],
    upgradeDamage: [60, 90, 130],
    upgradeRange: [2.0, 2.2, 2.5]
  },
  ice: {
    type: 'ice',
    name: '冰塔',
    geometry: 'octahedron',
    color: 0x66ccff,
    range: 2.2,
    damage: 15,
    fireRate: 1.2,
    cost: 75,
    description: '减速敌人50%，持续1秒',
    upgradeCosts: [0, 80, 150],
    upgradeDamage: [15, 22, 32],
    upgradeRange: [2.2, 2.5, 2.8]
  },
  lightning: {
    type: 'lightning',
    name: '雷塔',
    geometry: 'dodecahedron',
    color: 0xffff00,
    range: 3.0,
    damage: 40,
    fireRate: 0.8,
    cost: 150,
    description: '大范围索敌，适合布防要道',
    upgradeCosts: [0, 130, 250],
    upgradeDamage: [40, 60, 85],
    upgradeRange: [3.0, 3.3, 3.8]
  }
};

export const TOWER_LIST = ['arrow', 'cannon', 'ice', 'lightning'];

// 全局升级费用（在主页面升级塔用）
export const GLOBAL_UPGRADE_COSTS = {
  arrow:   [0, 80, 160],
  cannon:  [0, 120, 240],
  ice:     [0, 100, 200],
  lightning: [0, 160, 320]
};

export class Tower {
  constructor(config, gridPos, worldPos, scene, globalLevel = 1) {
    this.config = config;
    this.gridPos = gridPos;
    this.worldPos = worldPos;
    this.scene = scene;
    this.fireTimer = 0;
    this.target = null;
    this.level = globalLevel;
    this.maxLevel = 3;

    // 当前属性（使用全局等级）
    this.damage = config.upgradeDamage[this.level - 1];
    this.range = config.upgradeRange[this.level - 1];
    this.fireRate = config.fireRate;

    this.mesh = this.createMesh();
    this.rangeRing = this.createRangeRing();
    this.mesh.position.set(worldPos.x, 0, worldPos.z);
    this.rangeRing.position.set(worldPos.x, 0.01, worldPos.z);
    scene.add(this.mesh);
    scene.add(this.rangeRing);
    this.rangeRing.visible = false;
  }

  createMesh() {
    const { geometry, color } = this.config;
    let geo;
    const size = 0.45 + this.level * 0.08;
    switch (geometry) {
      case 'cone':
        geo = new THREE.ConeGeometry(size, size * 2, 8);
        break;
      case 'box':
        geo = new THREE.BoxGeometry(size * 1.5, size * 1.5, size * 1.5);
        break;
      case 'octahedron':
        geo = new THREE.OctahedronGeometry(size);
        break;
      case 'dodecahedron':
        geo = new THREE.DodecahedronGeometry(size);
        break;
      default:
        geo = new THREE.BoxGeometry(size * 1.5, size * 1.5, size * 1.5);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.5
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.5 + this.level * 0.1;
    mesh.castShadow = true;
    return mesh;
  }

  createRangeRing() {
    const geo = new THREE.RingGeometry(this.range - 0.05, this.range, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: this.config.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    return ring;
  }

  upgrade() {
    if (this.level >= this.maxLevel) return false;
    this.level++;
    this.damage = this.config.upgradeDamage[this.level - 1];
    this.range = this.config.upgradeRange[this.level - 1];

    // 更新模型
    this.scene.remove(this.mesh);
    this.mesh.geometry?.dispose();
    this.mesh.material?.dispose();
    this.mesh = this.createMesh();
    this.mesh.position.set(this.worldPos.x, 0, this.worldPos.z);
    this.scene.add(this.mesh);

    // 更新范围环
    this.scene.remove(this.rangeRing);
    this.rangeRing.geometry?.dispose();
    this.rangeRing.material?.dispose();
    this.rangeRing = this.createRangeRing();
    this.rangeRing.position.set(this.worldPos.x, 0.01, this.worldPos.z);
    this.scene.add(this.rangeRing);

    return true;
  }

  getUpgradeCost() {
    if (this.level >= this.maxLevel) return 0;
    return this.config.upgradeCosts[this.level];
  }

  showRange(visible) {
    this.rangeRing.visible = visible;
  }

  findTarget(enemies) {
    let closest = null;
    let closestDist = Infinity;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.mesh.position.x - this.worldPos.x;
      const dz = enemy.mesh.position.z - this.worldPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= this.range && dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }
    return closest;
  }

  update(delta, enemies, projectiles) {
    this.fireTimer += delta;
    this.target = this.findTarget(enemies);

    if (this.target && this.fireTimer >= 1 / this.fireRate) {
      this.fireTimer = 0;
      this.fire(this.target, projectiles);
      // 攻击动画
      const s = 1 + this.level * 0.05;
      this.mesh.scale.set(s + 0.2, s - 0.2, s + 0.2);
      setTimeout(() => {
        if (this.mesh) this.mesh.scale.set(s, s, s);
      }, 100);
    }
  }

  fire(target, projectiles) {
    const startPos = {
      x: this.worldPos.x,
      y: 0.8 + this.level * 0.1,
      z: this.worldPos.z
    };
    projectiles.push(new Projectile(startPos, target, this.damage, this.config.color, this.config.type));
  }

  remove() {
    this.scene.remove(this.mesh);
    this.scene.remove(this.rangeRing);
    this.mesh.geometry?.dispose();
    this.mesh.material?.dispose();
    this.rangeRing.geometry?.dispose();
    this.rangeRing.material?.dispose();
  }
}

export class Projectile {
  constructor(startPos, target, damage, color, towerType) {
    this.target = target;
    this.damage = damage;
    this.color = color;
    this.towerType = towerType;
    this.speed = 8;
    this.alive = true;

    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(startPos.x, startPos.y, startPos.z);
  }

  update(delta) {
    if (!this.alive || !this.target || !this.target.alive) {
      this.alive = false;
      return;
    }

    const targetPos = this.target.mesh.position;
    const dx = targetPos.x - this.mesh.position.x;
    const dy = targetPos.y - this.mesh.position.y;
    const dz = targetPos.z - this.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 0.3) {
      this.target.takeDamage(this.damage);
      if (this.towerType === 'ice') {
        this.target.speed = this.target.config.speed * 0.5;
        this.target.mesh.material.emissive.set(0x66ccff);
        this.target.mesh.material.emissiveIntensity = 0.8;
        setTimeout(() => {
          if (this.target && this.target.alive) {
            this.target.speed = this.target.config.speed;
            this.target.mesh.material.emissive.set(this.target.config.color);
            this.target.mesh.material.emissiveIntensity = 0.6;
          }
        }, 1000);
      }
      this.alive = false;
      return;
    }

    const moveAmount = this.speed * delta;
    const ratio = Math.min(moveAmount / dist, 1);
    this.mesh.position.x += dx * ratio;
    this.mesh.position.y += dy * ratio;
    this.mesh.position.z += dz * ratio;
  }

  remove() {
    if (this.mesh) {
      this.mesh.geometry?.dispose();
      this.mesh.material?.dispose();
    }
  }
}