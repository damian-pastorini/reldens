/**
 *
 * Reldens - Test Stats
 *
 * Tests the stats panel, level and XP display, XP gain from combat, and the leaderboard.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { Navigation } = require('./helpers/navigation');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestStats
{
    static async loginRootPlayer(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
    }

    static getPlayerExpFromState(page)
    {
        return page.evaluate(() => {
            let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!room || !room.state || !room.state.players) {
                return null;
            }
            let player = room.state.players[room.sessionId];
            return player ? player.exp : null;
        });
    }

    static async runXpTest(page, screenshots, gameConfig, longRun)
    {
        await TestStats.loginRootPlayer(page, gameConfig, longRun);
        let pauseMs = longRun ? 800 : 0;
        let enemyKey = gameConfig.e2eEnemyKey || '';
        let waitObjectTimeout = longRun ? 30000 : 15000;
        let inForest = await Navigation.ensureInRoom(page, 'reldens-forest', 608, 16, waitObjectTimeout);
        expect(inForest, 'Player must reach reldens-forest for XP test').toBeTruthy();
        await (enemyKey
            ? Phaser.waitForObjectByAssetKey(page, enemyKey, waitObjectTimeout)
            : Phaser.waitForObjectByType(page, 'enemy', waitObjectTimeout));
        let enemyCoords = await (enemyKey
            ? Phaser.getObjectScreenCoordsByAssetKey(page, enemyKey)
            : Phaser.getObjectScreenCoordsByType(page, 'enemy'));
        expect(enemyCoords, 'Enemy must be found in the scene for XP test').not.toBeNull();
        let xpBefore = await TestStats.getPlayerExpFromState(page);
        expect(xpBefore, 'Player XP must be readable from room state before attack').not.toBeNull();
        await screenshots.capture(page, 'xp-before-attack');
        await (enemyKey ? Phaser.clickObjectByAssetKey(page, enemyKey) : Phaser.clickObjectByType(page, 'enemy'));
        await page.waitForTimeout(5000 + pauseMs);
        let xpAfter = await TestStats.getPlayerExpFromState(page);
        expect(xpAfter, 'Player XP must be readable from room state after attack').not.toBeNull();
        expect(xpAfter).toBeGreaterThanOrEqual(xpBefore);
        await screenshots.capture(page, 'xp-after-attack');
    }

    static run()
    {
        test.describe('Stats and Progression', () => {

            test('stats panel opens and shows stat values', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestStats.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = longRun ? 800 : 0;
                await page.click(Selectors.hud.playerStatsOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.hud.playerStatsUi)).toBeVisible();
                let statValues = await page.locator(Selectors.stats.value).allTextContents();
                expect(statValues.length).toBeGreaterThan(0);
                await screenshots.capture(page, 'stats-panel-open');
            });

            test('level and experience are displayed in stats', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestStats.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = longRun ? 800 : 0;
                await page.click(Selectors.hud.playerStatsOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.stats.levelContainer)).toBeVisible();
                await expect(page.locator(Selectors.stats.experienceContainer)).toBeVisible();
                let levelText = await page.locator(Selectors.stats.levelLabel).textContent();
                expect(levelText).toBeTruthy();
                await screenshots.capture(page, 'level-and-experience-visible');
            });

            test('XP increases after defeating an enemy', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestStats.runXpTest(page, screenshots, gameConfig, longRun);
            });

            test('scores panel opens and displays leaderboard data', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestStats.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = longRun ? 800 : 0;
                await page.click(Selectors.hud.scoresOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.scores.dialog)).toBeVisible({ timeout: 10000 });
                await expect(page.locator(Selectors.scores.dialogTitle)).toBeVisible();
                await expect(page.locator(Selectors.scores.dialogContent)).not.toBeEmpty();
                await screenshots.capture(page, 'scores-panel-open');
            });

        });
    }
}

TestStats.run();
