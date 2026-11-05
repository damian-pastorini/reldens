/**
 *
 * Reldens - Test Rewards
 *
 * Tests kill rewards, item drops, and reward configuration. Also the notification balloon of the claimable rewards and
 * the default image of the reward events without an own image (the sample events have none).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRewards
{
    static DEFAULT_REWARD_IMAGE_SRC = '/assets/custom/rewards/default-reward.png';

    static async openRewardsPanel(page, longRun)
    {
        let pauseMs = TimeConstants.pauseMs(longRun);
        let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
        await page.locator(Selectors.hud.rewardsOpen).waitFor({ state: 'visible', timeout: uiTimeout });
        await page.click(Selectors.hud.rewardsOpen);
        await page.waitForTimeout(pauseMs);
        await expect(page.locator(Selectors.rewards.dialog)).toBeVisible({ timeout: uiTimeout });
        return { pauseMs };
    }

    static async loginAndOpenRewardsPanel(page, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        return await TestRewards.openRewardsPanel(page, longRun);
    }

    static async runNotificationBalloonTest(page, screenshots, gameConfig, longRun)
    {
        let serverTimeout = TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let balloon = page.locator(Selectors.rewards.notificationBalloon);
        await expect(balloon, 'The balloon must be shown while a reward can be claimed').toBeVisible(
            { timeout: serverTimeout }
        );
        await screenshots.capture(page, 'rewards-balloon-visible');
        await TestRewards.openRewardsPanel(page, longRun);
        let activeRewards = page.locator(Selectors.rewards.active);
        let activeRewardsCount = await activeRewards.count();
        expect(activeRewardsCount, 'The balloon is shown, so a reward must be claimable').toBeGreaterThan(0);
        for(let claimedCount = 1; claimedCount <= activeRewardsCount; claimedCount++){
            await activeRewards.first().click();
            await expect(activeRewards).toHaveCount(activeRewardsCount - claimedCount, { timeout: serverTimeout });
        }
        await expect(balloon, 'The balloon must be hidden after the last reward was claimed').toBeHidden(
            { timeout: serverTimeout }
        );
        await screenshots.capture(page, 'rewards-balloon-hidden');
    }

    static async runDefaultRewardImageTest(page, screenshots, gameConfig, longRun)
    {
        await TestRewards.loginAndOpenRewardsPanel(page, gameConfig, longRun);
        let rewardImage = page.locator(Selectors.rewards.image).first();
        await expect(rewardImage).toHaveAttribute('src', TestRewards.DEFAULT_REWARD_IMAGE_SRC);
        await expect.poll(
            async () => await rewardImage.evaluate(image => image.naturalWidth),
            { message: 'The default reward image must be loaded' }
        ).toBeGreaterThan(0);
        await screenshots.capture(page, 'rewards-default-image');
    }

    static run()
    {
        test.describe('Rewards', () => {
            test('rewards panel opens and shows rewards list', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestRewards.loginAndOpenRewardsPanel(page, gameConfig, longRun);
                await expect(page.locator(Selectors.rewards.content)).toBeVisible(
                    { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
                );
                await screenshots.capture(page, 'rewards-panel-open');
            });
            test('player can claim an active daily login reward', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestRewards.loginAndOpenRewardsPanel(page, gameConfig, longRun);
                let activeReward = page.locator(Selectors.rewards.active).first();
                let hasActive = await activeReward.isVisible().catch(() => false);
                expect(hasActive, 'No active reward available to claim').toBeTruthy();
                await screenshots.capture(page, 'active-reward-visible');
                await activeReward.click();
                await expect(page.locator(Selectors.rewards.accepted)).toBeVisible(
                    { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
                );
                await screenshots.capture(page, 'reward-accepted');
            });
            test('rewards balloon shows until the last active reward is claimed', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestRewards.runNotificationBalloonTest(page, screenshots, gameConfig, longRun);
            });
            test('reward events without an image show the default reward image', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestRewards.runDefaultRewardImageTest(page, screenshots, gameConfig, longRun);
            });
        });
    }
}

TestRewards.run();
