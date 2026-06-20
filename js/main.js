import { SceneManager } from './Scene.js';
import { Game } from './Game.js';
import { UIManager } from './UI.js';
import { getLevel, getStars } from './LevelData.js';
import { GLOBAL_UPGRADE_COSTS } from './Tower.js';
import { EndlessGame } from './EndlessGame.js';

const SAVE_KEY = 'geoTD_save';

class App {
  constructor() {
    this.sceneManager = new SceneManager(document.getElementById('game-container'));
    this.ui = new UIManager();
    this.game = new Game(this.sceneManager, this.ui);
    this.currentLevelId = 1;

    // 无尽模式
    this.endlessContainer = document.getElementById('endless-world');
    this.endlessGame = new EndlessGame(this.endlessContainer);
    this.endlessBuildMode = null;

    // 全局状态（持久化）
    this.globalCoins = 0;
    this.globalTowerLevels = { arrow: 1, cannon: 1, ice: 1, lightning: 1 };
    this.unlockedLevels = 1;
    this.levelStars = {};
    this.pendingReward = 0;

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

  // 保存无尽模式当前状态快照
  saveEndlessSnapshot() {
    try {
      const eg = this.endlessGame;
      const snapshot = {
        dayNum: eg ? eg.dayNum : 1,
        kills: eg ? eg.kills : 0,
        coins: eg ? eg.coins : 0,
        wood: eg ? eg.wood : 0,
        stone: eg ? eg.stone : 0,
        baseHp: eg ? eg.baseHp : 100,
        savedAt: Date.now()
      };
      const data = {
        globalCoins: this.globalCoins,
        globalTowerLevels: this.globalTowerLevels,
        unlockedLevels: this.unlockedLevels,
        levelStars: this.levelStars,
        endlessSnapshot: snapshot
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      // ignore
    }
  }

  // ===== 回调设置 =====
  setupCallbacks() {
    // 主页导航
    this.ui.onNavigateToLevels = () => this.navigateToLevels();
    this.ui.onNavigateToUpgrade = () => this.navigateToUpgrade();
    this.ui.onNavigateToHome = () => this.navigateToHome();

    // 无尽模式入口
    const btnEndless = document.getElementById('btn-endless');
    if (btnEndless) {
      btnEndless.addEventListener('click', () => this.navigateToEndless());
    }

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

    // 无尽模式
    this.setupEndlessCallbacks();
  }

  // ===== 页面导航 =====
  navigateToHome() {
    this.game.cleanup();
    this.clearScene();
    this.endlessGame.stop();
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

  navigateToEndless() {
    this.game.cleanup();
    this.clearScene();
    this.ui.pageHome.classList.add('hidden');
    this.ui.pageLevels.classList.add('hidden');
    this.ui.pageUpgrade.classList.add('hidden');
    this.ui.pageGame.classList.add('hidden');
    document.getElementById('page-endless').classList.remove('hidden');
    document.getElementById('endless-overlay').classList.add('hidden');
    // 重置面板按钮
    document.querySelectorAll('#endless-panel .endless-panel-btn').forEach(b => b.classList.remove('selected'));
    this.endlessBuildMode = null;
    // 启动 3D 世界
    this.endlessGame.start();
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

  // ===== 无尽模式回调 =====
  setupEndlessCallbacks() {
    // 返回按钮：弹出确认退出对话框
    document.getElementById('btn-endless-back').addEventListener('click', () => {
      document.getElementById('endless-exit-confirm').classList.remove('hidden');
    });
    // 取消
    document.getElementById('endless-cancel-btn').addEventListener('click', () => {
      document.getElementById('endless-exit-confirm').classList.add('hidden');
    });
    // 确认退出并保存存档
    document.getElementById('endless-exit-btn').addEventListener('click', () => {
      this.saveEndlessSnapshot();
      document.getElementById('endless-exit-confirm').classList.add('hidden');
      this.navigateToHome();
    });

    // 底部面板按钮
    const panelBtns = document.querySelectorAll('#endless-panel .endless-panel-btn');
    panelBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        panelBtns.forEach(b => b.classList.remove('selected'));
        if (this.endlessBuildMode === action) {
          this.endlessBuildMode = null;
          this.endlessGame.setBuildMode(null);
        } else {
          this.endlessBuildMode = action;
          this.endlessGame.setBuildMode(action);
          btn.classList.add('selected');
        }
      });
    });

    // HUD 更新
    this.endlessGame.onHUDUpdate = (data) => {
      document.getElementById('endless-wood').textContent = data.wood;
      document.getElementById('endless-stone').textContent = data.stone;
      document.getElementById('endless-coins').textContent = data.coins;
      document.getElementById('endless-time').textContent = data.isNight ? '🌑 黑夜' : '☀️ 白天';
      document.getElementById('endless-day').textContent = data.dayNum;
      document.getElementById('endless-hp').textContent = data.hp;
    };

    // 游戏结束
    this.endlessGame.onGameOver = (dayNum, kills) => {
      document.getElementById('endless-result-days').textContent = dayNum;
      document.getElementById('endless-result-kills').textContent = kills;
      document.getElementById('endless-overlay').classList.remove('hidden');
    };

    // 重新开始
    document.getElementById('endless-restart-btn').addEventListener('click', () => {
      this.navigateToEndless();
    });
  }
}

// 启动
const app = new App();