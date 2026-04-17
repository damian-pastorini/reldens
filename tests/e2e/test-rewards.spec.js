/**
 *
 * Reldens - Test Rewards
 *
 * Tests kill rewards, item drops, and reward configuration.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRewards
{
    static async loginRootPlayer(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
    }

    static async loginAndOpenRewardsPanel(page, gameConfig, longRun)
    {
        await TestRewards.loginRootPlayer(page, gameConfig, longRun);
        let pauseMs = longRun ? 800 : 0;
        await page.click(Selectors.hud.rewardsOpen);
        await page.waitForTimeout(pauseMs);
        await expect(page.locator(Selectors.rewards.dialog)).toBeVisible({ timeout: 10000 });
        return { pauseMs };
    }

    static run()
    {
        test.describe('Rewards', () => {

            test('rewards panel opens and shows rewards list', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestRewards.loginAndOpenRewardsPanel(page, gameConfig, longRun);
                await expect(page.locator(Selectors.rewards.content)).toBeVisible({ timeout: 10000 });
                await screenshots.capture(page, 'rewards-panel-open');
            });

            test('player can claim an active daily login reward', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestRewards.loginAndOpenRewardsPanel(page, gameConfig, longRun);
                let activeReward = page.locator(Selectors.rewards.active).first();
                let hasActive = await activeReward.isVisible().catch(() => false);
                test.skip(!hasActive, 'No active reward available to claim');
                await screenshots.capture(page, 'active-reward-visible');
                await activeReward.click();
                await expect(page.locator(Selectors.rewards.accepted)).toBeVisible({ timeout: 10000 });
                await screenshots.capture(page, 'reward-accepted');
            });

        });
    }
}

TestRewards.run();
