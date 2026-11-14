/**
 *
 * Reldens - Test Rewards Drops Rules
 *
 * Tests the rules around the drops of a killed enemy in the forest (exclusive group, KillRewardsSteps): a disabled
 * player (an ad started) can not pick up a drop and the drop stays; a player in an open trade gets no item (the drop is
 * removed anyway and the item lost, ISSUE #171); a
 * reldens.beforeRemovingDroppedReward listener that cancels the event keeps the drop; a pick up with the client key of
 * another sprite (not a room object) does not remove that sprite on the other clients; a pick up of a room object
 * with no item id gives nothing; a player that joins the room after the drop was created sees it and picks it up; the
 * room enables its auto dispose again when its last drop is removed; and a drop stays in the room while the player is
 * in another scene and is shown again when it comes back.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { KillRewardsSteps } = require('./helpers/kill-rewards-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { TradeSteps } = require('./helpers/trade-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { AdsConst } = require('../../lib/ads/constants');
const { GameConst } = require('../../lib/game/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRewardsDropsRules
{

    static SAMPLE_AD_KEY = 'crazy-games-sample-video';

    static async fetchClientAnimation(page, animationKey)
    {
        return await page.evaluate(
            (key) => Boolean(window.reldens.getActiveScene().objectsAnimations[key]),
            animationKey
        );
    }

    static async pickFirstDrop(page, dropsKill)
    {
        await RoomMessagesRecorder.sendMessage(page, Object.assign(
            {id: [...dropsKill.drops].shift().id},
            KillRewardsSteps.PICK_UP
        ));
    }

    static async runDisabledPlayerTest(context)
    {
        let adRow = await AdMessagesPlayer.enableAd(
            context.gameConfig,
            context.e2eGroup,
            TestRewardsDropsRules.SAMPLE_AD_KEY,
            context.gameConfig.e2ePlayerName
        );
        let dropsKill = await KillRewardsSteps.enterBothWithDrops(context, 1, KillRewardsSteps.DROPS_IN_RANGE);
        let quantities = await KillRewardsSteps.fetchQuantities(context, dropsKill);
        await RoomMessagesRecorder.sendMessage(context.page, {act: AdsConst.ACTIONS.AD_STARTED, ads_id: adRow.id});
        await expect.poll(async () => (await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName
        )).inState, {message: 'The ad disables the player', timeout: TimeConstants.SERVER_RESPONSE}).toBe(
            GameConst.STATUS.DISABLED
        );
        await TestRewardsDropsRules.pickFirstDrop(context.page, dropsKill);
        await KillRewardsSteps.expectDropKept(context, dropsKill, quantities, 'No item for a disabled player');
    }

    static async runTradingPlayerTest(context)
    {
        let dropsKill = await KillRewardsSteps.enterBothWithDrops(context, 1, KillRewardsSteps.DROPS_IN_RANGE);
        let quantities = await KillRewardsSteps.fetchQuantities(context, dropsKill);
        await TradeSteps.open(dropsKill.players[0], dropsKill.players[1]);
        await TestRewardsDropsRules.pickFirstDrop(context.page, dropsKill);
        await context.page.waitForTimeout(KillRewardsSteps.SETTLE_MS);
        expect(await KillRewardsSteps.fetchQuantities(context, dropsKill), 'No item added while trading').toEqual(quantities);
    }

    static async runCancelledRemovalTest(context)
    {
        let cancelled = await GameplayE2eStateApi.cancelEvent(
            context.gameConfig,
            context.e2eGroup,
            'reldens.beforeRemovingDroppedReward'
        );
        expect(cancelled.cancelled, 'The drop removal event is cancelled').toBe(true);
        let dropsKill = await KillRewardsSteps.enterBothWithDrops(context, 1, KillRewardsSteps.DROPS_IN_RANGE);
        let quantities = await KillRewardsSteps.fetchQuantities(context, dropsKill);
        await TestRewardsDropsRules.pickFirstDrop(context.page, dropsKill);
        await KillRewardsSteps.expectDropKept(context, dropsKill, quantities, 'No item with the removal cancelled');
    }

    static async runForeignKeysTest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 3, context.longRun));
        await DeathObserverSteps.loginBothInForest(context);
        let placement = await KillRewardsSteps.placeEnemy(
            context,
            [context.gameConfig.e2ePlayerName, context.gameConfig.e2ePlayerName2]
        );
        await RoomMessagesRecorder.start(context.secondPage);
        let serverId = await context.secondPage.evaluate(
            (bodyKey) => window.reldens.getActiveScene().objectsAnimations[bodyKey].key,
            placement.bodyKey
        );
        for(let objectKey of [serverId, placement.bodyKey]){
            await RoomMessagesRecorder.sendMessage(context.page, Object.assign({id: objectKey}, KillRewardsSteps.PICK_UP));
        }
        await context.page.waitForTimeout(KillRewardsSteps.SETTLE_MS);
        expect(
            (await RoomMessagesRecorder.fetchMessages(context.secondPage, ObjectsConst.DROPS.REMOVE)).map(remove => remove.id),
            'No remove for the room object with no item'
        ).not.toContain(serverId);
        expect(
            await TestRewardsDropsRules.fetchClientAnimation(context.secondPage, placement.bodyKey),
            'The other client keeps the sprite of the client key'
        ).toBe(true);
    }

    static async runJoinedLaterTest(context)
    {
        let gameConfig = context.gameConfig;
        let secondConfig = Login.fetchSecondPlayerConfig(gameConfig);
        for(let configPath of Object.keys(KillRewardsSteps.DROPS_IN_RANGE)){
            await E2eSeedAndRestoreApi.overrideConfig(gameConfig, context.e2eGroup, configPath, KillRewardsSteps.DROPS_IN_RANGE[configPath]);
        }
        let placement = await KillRewardsSteps.enterWithPlacedEnemy(context);
        await KillRewardsSteps.changeEnemyReward(context, {dropQuantity: 1});
        let drop = [...await KillRewardsSteps.killForDrops(context, placement)].shift();
        await Login.loginAndEnterForest(context.secondPage, secondConfig, context.longRun);
        await context.secondPage.waitForFunction(
            (dropId) => Boolean(window.reldens.getActiveScene().objectsAnimations[dropId]),
            drop.id,
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
        let itemKey = (await KillRewardsSteps.fetchEnemyReward(gameConfig)).item.key;
        let quantity = await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, secondConfig.e2ePlayerName, itemKey);
        await RoomMessagesRecorder.sendMessage(context.secondPage, Object.assign({id: drop.id}, KillRewardsSteps.PICK_UP));
        await expect.poll(
            async () => await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, secondConfig.e2ePlayerName, itemKey),
            {message: 'The player that joined later picks up the drop', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(quantity + 1);
    }

    static async runAutoDisposeTest(context)
    {
        let dropsKill = await KillRewardsSteps.enterBothWithDrops(context, 1, KillRewardsSteps.DROPS_IN_RANGE);
        let dropsState = await KillRewardsSteps.fetchDropsState(context.gameConfig);
        expect(dropsState.autoDispose, 'Disabled with a drop').toBe(false);
        await TestRewardsDropsRules.pickFirstDrop(context.page, dropsKill);
        await expect.poll(
            async () => (await KillRewardsSteps.fetchDropsState(context.gameConfig)).autoDispose,
            {message: 'Enabled again with the last drop removed', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
    }

    static async runSceneChangeTest(context)
    {
        let placement = await KillRewardsSteps.enterWithPlacedEnemy(context);
        await KillRewardsSteps.changeEnemyReward(context, {dropQuantity: 1});
        let drop = [...await KillRewardsSteps.killForDrops(context, placement)].shift();
        await Login.moveThroughChangePoint(context.page, context.gameConfig, Login.FOREST_ROOM_NAME, Login.TOWN_ROOM_NAME);
        let shownInTown = await TestRewardsDropsRules.fetchClientAnimation(context.page, drop.id);
        expect(shownInTown, 'Not shown in the town').toBe(false);
        await Login.moveThroughChangePoint(context.page, context.gameConfig, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        expect(
            (await KillRewardsSteps.fetchDropsState(context.gameConfig)).drops.map(roomDrop => roomDrop.id),
            'The drop stays in the forest'
        ).toContain(drop.id);
        await context.page.waitForFunction(
            (dropId) => Boolean(window.reldens.getActiveScene().objectsAnimations[dropId]),
            drop.id,
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
    }

    static run()
    {
        test.describe('Rewards Drops Rules', () => {
            test('disabled player can not pick up a drop', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDropsRules.runDisabledPlayerTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player in an open trade gets no item from a drop', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDropsRules.runTradingPlayerTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('drop removal cancelled by a listener keeps the drop', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDropsRules.runCancelledRemovalTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('pick up of a room object with no item or of a client key removes nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDropsRules.runForeignKeysTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player joining after the drop sees it and picks it up', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDropsRules.runJoinedLaterTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('room enables its auto dispose when the last drop is removed', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDropsRules.runAutoDisposeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('drop stays in the room while the player is in another scene', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDropsRules.runSceneChangeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestRewardsDropsRules.run();
