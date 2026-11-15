/**
 *
 * Reldens - Test Ads Event Videos
 *
 * Tests the event video ads played on a room activation (exclusive group, the sample room ad enabled with the e2e SDK
 * mock through AdMessagesPlayer and the mock loaded with the page like the real game SDK, the played ads and the inventory rows of the player preserved and restored by the
 * group reset): the room ad plays when the player logs in to its room, requested as a rewarded ad since it has a reward
 * item, and rewards its item without any ticket, and the played ad is stored as ended; a played room ad that is not replayable is not requested again when the player walks to
 * the forest and back to the town (the played ads list of the new join includes it); and a reward quantity above one of a
 * single instance item (the sample coins) adds the whole quantity.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { AdsConst } = require('../../lib/ads/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdsEventVideos
{

    static ROOM_AD_KEY = 'crazy-games-sample-video';
    static ROOM_ACTIVATION_EVENT_PREFIX = 'reldens.activatedRoom_';
    static REWARD_QUANTITY = 3;
    static AD_TITLE_SELECTOR = '.mock-ad-title';
    static REWARDED_AD_TITLE = 'Mocked rewarded video ad';

    static async loadRoomAd(context)
    {
        let gameConfig = context.gameConfig;
        let playerName = gameConfig.e2ePlayerName;
        let roomAd = await AdMessagesPlayer.enableAd(gameConfig, context.e2eGroup, TestAdsEventVideos.ROOM_AD_KEY, playerName);
        await AdMessagesPlayer.loadSdkWithPage(context.page);
        let adVideoRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'adsEventVideo', {ads_id: roomAd.id})].shift();
        expect(adVideoRow.event_key, 'The sample room ad plays on the activation of the group start room').toBe(
            TestAdsEventVideos.ROOM_ACTIVATION_EVENT_PREFIX+Login.TOWN_ROOM_NAME
        );
        let eventData = sc.toJson(adVideoRow.event_data, {});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, context.e2eGroup, 'itemsInventory', {
            owner_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName})
        });
        return Object.assign(roomAd, {
            playerName,
            eventKey: adVideoRow.event_key,
            rewardItemKey: eventData.rewardItemKey,
            rewardItemQty: Number(eventData.rewardItemQty),
            rewardsBefore: await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, playerName, eventData.rewardItemKey)
        });
    }

    static async fetchPlayedAds(context, roomAd)
    {
        return await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'adsPlayed', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'players', {name: roomAd.playerName}),
            ads_id: roomAd.id
        });
    }

    static async expectRewards(context, roomAd, expectedQty, message)
    {
        await expect.poll(
            async () => await E2eSeedAndRestoreApi.fetchInventoryQuantity(
                context.gameConfig,
                roomAd.playerName,
                roomAd.rewardItemKey
            ),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(roomAd.rewardsBefore + expectedQty);
    }

    static async runRoomEnterAdTest(context)
    {
        let roomAd = await TestAdsEventVideos.loadRoomAd(context);
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await expect(
            context.page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR+' '+TestAdsEventVideos.AD_TITLE_SELECTOR),
            'The room ad with a reward item is requested as a rewarded ad'
        ).toHaveText(TestAdsEventVideos.REWARDED_AD_TITLE, {timeout: TimeConstants.UI_OPEN});
        await AdMessagesPlayer.waitForPlayedAd(context.page, roomAd, TimeConstants.UI_OPEN);
        await TestAdsEventVideos.expectRewards(context, roomAd, roomAd.rewardItemQty, 'The room ad rewards its item');
        await expect.poll(
            async () => (await TestAdsEventVideos.fetchPlayedAds(context, roomAd)).map(row => Boolean(row.ended_at)),
            {message: 'The rewarded room ad is stored as ended', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([true]);
    }

    static async runRewardQuantityTest(context)
    {
        let roomAd = await TestAdsEventVideos.loadRoomAd(context);
        roomAd.rewardItemQty = TestAdsEventVideos.REWARD_QUANTITY;
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            AdsConst.CONFIG_PATHS.COLLECTION+'/'+roomAd.id+'/rewardItemQty',
            roomAd.rewardItemQty
        );
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await AdMessagesPlayer.waitForPlayedAd(context.page, roomAd, TimeConstants.UI_OPEN);
        await TestAdsEventVideos.expectRewards(
            context,
            roomAd,
            roomAd.rewardItemQty,
            'The room ad adds its whole reward quantity of a single instance item'
        );
    }

    static async runNotReplayedTest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START + 2 * TimeConstants.NAVIGATION, context.longRun));
        let roomAd = await TestAdsEventVideos.loadRoomAd(context);
        await AdMessagesPlayer.overrideConfigs(context.gameConfig, context.e2eGroup, {
            [AdsConst.CONFIG_PATHS.COLLECTION+'/'+roomAd.id+'/replay']: 0,
            [AdMessagesPlayer.CLIENT_COLLECTION_PATH+'/'+roomAd.id+'/replay']: 0
        });
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await AdMessagesPlayer.waitForPlayedAd(context.page, roomAd, TimeConstants.UI_OPEN);
        await TestAdsEventVideos.expectRewards(context, roomAd, roomAd.rewardItemQty, 'The room ad rewards its item');
        await Login.moveThroughChangePoint(context.page, context.gameConfig, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await Login.moveThroughChangePoint(context.page, context.gameConfig, Login.FOREST_ROOM_NAME, Login.TOWN_ROOM_NAME);
        await context.page.waitForFunction(
            (adId) => Boolean(window.reldens.getFeature('ads')?.playedAds?.[adId]),
            roomAd.id,
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
        await context.page.waitForTimeout(TimeConstants.UI_OPEN);
        await expect(
            context.page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR),
            'The played non replay ad is not requested again on the next town enter'
        ).toHaveCount(0);
        await TestAdsEventVideos.expectRewards(context, roomAd, roomAd.rewardItemQty, 'The room ad rewards only once');
    }

    static run()
    {
        test.describe('Ads Event Videos', () => {
            test('room activation ad plays when the player logs in to the room and rewards its item without a ticket', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdsEventVideos.runRoomEnterAdTest({page, gameConfig, e2eGroup, longRun});
            });
            test('played non replay room ad is not requested again on the next room enter', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdsEventVideos.runNotReplayedTest({page, gameConfig, e2eGroup, longRun});
            });
            test('room ad reward quantity above one of a single instance item adds the whole quantity', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdsEventVideos.runRewardQuantityTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestAdsEventVideos.run();
