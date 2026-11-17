/**
 *
 * Reldens - Test Death Resurrection Ad
 *
 * Tests the resurrection ad of the game over box (DeathResurrectionAdSteps enables it with the client provider SDK mock
 * and kills the player in the forest): the ad start message ("adS") of an alive player is rejected (no played ad stored,
 * the player is not disabled) and a second start in the same death is not stored again; a failed ad (the mock fails the
 * next ad) and an ad start rejected by the ads system (the ad not replayable and already played) stop the wait, give no
 * item and the player revives in the town room; a game over time that ends while the ad plays waits for its reward,
 * which revives the player where it died; an ad that plays longer than the videos maximum duration is not waited for,
 * the player revives in the town room and the late reward stays in its inventory with no game over message; the ad is
 * not offered to a player carrying the restoration item or that kept it, while a restoration item row with no quantity
 * is no item (town message with the ad offered); its reward with the item asked counts as the choice to use it; and the
 * ad button clicked twice plays one rewarded ad.
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
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathResurrectionAd
{

    static QUIET_MS = 1500;
    static AD_EXTRA_MS = 6000;

    static adMessage(act, adId)
    {
        return {act, ads_id: adId};
    }

    static async loadGameOverTimeOut(context)
    {
        return Number(await E2eSeedAndRestoreApi.fetchConfigValue(
            context.gameConfig,
            ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT
        ));
    }

    static async clickAd(context, adDeath)
    {
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.resurrectionAdButton);
        await expect(context.page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR), 'The ad plays').toBeVisible(
            {timeout: adDeath.adTimeout}
        );
    }

    static async runAlivePlayerAdStartTest(context)
    {
        let resurrectionAd = await DeathResurrectionAdSteps.enableResurrectionAd(context);
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await RoomMessagesRecorder.sendMessage(
            context.page,
            TestDeathResurrectionAd.adMessage(AdsConst.ACTIONS.AD_STARTED, resurrectionAd.id)
        );
        await context.page.waitForTimeout(TestDeathResurrectionAd.QUIET_MS);
        expect(await DeathResurrectionAdSteps.fetchPlayedAds(context, resurrectionAd.id), 'No played ad').toEqual([]);
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState,
            'The alive player is not disabled by the ad'
        ).toBe(GameConst.STATUS.ACTIVE);
    }

    static async runSecondAdStartTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 0);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        let adId = adDeath.resurrectionAd.id;
        let adStart = TestDeathResurrectionAd.adMessage(AdsConst.ACTIONS.AD_STARTED, adId);
        await RoomMessagesRecorder.sendMessage(context.page, adStart);
        await expect.poll(
            async () => (await DeathResurrectionAdSteps.fetchPlayedAds(context, adId)).length,
            {message: 'The first start is stored', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
        let firstStarts = (await DeathResurrectionAdSteps.fetchPlayedAds(context, adId)).map(row => row.started_at);
        await context.page.waitForTimeout(TestDeathResurrectionAd.QUIET_MS);
        await RoomMessagesRecorder.sendMessage(context.page, adStart);
        await context.page.waitForTimeout(TestDeathResurrectionAd.QUIET_MS);
        expect(
            (await DeathResurrectionAdSteps.fetchPlayedAds(context, adId)).map(row => row.started_at),
            'The second start in the same death is not stored'
        ).toEqual(firstStarts);
        await RoomMessagesRecorder.sendMessage(
            context.page,
            TestDeathResurrectionAd.adMessage(AdsConst.ACTIONS.AD_FAILED, adId)
        );
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
    }

    static async runFailedAdTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 0);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await AdMessagesPlayer.failNextAd(context.page, adDeath.adTimeout);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.resurrectionAdButton);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, adDeath.restorationItemKey, 0);
    }

    static async runRejectedAdStartTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 0);
        let gameConfig = context.gameConfig;
        let adId = adDeath.resurrectionAd.id;
        await E2eSeedAndRestoreApi.overrideConfig(
            gameConfig,
            context.e2eGroup,
            AdsConst.CONFIG_PATHS.COLLECTION+'/'+adId+'/replay',
            false
        );
        await E2eSeedAndRestoreApi.createRow(gameConfig, context.e2eGroup, 'adsPlayed', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName}),
            ads_id: adId,
            started_at: sc.getCurrentDate(),
            ended_at: sc.getCurrentDate()
        });
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await TestDeathResurrectionAd.clickAd(context, adDeath);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await expect(context.page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR), 'The ad ended').toBeHidden(
            {timeout: adDeath.resurrectionAd.minimumDurationMs + AdMessagesPlayer.PLAY_MARGIN_MS}
        );
        await context.page.waitForTimeout(TestDeathResurrectionAd.QUIET_MS);
        await DeathReviveSteps.expectRestorationItemQuantity(context, adDeath.restorationItemKey, 0);
    }

    static async runAdPlayingAtGameOverTest(context)
    {
        let adDuration = await TestDeathResurrectionAd.loadGameOverTimeOut(context) + TestDeathResurrectionAd.AD_EXTRA_MS;
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(
            context,
            {[DeathResurrectionAdSteps.CLIENT_VIDEO_DURATION_PATH]: adDuration},
            0
        );
        let deathTime = Date.now();
        test.setTimeout(test.info().timeout + adDuration);
        await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await TestDeathResurrectionAd.clickAd(context, adDeath);
        await context.page.waitForTimeout(
            Math.max(0, deathTime + context.gameOverTimeOut + TestDeathResurrectionAd.QUIET_MS - Date.now())
        );
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState,
            'The game over time passed while the ad plays: the player waits for its reward'
        ).toBe(GameConst.STATUS.DEATH);
        let adOverlay = context.page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR);
        await expect(adOverlay, 'The ad still plays').toBeVisible();
        await context.screenshots.capture(context.page, 'dead-while-the-resurrection-ad-plays');
        await expect(adOverlay, 'The ad ends').toBeHidden({timeout: adDuration});
        await DeathReviveSteps.expectRevivedInForest(context, adDeath.restorationItemKey);
    }

    static async runAdLongerThanMaximumTest(context)
    {
        let gameOverTimeOut = await TestDeathResurrectionAd.loadGameOverTimeOut(context);
        let adDuration = gameOverTimeOut + TestDeathResurrectionAd.AD_EXTRA_MS;
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {
            [DeathResurrectionAdSteps.CLIENT_VIDEO_DURATION_PATH]: adDuration,
            [AdsConst.CONFIG_PATHS.VIDEOS_MAXIMUM_DURATION]: gameOverTimeOut
        }, 0);
        test.setTimeout(test.info().timeout + adDuration);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await TestDeathResurrectionAd.clickAd(context, adDeath);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        let adOverlay = context.page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR);
        await expect(adOverlay, 'The player revived before the ad ended').toBeVisible();
        await DeathReviveSteps.expectRestorationItemQuantity(context, adDeath.restorationItemKey, 0);
        await RoomMessagesRecorder.start(context.page);
        await expect(adOverlay).toBeHidden({timeout: adDuration});
        await expect.poll(
            async () => await DeathResurrectionAdSteps.fetchRewardQuantity(context, adDeath),
            {message: 'The late reward stays in the inventory', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
        expect(
            await RoomMessagesRecorder.fetchMessages(context.page, ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE),
            'No game over message for the late reward'
        ).toEqual([]);
        await expect(context.page.locator(Selectors.gameOver.box)).toBeHidden();
        await context.screenshots.capture(context.page, 'late-resurrection-reward-in-town');
    }

    static async runCarriedItemNoAdTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 1);
        await DeathReviveSteps.expectItemReviveMessage(context, adDeath.restorationItemKey);
        await DeathReviveSteps.expectItemConsumedInForest(context, adDeath.restorationItemKey);
    }

    static async runKeptItemNoAdTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(
            context,
            DeathReviveSteps.ASKED_ITEM_CONFIG,
            1
        );
        await DeathReviveSteps.expectRestorationItemQuestion(context, adDeath.restorationItemKey);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.restorationItemKeepButton);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, adDeath.restorationItemKey, 1);
    }

    static async runEmptyItemRowTest(context)
    {
        let restorationItemKey = await E2eSeedAndRestoreApi.fetchConfigValue(
            context.gameConfig,
            ActionsConst.DEATH.CONFIG_PATHS.RESTORATION_ITEM_KEY
        );
        await DeathReviveSteps.seedRestorationItems(context, restorationItemKey, 0);
        await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 0);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 0);
    }

    static async runAskedItemAdRewardTest(context)
    {
        await DeathResurrectionAdSteps.playAdAndExpectRevivedInForest(
            context,
            await DeathResurrectionAdSteps.killWithResurrectionAd(context, DeathReviveSteps.ASKED_ITEM_CONFIG, 0)
        );
    }

    static async runDoubleClickAdTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 0);
        await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await context.page.locator(Selectors.gameOver.resurrectionAdButton).dblclick();
        await AdMessagesPlayer.waitForPlayedAd(context.page, adDeath.resurrectionAd, adDeath.adTimeout);
        await DeathReviveSteps.expectRevivedInForest(context, adDeath.restorationItemKey);
        await context.page.waitForTimeout(adDeath.resurrectionAd.minimumDurationMs + AdMessagesPlayer.PLAY_MARGIN_MS);
        await DeathReviveSteps.expectRestorationItemQuantity(context, adDeath.restorationItemKey, 0);
        expect(
            await DeathResurrectionAdSteps.fetchPlayedAds(context, adDeath.resurrectionAd.id),
            'One played ad'
        ).toHaveLength(1);
    }

    static run()
    {
        test.describe('Death Resurrection Ad', () => {
            test('resurrection ad start of an alive player is rejected', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAd.runAlivePlayerAdStartTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second resurrection ad start in the same death is not stored', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAd.runSecondAdStartTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('failed resurrection ad gives no item and the player revives in town', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAd.runFailedAdTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('resurrection ad start rejected by the ads system revives the player in town without reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAd.runRejectedAdStartTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('game over time ending while the ad plays waits for its reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAd.runAdPlayingAtGameOverTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('ad longer than the videos maximum duration is not waited for and its late reward is kept', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAd.runAdLongerThanMaximumTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('resurrection ad is not offered to a player carrying the restoration item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAd.runCarriedItemNoAdTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('resurrection ad is not offered once the restoration item is kept', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAd.runKeptItemNoAdTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('restoration item row with no quantity is no item: town revive with the ad offered', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAd.runEmptyItemRowTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('resurrection ad reward with the item asked counts as the choice to use it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAd.runAskedItemAdRewardTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('resurrection ad button clicked twice plays one rewarded ad', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathResurrectionAd.runDoubleClickAdTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestDeathResurrectionAd.run();
