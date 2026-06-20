import { SceneManager } from './Scene.js';
import { Game } from './Game.js';
import { UIManager } from './UI.js';
import { getLevel, getStars } from './LevelData.js';
import { GLOBAL_UPGRADE_COSTS } from './Tower.js';

const SAVE_KEY = 'geoTD_save';

class App {
  constructor() {
    this.sceneManager = new SceneManager(document.getElementById('game-container'));
    this.ui = new UIManager();
    this.game = new Game(this.sceneManager, this.ui);
    this.currentLevelId = 1;

    // 全局状态（持久化）
    this.globalCoins = 0;
    this.globalTowerLevels = { arrow: 1, cannon: 1, ice: 1, lightning: 1 };
    this.unlockedLevels = 1;
    this.levelStars = {};
    this.pendingReward = 0; // 待领取的金币奖励

    this.loadSave();
    this.game.setGlobalTowerLevels(this.globalTowerLevels);
    this.ui.updateHomeCoins(this.globalCoins);

    this.setupCallbacks();
    this.navigateToHome();
  }

  // ===== 持久化 =====
  saveGame() {
    const data = {
      globalCoins: this.globalCoins,
      globalTowerLevels: this.globalTowerLevels,
      unlockedLevels: this.unlockedLevels,
      levelStars: this.levelStars
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage 不可用
    }
  }

  loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.globalCoins = data.globalCoins || 0;
        this.globalTowerLevels = data.globalTowerLevels || { arrow: 1, cannon: 1, ice: 1, lightning: 1 };
        this.unlockedLevels = data.unlockedLevels || 1;
        this.levelStars = data.levelStars || {};
      }
    } catch (e) {
      // 忽略损坏的数据
    }
  }

  // ===== 回调设置 =====
  setupCallbacks() {
    // 主页导航
    this.ui.onNavigateToLevels = () => this.navigateToLevels();
    this.ui.onNavigateToUpgrade = () => this.navigateToUpgrade();
    this.ui.onNavigateToHome = () => this.navigateToHome();

    // 关卡选择
    this.ui.onSelectLevel = (levelId) => this.startLevel(levelId);

    // 游戏内
    this.ui.onSelectTowerType = (type) => { this.game.selectedTowerType = type; };
    this.ui.onStartWave = () => this.game.startNextWave();
    this.ui.onRestart = () => this.awardAndRestart();
    this.ui.onNextLevel = () => this.nextLevel();
    this.ui.onUpgrade = () => this.game.upgradeTower();
    this.ui.onSell = () => this.game.sellTower();
    this.ui.onDeselectTower = () => this.game.clearAllSelections();
    this.ui.onBackToHome = () => this.navigateToHome();

    // 全局升级
    this.ui.onGlobalUpgrade = (type) => this.doGlobalUpgrade(type);
  }

  // ===== 页面导航 =====
  navigateToHome() {
    this.game.cleanup();
    this.clearScene();
    this.ui.updateHomeCoins(this.globalCoins);
    this.ui.showHomePage();
  }

  navigateToLevels() {
    this.ui.renderLevelGrid(this.unlockedLevels, this.levelStars);
    this.ui.showLevelsPage();
  }

  navigateToUpgrade() {
    this.ui.renderUpgradeList(this.globalTowerLevels, this.globalCoins);
    this.ui.showUpgradePage();
  }

  // ===== 全局塔升级 =====
  doGlobalUpgrade(type) {
    const level = this.globalTowerLevels[type] || 1;
    if (level >= 3) return;
    const cost = GLOBAL_UPGRADE_COSTS[type][level];
    if (this.globalCoins < cost) return;

    this.globalCoins -= cost;
    this.globalTowerLevels[type] = level + 1;
    this.game.setGlobalTowerLevels(this.globalTowerLevels);
    this.saveGame();
    this.ui.updateHomeCoins(this.globalCoins);
    this.ui.renderUpgradeList(this.globalTowerLevels, this.globalCoins);
  }

  // ===== 游戏流程 =====
  startLevel(levelId) {
    this.currentLevelId = levelId;
    const level = getLevel(levelId);
    this.game.setGlobalTowerLevels(this.globalTowerLevels);
    this.game.pendingReward = 0;
    this.ui.showGamePage();
    this.ui.setLevelName(`${level.name} - ${level.subtitle}`);
    this.game.loadLevel(levelId);
  }

  awardAndRestart() {
    this.awardCoins();
    this.startLevel(this.currentLevelId);
  }

  awardCoins() {
    if (this.game.pendingReward > 0) {
      this.globalCoins += this.game.pendingReward;
      this.game.pendingReward = 0;
      this.saveGame();
      this.ui.updateHomeCoins(this.globalCoins);
    }
  }

  clearScene() {
    const scene = this.sceneManager.getScene();
    while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }
    this.sceneManager.setupLighting();
  }

  nextLevel() {
    const level = getLevel(this.currentLevelId);
    const stars = getStars(this.game.lives, level.startLives);

    // 解锁和星级
    this.levelStars[this.currentLevelId] = Math.max(this.levelStars[this.currentLevelId] || 0, stars);
    if (this.currentLevelId === this.unlockedLevels && stars >= 1) {
      this.unlockedLevels = Math.min(this.unlockedLevels + 1, 5);
    }

    this.awardCoins();

    const nextId = this.currentLevelId + 1;
    if (nextId <= 5) {
      this.startLevel(nextId);
    } else {
      this.navigateToHome();
    }
  }
}

// 启动
const app = new App();