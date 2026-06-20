import { TOWER_CONFIGS, TOWER_LIST } from './Tower.js';
import { LEVELS, getStars } from './LevelData.js';

export class UIManager {
  constructor() {
    this.selectedTowerType = null;
    this.unlockedLevels = 1; // 初始解锁第1关
    this.levelStars = {};    // { levelId: stars }
    this.setupElements();
    this.setupTowerPanel();
    this.setupButtons();
    this.setupUpgradePanel();
    this.renderHomePage();
  }

  setupElements() {
    // 页面
    this.pageHome = document.getElementById('page-home');
    this.pageGame = document.getElementById('page-game');

    // HUD
    this.hudLives = document.getElementById('hud-lives');
    this.hudGold = document.getElementById('hud-gold');
    this.hudScore = document.getElementById('hud-score');
    this.hudWave = document.getElementById('hud-wave');
    this.hudStatus = document.getElementById('hud-status');
    this.hudLevelName = document.getElementById('hud-level-name');

    // 游戏 UI
    this.towerPanel = document.getElementById('tower-panel');
    this.startWaveBtn = document.getElementById('btn-start-wave');
    this.gameOverlay = document.getElementById('game-overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlaySubtitle = document.getElementById('overlay-subtitle');
    this.overlayScore = document.getElementById('overlay-score');
    this.overlayStars = document.getElementById('overlay-stars');
    this.overlayWave = document.getElementById('overlay-wave');
    this.overlayBtn = document.getElementById('overlay-btn');
    this.overlayNextBtn = document.getElementById('overlay-next-btn');

    // 升级面板
    this.upgradePanel = document.getElementById('upgrade-panel');
    this.upgradeName = document.getElementById('upgrade-name');
    this.upgradeLevel = document.getElementById('upgrade-level');
    this.upgradeStats = document.getElementById('upgrade-stats');
    this.upgradeCost = document.getElementById('upgrade-cost');
    this.btnUpgrade = document.getElementById('btn-upgrade');
    this.btnSell = document.getElementById('btn-sell');

    // 主页
    this.levelGrid = document.getElementById('level-grid');
    this.towerGallery = document.getElementById('tower-gallery');
    this.btnBackToHome = document.getElementById('btn-back-home');
  }

  setupTowerPanel() {
    this.towerPanel.innerHTML = '';
    TOWER_LIST.forEach(type => {
      const config = TOWER_CONFIGS[type];
      const btn = document.createElement('button');
      btn.className = 'tower-btn';
      btn.dataset.type = type;
      btn.innerHTML = `
        <div class="tower-icon" style="background:#${config.color.toString(16).padStart(6, '0')}"></div>
        <div class="tower-info">
          <span class="tower-name">${config.name}</span>
          <span class="tower-cost">💰${config.cost}</span>
        </div>
        <div class="tower-stats">
          <span>⚔${config.damage}</span>
          <span>🎯${config.range}</span>
          <span>⏱${config.fireRate}/s</span>
        </div>
      `;
      btn.addEventListener('click', () => {
        this.selectTowerType(type);
      });
      this.towerPanel.appendChild(btn);
    });
  }

  setupButtons() {
    this.startWaveBtn.addEventListener('click', () => {
      if (this.onStartWave) this.onStartWave();
    });

    this.overlayBtn.addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });

    this.overlayNextBtn.addEventListener('click', () => {
      if (this.onNextLevel) this.onNextLevel();
    });

