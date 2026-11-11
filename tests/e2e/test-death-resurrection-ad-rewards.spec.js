/**
 *
 * Reldens - Test Death Resurrection Ad Rewards
 *
 * Tests when the resurrection ad is offered and when its reward revives the dead player (DeathResurrectionAdSteps):
 * the ad is not offered with its provider disabled or with no resurrection ad key; with the auto revive off the box
 * shows the ad button and the seconds left, the reward shows the item message and the revive button consumes it in the
 * forest; the revive button clicked while the ad still plays keeps the player dead until the reward revives it in the
 * forest; a finished ad stores its played row with both dates; an ad without reward item and an ad ended before the
 * provider minimum duration give no item and the player revives in town; a failed ad is offered again, plays to its end
 * and the player revives in town (the play after a failure is never rewarded, a reported issue); and a
 * different ad started by the dead player is not a resurrection ad: the player is not disabled and is revived in town
 * on time.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathResurrectionAdSteps } = require('./helpers/death-resurrection-ad-steps');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathReviveShowcase } = require('./helpers/death-revive-showcase');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { TimeConstants } = require('./helpers/time-constants');
const { Login } = require('./helpers/login');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { AdsConst } = require('../../lib/ads/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathResurrectionAdRewards
{

    static QUIET_MS = 1500;
    static AD_EXTRA_MS = 6000;
    static OTHER_AD_KEY = 'crazy-games-sample-video';

    static async fetchAdConfigPath(context, propertyPath)
    {
        return AdsConst.CONFIG_PATHS.COLLECTION+'/'+await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'ads', {
            key: await E2eSeedAndRestoreApi.fetchConfigValue(
                context.gameConfig,
                ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY
            )
        })+'/'+propertyPath;
    }

    static async expectTownReviveWithoutItem(context, adDeath, resurrectionAdButtons)
    {
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, resurrectionAdButtons);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, adDeath.restorationItemKey, 0);
    }

    static async runProviderDisabledTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {
            [await TestDeathResurrectionAdRewards.fetchAdConfigPath(context, 'provider/enabled')]: 0
        }, 0);
        await TestDeathResurrectionAdRewards.expectTownReviveWithoutItem(context, adDeath, 0);
    }

    static async runEmptyAdsKeyTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(
            context,
            {[ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY]: ''},
            0
        );
        await TestDeathResurrectionAdRewards.expectTownReviveWithoutItem(context, adDeath, 0);
    }

    static async runManualReviveAdTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(
            context,
            DeathReviveSteps.MANUAL_REVIVE_CONFIG,
            0
        );
        await DeathReviveSteps.expectReviveWait(context);
        await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.resurrectionAdButton);
        await AdMessagesPlayer.waitForPlayedAd(context.page, adDeath.resurrectionAd, adDeath.adTimeout);
        await DeathReviveSteps.expectItemReviveMessage(context, adDeath.restorationItemKey);
        await expect(context.page.locator(Selectors.gameOver.wait), 'The wait is still shown').toBeVisible();
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectItemConsumedInForest(context, adDeath.restorationItemKey);
    }

    static async runReviveWhileAdPlaysTest(context)
    {
        let adDuration = Number(await E2eSeedAndRestoreApi.fetchConfigValue(
            context.gameConfig,
            ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT
        )) + TestDeathResurrectionAdRewards.AD_EXTRA_MS;
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, Object.assign(
            {[DeathResurrectionAdSteps.CLIENT_VIDEO_DURATION_PATH]: adDuration},
            DeathReviveSteps.MANUAL_REVIVE_CONFIG
        ), 0);
        test.setTimeout(test.info().timeout + adDuration);
        await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.resurrectionAdButton);
        let adOverlay = context.page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR);
        await expect(adOverlay, 'The ad plays').toBeVisible({timeout: adDeath.adTimeout});
        await expect(context.page.locator(Selectors.gameOver.reviveButton)).toBeVisible(
            {timeout: TimeConstants.PLAYER_REVIVE}
        );
        await RoomMessagesRecorder.sendMessage(context.page, {act: ActionsConst.DEATH.ACTIONS.REVIVE_REQUEST});
        await context.page.waitForTimeout(TestDeathResurrectionAdRewards.QUIET_MS);
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState,
            'The revive waits for the ad still playing'
        ).toBe(GameConst.STATUS.DEATH);
        await expect(adOverlay, 'The ad still plays').toBeVisible();
        await expect(adOverlay, 'The ad ends').toBeHidden({timeout: adDuration});
        await DeathReviveSteps.expectItemConsumedInForest(context, adDeath.restorationItemKey);
    }

    static async runPlayedRowTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 0);
        await DeathResurrectionAdSteps.playAdAndExpectRevivedInForest(context, adDeath);
        let playedAds = await DeathResurrectionAdSteps.fetchPlayedAds(context, adDeath.resurrectionAd.id);
        expect(playedAds, 'One played ad row').toHaveLength(1);
        expect(
            [Boolean(playedAds[0].started_at), Boolean(playedAds[0].ended_at)],
            'The played ad keeps its start and end'
        ).toEqual([true, true]);
    }

    static async runNoRewardItemTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {
            [await TestDeathResurrectionAdRewards.fetchAdConfigPath(context, 'rewardItemKey')]: ''
        }, 0);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.resurrectionAdButton);
        await AdMessagesPlayer.waitForPlayedAd(context.page, adDeath.resurrectionAd, adDeath.adTimeout);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, adDeath.restorationItemKey, 0);
    }

    static async runEarlyAdEndTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 0);
        let adId = adDeath.resurrectionAd.id;
        await RoomMessagesRecorder.sendMessages(context.page, [
            {act: AdsConst.ACTIONS.AD_STARTED, ads_id: adId},
            {act: AdsConst.ACTIONS.AD_ENDED, ads_id: adId}
        ]);
        await TestDeathResurrectionAdRewards.expectTownReviveWithoutItem(context, adDeath, 1);
    }

    static async runFailedAdPlayedAgainTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 0);
        await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await AdMessagesPlayer.failNextAd(context.page, adDeath.adTimeout);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.resurrectionAdButton);
        await AdMessagesPlayer.waitForPlayedAd(context.page, adDeath.resurrectionAd, adDeath.adTimeout);
        await context.page.waitForTimeout(TestDeathResurrectionAdRewards.QUIET_MS);
        let adButton = context.page.locator(Selectors.gameOver.resurrectionAdButton);
        await expect(adButton, 'The failed ad is offered again').toHaveCount(1);
        await adButton.click();
        await AdMessagesPlayer.waitForPlayedAd(context.page, adDeath.resurrectionAd, adDeath.adTimeout);
        await DeathReviveSteps.expectRevivedInTown(
            context,
            (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom.name
        );
    }

    static async runOtherAdTest(context)
    {
        let otherAd = await AdMessagesPlayer.enableAd(
            context.gameConfig,
            context.e2eGroup,
            TestDeathResurrectionAdRewards.OTHER_AD_KEY,
            context.gameConfig.e2ePlayerName
        );
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 0);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await RoomMessagesRecorder.sendMessage(context.page, {act: AdsConst.ACTIONS.AD_STARTED, ads_id: otherAd.id});
        await context.page.waitForTimeout(TestDeathResurrectionAdRewards.QUIET_MS);
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState,
            'The dead player is not disabled by another ad'
        ).toBe(GameConst.STATUS.DEATH);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, adDeath.restorationItemKey, 0);
    }

    static run()
    {
        test.describe('Death Resurrection Ad Rewards', () => {
            test('resurrection ad with its provider disabled is not offered', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAdRewards.runProviderDisabledTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('empty resurrection ad key offers no ad', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAdRewards.runEmptyAdsKeyTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('without auto revive the ad reward is consumed by the revive button in the forest', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAdRewards.runManualReviveAdTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('revive clicked while the ad plays waits for its reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAdRewards.runReviveWhileAdPlaysTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('finished resurrection ad stores its played row with both dates', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAdRewards.runPlayedRowTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('resurrection ad without reward item revives the player in town without item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAdRewards.runNoRewardItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('ad ended before the provider minimum duration gives no reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAdRewards.runEarlyAdEndTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('failed ad offered again plays and the player revives in town', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAdRewards.runFailedAdPlayedAgainTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('another ad started by the dead player is not a resurrection ad', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAdRewards.runOtherAdTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestDeathResurrectionAdRewards.run();
