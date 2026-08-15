/**
 * Shop & Persistence Manager (LocalStorage, Upgrades & Character Skins)
 */
class ShopManager {
    constructor() {
        this.STORAGE_KEY = 'temple_run_3d_save_v1';
        this.data = {
            bestScore: 0,
            totalCoins: 0,
            selectedSkin: 'explorer',
            unlockedSkins: ['explorer'],
            upgrades: {
                magnet: 1,      // Level 1-5
                shield: 1,      // Level 1-5
                boost: 1,       // Level 1-5
                multiplier: 1   // Level 1-5
            }
        };

        this.costs = {
            upgrades: {
                magnet: [150, 300, 600, 1200, 2500],
                shield: [200, 400, 800, 1500, 3000],
                boost: [250, 500, 1000, 2000, 4000],
                multiplier: [200, 450, 900, 1800, 3500]
            },
            skins: {
                explorer: 0,
                ninja: 500,
                golden: 1200,
                cyber: 2500
            }
        };

        this.loadData();
    }

    loadData() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.data = { ...this.data, ...parsed };
            }
        } catch (e) {
            console.warn('Could not load saved data from localStorage', e);
        }
    }

    saveData() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Could not save data to localStorage', e);
        }
    }

    saveRunStats(score, coins) {
        let isNewRecord = false;
        if (score > this.data.bestScore) {
            this.data.bestScore = score;
            isNewRecord = true;
        }
        this.data.totalCoins += coins;
        this.saveData();
        return isNewRecord;
    }

    getUpgradeLevel(type) {
        return this.data.upgrades[type] || 1;
    }

    getUpgradeCost(type) {
        const lvl = this.getUpgradeLevel(type);
        if (lvl >= 5) return null; // Max level reached
        return this.costs.upgrades[type][lvl - 1];
    }

    getPowerupDuration(type) {
        const lvl = this.getUpgradeLevel(type);
        // Base 5s + 2s per upgrade level
        return 5 + (lvl - 1) * 2;
    }

    upgradePowerup(type) {
        const cost = this.getUpgradeCost(type);
        if (cost !== null && this.data.totalCoins >= cost) {
            this.data.totalCoins -= cost;
            this.data.upgrades[type] = (this.data.upgrades[type] || 1) + 1;
            this.saveData();
            return true;
        }
        return false;
    }

    buySkin(skinId) {
        if (this.data.unlockedSkins.includes(skinId)) return true;
        const cost = this.costs.skins[skinId];
        if (cost !== undefined && this.data.totalCoins >= cost) {
            this.data.totalCoins -= cost;
            this.data.unlockedSkins.push(skinId);
            this.data.selectedSkin = skinId;
            this.saveData();
            return true;
        }
        return false;
    }

    selectSkin(skinId) {
        if (this.data.unlockedSkins.includes(skinId)) {
            this.data.selectedSkin = skinId;
            this.saveData();
            return true;
        }
        return false;
    }

    getSelectedSkin() {
        return this.data.selectedSkin || 'explorer';
    }
}

const shopManager = new ShopManager();