    this.btnBackToHome.addEventListener('click', () => {
      if (this.onBackToHome) this.onBackToHome();
    });
  }

  setupUpgradePanel() {
    this.btnUpgrade.addEventListener('click', () => {
      if (this.onUpgrade) this.onUpgrade();
    });
    this.btnSell.addEventListener('click', () => {
      if (this.onSell) this.onSell();
    });
  }

  // ===== 主页渲染 =====
  renderHomePage() {
    this.renderLevelGrid();
    this.renderTowerGallery();
  }

  renderLevelGrid() {
    this.levelGrid.innerHTML = '';
    LEVELS.forEach(level => {
      const card = document.createElement('div');
      card.className = 'level-card';
      const unlocked = level.id <= this.unlockedLevels;
      const stars = this.levelStars[level.id] || 0;

      if (!unlocked) {
        card.classList.add('locked');
      }

      card.innerHTML = `
        <div class="level-number">${level.id}</div>
        <div class="level-name">${level.name}</div>
        <div class="level-subtitle">${level.subtitle}</div>
        <div class="level-difficulty ${level.difficulty}">${level.difficulty}</div>
        <div class="level-desc">${level.description}</div>
        <div class="level-stars">
          ${[1,2,3].map(i => `<span class="star ${i <= stars ? 'filled' : ''}">★</span>`).join('')}
        </div>
        <div class="level-info">${level.waves} 波 | ${level.cols}x${level.rows} 地图</div>
        ${!unlocked ? '<div class="level-lock">🔒</div>' : ''}
      `;

      if (unlocked) {
        card.addEventListener('click', () => {
          if (this.onSelectLevel) this.onSelectLevel(level.id);
        });
      }

      this.levelGrid.appendChild(card);
    });
  }

  renderTowerGallery() {
    this.towerGallery.innerHTML = '';
    TOWER_LIST.forEach(type => {
      const config = TOWER_CONFIGS[type];
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.innerHTML = `
        <div class="gallery-icon" style="background:#${config.color.toString(16).padStart(6, '0')}"></div>
        <div class="gallery-name">${config.name}</div>
        <div class="gallery-desc">${config.description}</div>
        <div class="gallery-stats">
          <div class="gstat"><span>伤害</span><span>${config.upgradeDamage.join(' / ')}</span></div>
          <div class="gstat"><span>范围</span><span>${config.upgradeRange.join(' / ')}</span></div>
          <div class="gstat"><span>攻速</span><span>${config.fireRate}/s</span></div>
          <div class="gstat"><span>造价</span><span>💰${config.cost}</span></div>
          <div class="gstat"><span>升级</span><span>💰${config.upgradeCosts[1]}/${config.upgradeCosts[2]}</span></div>
        </div>
      `;
      this.towerGallery.appendChild(card);
    });
  }

  // ===== 页面切换 =====
  showHomePage() {
    this.pageHome.classList.remove('hidden');
    this.pageGame.classList.add('hidden');
  }

  showGamePage() {
    this.pageHome.classList.add('hidden');
    this.pageGame.classList.remove('hidden');
    document.getElementById('hud').classList.remove('hidden');
    this.towerPanel.classList.remove('hidden');
  }

  // ===== 塔选择 =====
  selectTowerType(type) {
    // 先取消选中已放置塔
    if (this.onDeselectTower) this.onDeselectTower();

    if (this.selectedTowerType === type) {
      this.selectedTowerType = null;
    } else {
      this.selectedTowerType = type;
    }
    this.towerPanel.querySelectorAll('.tower-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.type === this.selectedTowerType);
    });

    // 通知 Game
    if (this.onSelectTowerType) this.onSelectTowerType(this.selectedTowerType);
  }

  clearTowerSelection() {
    this.selectedTowerType = null;
    this.towerPanel.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
    if (this.onSelectTowerType) this.onSelectTowerType(null);
  }

  getSelectedTowerType() {
    return this.selectedTowerType;
  }

  // ===== 升级面板 =====
  showUpgradePanel(tower, gold) {
    this.upgradePanel.classList.remove('hidden');
    this.upgradeName.textContent = tower.config.name;
    this.upgradeLevel.textContent = `Lv.${tower.level}`;

    const nextLevel = tower.level < tower.maxLevel ? tower.level + 1 : null;
    let statsHtml = `<div>伤害: ${tower.damage}</div><div>范围: ${tower.range.toFixed(1)}</div>`;
    if (nextLevel) {
      statsHtml += `<div class="next-stat">→ Lv${nextLevel}: 伤害 ${tower.config.upgradeDamage[nextLevel - 1]} / 范围 ${tower.config.upgradeRange[nextLevel - 1].toFixed(1)}</div>`;
    }
    this.upgradeStats.innerHTML = statsHtml;

    const cost = tower.getUpgradeCost();
    if (cost > 0) {
      this.upgradeCost.textContent = `💰${cost}`;
      this.upgradeCost.classList.toggle('affordable', gold >= cost);
      this.btnUpgrade.classList.toggle('hidden', false);
      this.btnUpgrade.classList.toggle('disabled', gold < cost);
    } else {
      this.upgradeCost.textContent = '已满级';
      this.upgradeCost.classList.remove('affordable');
      this.btnUpgrade.classList.add('hidden');
    }
  }

  hideUpgradePanel() {
    this.upgradePanel.classList.add('hidden');
  }

  // ===== HUD =====
  updateHUD(lives, gold, score, wave, maxWave, status) {
    this.hudLives.textContent = lives;
    this.hudGold.textContent = gold;
    this.hudScore.textContent = score;
    this.hudWave.textContent = `${wave}/${maxWave}`;
    this.hudStatus.textContent = status;
  }

  setLevelName(name) {
    this.hudLevelName.textContent = name;
  }

  showWaveButton(show) {
    this.startWaveBtn.classList.toggle('hidden', !show);
  }

  // ===== 游戏结束/胜利 =====
  showGameOver(score, wave) {
    this.gameOverlay.classList.remove('hidden');
    this.overlayTitle.textContent = '游戏结束';
    this.overlayTitle.className = 'overlay-title fail';
    this.overlaySubtitle.textContent = 'GAME OVER';
    this.overlayScore.textContent = score;
    this.overlayWave.textContent = `到达第 ${wave} 波`;
    this.overlayStars.innerHTML = '';
    this.overlayBtn.textContent = '重新挑战';
    this.overlayNextBtn.classList.add('hidden');
    this.hideGameUI();
  }

  showVictory(score, stars) {
    this.gameOverlay.classList.remove('hidden');
    this.overlayTitle.textContent = '胜利！';
    this.overlayTitle.className = 'overlay-title win';
    this.overlaySubtitle.textContent = 'VICTORY';
    this.overlayScore.textContent = score;
    this.overlayWave.textContent = '';
    this.overlayStars.innerHTML = [1, 2, 3].map(i =>
      `<span class="result-star ${i <= stars ? 'filled' : ''}">★</span>`
    ).join('');
    this.overlayBtn.textContent = '再来一次';
    this.overlayNextBtn.classList.remove('hidden');
    this.hideGameUI();
  }

  hideGameOverlay() {
    this.gameOverlay.classList.add('hidden');
  }

  hideGameUI() {
    document.getElementById('hud').classList.add('hidden');
    this.towerPanel.classList.add('hidden');
    this.startWaveBtn.classList.add('hidden');
    this.upgradePanel.classList.add('hidden');
  }

  showGameUI() {
    document.getElementById('hud').classList.remove('hidden');
    this.towerPanel.classList.remove('hidden');
  }

  // ===== 进度保存 =====
  unlockLevel(levelId, stars) {
    if (levelId > this.unlockedLevels) return;
    this.levelStars[levelId] = Math.max(this.levelStars[levelId] || 0, stars);
    if (levelId === this.unlockedLevels && stars >= 1) {
      this.unlockedLevels = Math.min(this.unlockedLevels + 1, LEVELS.length);
    }
    this.renderLevelGrid();
  }
}