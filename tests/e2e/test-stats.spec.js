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
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestStats
{

    static ONE_HIT_LIFE = 1;
    static ATTACK_SKILL_KEY = 'attackShort';
    static ATTACK_STEP_MS = 500;

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

    static async runXpTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun)
            + TimeConstants.ENEMY_KILL
        );
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        let enemyKey = gameConfig.e2eEnemyKey || '';
        await Phaser.waitForObjectByAssetKey(page, enemyKey, forestData.sceneTimeout);
        let xpBefore = Number(await TestStats.getPlayerExpFromState(page));
        await screenshots.capture(page, 'xp-before-attack');
        let placement = await RoomObjectsApi.placeAndTargetEnemy(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            enemyKey,
            TestStats.ONE_HIT_LIFE,
            forestData.sceneTimeout
        );
        expect(placement.targeted, 'The placed enemy must be targeted: '+sc.toJsonString(placement)).toBe(true);
        expect(placement.experience, 'The enemy rewards must give experience').toBeGreaterThan(0);
        let expectedXp = xpBefore + placement.experience;
        await TestStats.attackUntilExperience(page, expectedXp, TimeConstants.ENEMY_KILL);
        expect(Number(await TestStats.getPlayerExpFromState(page))).toBe(expectedXp);
        await screenshots.capture(page, 'xp-after-attack');
    }

    static async attackUntilExperience(page, expectedXp, timeout)
    {
        for(let step = 0; step < Math.ceil(timeout / TestStats.ATTACK_STEP_MS); step++){
            if(expectedXp === Number(await TestStats.getPlayerExpFromState(page))){
                return true;
            }
            await page.click(Selectors.combat.skillButton(TestStats.ATTACK_SKILL_KEY), {force: true});
            await page.waitForTimeout(TestStats.ATTACK_STEP_MS);
        }
        return false;
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
