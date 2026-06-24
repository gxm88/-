import { TOWER_CONFIGS, TOWER_LIST, GLOBAL_UPGRADE_COSTS } from './Tower.js';
import { LEVELS, getStars } from './LevelData.js';

export class UIManager {
  constructor() {
    this.selectedTowerType = null;
    this.setupElements();
    this.setupTowerPanel();
    this.setupButtons();
    this.setupUpgradePanel();
  }

  setupElements() {
    // 页面
    this.pageHome = document.getElementById('page-home');
    this.pageLevels = document.getElementById('page-levels');
    this.pageUpgrade = document.getElementById('page-upgrade');
    this.pageGame = document.getElementById('page-game');

    // 主页金币
    this.homeCoins = document.getElementById('home-coins');
    this.upgradeCoins = document.getElementById('upgrade-coins');

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
    this.overlayCoins = document.getElementById('overlay-coins');
    this.overlayStars = document.getElementById('overlay-stars');
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

    // 主页按钮
    this.btnLevels = document.getElementById('btn-levels');
    this.btnUpgradePage = document.getElementById('btn-upgrade');
    this.btnLevelsBack = document.getElementById('btn-levels-back');
    this.btnUpgradeBack = document.getElementById('btn-upgrade-back');
    this.btnBackToHome = document.getElementById('btn-back-home');

    // 关卡网格
    this.levelGrid = document.getElementById('level-grid');
    this.upgradeList = document.getElementById('upgrade-list');
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

    // 主页导航按钮
    this.btnLevels.addEventListener('click', () => {
      if (this.onNavigateToLevels) this.onNavigateToLevels();
    });

    this.btnUpgradePage.addEventListener('click', () => {
      if (this.onNavigateToUpgrade) this.onNavigateToUpgrade();
    });

    this.btnLevelsBack.addEventListener('click', () => {
      if (this.onNavigateToHome) this.onNavigateToHome();
    });

    this.btnUpgradeBack.addEventListener('click', () => {
      if (this.onNavigateToHome) this.onNavigateToHome();
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

  // ===== 页面切换 =====
  showHomePage() {
    this.pageHome.classList.remove('hidden');
    this.pageLevels.classList.add('hidden');
    this.pageUpgrade.classList.add('hidden');
    this.pageGame.classList.add('hidden');
    const endless = document.getElementById('page-endless');
    if (endless) endless.classList.add('hidden');
  }

  showLevelsPage() {
    this.pageHome.classList.add('hidden');
    this.pageLevels.classList.remove('hidden');
    this.pageUpgrade.classList.add('hidden');
    this.pageGame.classList.add('hidden');
    const endless = document.getElementById('page-endless');
    if (endless) endless.classList.add('hidden');
  }

  showUpgradePage() {
    this.pageHome.classList.add('hidden');
    this.pageLevels.classList.add('hidden');
    this.pageUpgrade.classList.remove('hidden');
    this.pageGame.classList.add('hidden');
    const endless = document.getElementById('page-endless');
    if (endless) endless.classList.add('hidden');
  }

  showGamePage() {
    this.pageHome.classList.add('hidden');
    this.pageLevels.classList.add('hidden');
    this.pageUpgrade.classList.add('hidden');
    this.pageGame.classList.remove('hidden');
    document.getElementById('hud').classList.remove('hidden');
    this.towerPanel.classList.remove('hidden');
    const endless = document.getElementById('page-endless');
    if (endless) endless.classList.add('hidden');
  }

  // ===== 主页金币 =====
  updateHomeCoins(coins) {
    this.homeCoins.textContent = coins;
    this.upgradeCoins.textContent = coins;
  }

  // ===== 关卡选择页 =====
  renderLevelGrid(unlockedLevels, levelStars) {
    this.levelGrid.innerHTML = '';
    LEVELS.forEach(level => {
      const card = document.createElement('div');
      card.className = 'level-card';
      const unlocked = level.id <= unlockedLevels;
      const stars = levelStars[level.id] || 0;

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
        <div class="level-info">${level.waves}波 | ${level.cols}x${level.rows}</div>
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

  // ===== 塔升级页 =====
  renderUpgradeList(globalTowerLevels, globalCoins) {
    this.upgradeList.innerHTML = '';
    TOWER_LIST.forEach(type => {
      const config = TOWER_CONFIGS[type];
      const level = globalTowerLevels[type] || 1;
      const isMaxed = level >= 3;
      const cost = isMaxed ? 0 : GLOBAL_UPGRADE_COSTS[type][level];
      const canAfford = globalCoins >= cost && !isMaxed;

      const card = document.createElement('div');
      card.className = 'upgrade-card';

      const nextLevel = isMaxed ? null : level + 1;
      let nextHtml = '';
      if (nextLevel) {
        nextHtml = `<div class="upgrade-card-next">→ Lv${nextLevel}: 伤害 ${config.upgradeDamage[nextLevel - 1]} / 范围 ${config.upgradeRange[nextLevel - 1].toFixed(1)}</div>`;
      }

      let btnClass = 'btn-global-upgrade';
      let btnText = `升级 💰${cost}`;
      if (isMaxed) {
        btnClass += ' maxed';
        btnText = '已满级';
      } else if (!canAfford) {
        btnClass += ' disabled';
      }

      card.innerHTML = `
        <div class="upgrade-card-icon" style="background:#${config.color.toString(16).padStart(6, '0')}"></div>
        <div class="upgrade-card-name">${config.name}</div>
        <div class="upgrade-card-level">Lv.${level}</div>
        <div class="upgrade-card-stats">
          <div class="upgrade-card-stat"><span>伤害</span><span>${config.upgradeDamage[level - 1]}</span></div>
          <div class="upgrade-card-stat"><span>范围</span><span>${config.upgradeRange[level - 1].toFixed(1)}</span></div>
          <div class="upgrade-card-stat"><span>攻速</span><span>${config.fireRate}/s</span></div>
        </div>
        ${nextHtml}
        <button class="${btnClass}" data-tower="${type}" ${(!canAfford || isMaxed) ? '' : ''}>
          ${btnText}
        </button>
      `;

      const btn = card.querySelector('.btn-global-upgrade');
      if (canAfford && !isMaxed) {
        btn.addEventListener('click', () => {
          if (this.onGlobalUpgrade) this.onGlobalUpgrade(type);
        });
      }

      this.upgradeList.appendChild(card);
    });
  }

  // ===== 塔选择 =====
  selectTowerType(type) {
    if (this.onDeselectTower) this.onDeselectTower();

    if (this.selectedTowerType === type) {
      this.selectedTowerType = null;
    } else {
      this.selectedTowerType = type;
    }
    this.towerPanel.querySelectorAll('.tower-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.type === this.selectedTowerType);
    });

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
    this.overlayCoins.textContent = '0';
    this.overlayStars.innerHTML = '';
    this.overlayBtn.textContent = '重新挑战';
    this.overlayNextBtn.classList.add('hidden');
    this.hideGameUI();
  }

  showVictory(score, stars, coinReward) {
    this.gameOverlay.classList.remove('hidden');
    this.overlayTitle.textContent = '胜利！';
    this.overlayTitle.className = 'overlay-title win';
    this.overlaySubtitle.textContent = 'VICTORY';
    this.overlayScore.textContent = score;
    this.overlayCoins.textContent = coinReward;
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
}