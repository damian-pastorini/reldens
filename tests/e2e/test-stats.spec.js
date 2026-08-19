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
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestStats
{
    static async loginRootPlayer(page, gameConfig, longRun, scene = null)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(page, username, password, playerName, longRun, false, scene);
    }

    static getPlayerExpFromState(page)
    {
        return page.evaluate(() => {
            let element = document.querySelector('.experience-container .current-experience');
            if(!element){
                return null;
            }
            return (element.textContent || '').trim();
        });
    }

    static async chaseEnemyForRange(page, enemyKey, range, timeout)
    {
        return Navigation.moveToObjectWithinRange(
            page,
            enemyKey ? 'asset_key' : 'type',
            enemyKey || 'enemy',
            enemyKey ? 'active' : 'visible',
            range,
            timeout
        );
    }

    static async runXpTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun)
            + TimeConstants.ENEMY_KILL
        );
        await TestStats.loginRootPlayer(page, gameConfig, longRun, 'reldens-forest');
        let pauseMs = TimeConstants.pauseMs(longRun);
        let enemyKey = gameConfig.e2eEnemyKey || '';
        let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        let navTimeout = TimeConstants.forLongRun(TimeConstants.NAVIGATION, longRun);
        let inForest = await Navigation.ensureInRoom(page, 'reldens-forest', 608, 16, navTimeout);
        expect(inForest, 'Player must reach reldens-forest for XP test').toBeTruthy();
        await (enemyKey
            ? Phaser.waitForObjectByAssetKey(page, enemyKey, sceneTimeout)
            : Phaser.waitForObjectByType(page, 'enemy', sceneTimeout));
        let xpBefore = await TestStats.getPlayerExpFromState(page);
        expect(xpBefore, 'Player XP must be readable from room state before attack').not.toBeNull();
        await screenshots.capture(page, 'xp-before-attack');
        await TestStats.chaseEnemyForRange(page, enemyKey, 100, navTimeout);
        let killDeadline = Date.now() + TimeConstants.ENEMY_KILL;
        let killMaxSteps = Math.ceil(TimeConstants.ENEMY_KILL / 1500) + 1;
        let xpIncreased = false;
        for(let i = 0; i < killMaxSteps; i++){
            if(Date.now() >= killDeadline){
                break;
            }
            let xpNow = await TestStats.getPlayerExpFromState(page);
            if(null !== xpNow && xpNow !== xpBefore && '' !== xpNow){
                xpIncreased = true;
                break;
            }
            await Phaser.targetEnemy(page, enemyKey || null);
            await page.click('#fireball', { force: true }).catch(() => {
                return null;
            });
            await page.waitForTimeout(500);
            await page.click('#attackBullet', { force: true }).catch(() => {
                return null;
            });
            await page.waitForTimeout(500);
            await page.click('#attackShort', { force: true }).catch(() => {
                return null;
            });
            await page.waitForTimeout(Math.min(500, Math.max(0, killDeadline - Date.now())));
            await TestStats.chaseEnemyForRange(page, enemyKey, 100, Math.min(3000, killDeadline - Date.now()));
        }
        await page.waitForTimeout(1000 + pauseMs);
        let xpAfter = await TestStats.getPlayerExpFromState(page);
        expect(xpAfter, 'Player XP must be readable from room state after attack').not.toBeNull();
        expect(xpIncreased || (xpAfter !== xpBefore && '' !== xpAfter), 'Player XP must increase after defeating an enemy').toBeTruthy();
        await screenshots.capture(page, 'xp-after-attack');
    }

    static run()
    {
        test.describe('Stats and Progression', () => {
            test('stats panel opens and shows stat values', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestStats.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = TimeConstants.pauseMs(longRun);
                await page.click(Selectors.hud.playerStatsOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.hud.playerStatsUi)).toBeVisible();
                let statValues = await page.locator(Selectors.stats.value).allTextContents();
                expect(statValues.length).toBeGreaterThan(0);
                await screenshots.capture(page, 'stats-panel-open');
            });
            test('level and experience are displayed in stats', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestStats.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = TimeConstants.pauseMs(longRun);
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
                let pauseMs = TimeConstants.pauseMs(longRun);
                await page.click(Selectors.hud.scoresOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.scores.dialog)).toBeVisible(
                    { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
                );
                await expect(page.locator(Selectors.scores.dialogTitle)).toBeVisible();
                await expect(page.locator(Selectors.scores.dialogContent)).not.toBeEmpty();
                await screenshots.capture(page, 'scores-panel-open');
            });
        });
    }
}

TestStats.run();
