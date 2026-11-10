/**
 *
 * Reldens - Test Interactive Objects Guards
 *
 * Tests which interaction messages start a timing on the forest timing objects (TimingMiningSteps, the messages sent
 * from the client as a tampered client would): a wrong id to the rocks or to the fishing spots and a different act with
 * a valid rock id start nothing; the shared rock template id sent next to the rocks cluster starts at most one timing;
 * a player in range of two rocks gets one active timing; a disabled player starts nothing; a room with every action
 * disabled or with the interaction act disallowed (its custom data changed for the group) starts nothing; a rock with
 * the run on hit rule (changed for the group) starts when the player walks into it and starts no second timing for
 * another player walking into it; the progress bar and the tool are shown during the timing and removed at the end; and
 * the reward is stored and shown again after a new login.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Navigation } = require('./helpers/navigation');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestInteractiveObjectsGuards
{

    static FISHING_SPOT_KEY = 'fish_spawn_forest_1';
    static WRONG_ID = 'e2eWrongObjectId';
    static OTHER_ACT = 'e2eOtherAct';
    static SETTLE_MS = 1000;
    static WALK_INTO_MS = 600;
    static WHOLE_MAP_LIMITS = {left: -1, right: 100000, up: -1, down: 100000};

    static async sendInteraction(page, objectKey, messageChanges)
    {
        await page.evaluate((sent) => {
            let anim = window.reldens.getActiveScene().objectsAnimations[sent.objectKey];
            let message = Object.assign({act: sent.act, id: anim.key, type: anim.type}, sent.changes);
            if(sent.useTemplateId){
                message.id = anim.id;
            }
            window.reldens.activeRoomEvents.send(message);
        }, Object.assign({objectKey, act: ObjectsConst.OBJECT_INTERACTION, changes: {}, useTemplateId: false}, messageChanges));
    }

    static async expectNoTiming(page, message)
    {
        await page.waitForTimeout(TestInteractiveObjectsGuards.SETTLE_MS);
        expect(await TimingObjectSession.fetchRecordedActions(page), message).toEqual([]);
    }

    static async prepare(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        await TimingObjectSession.recordTimingActions(context.page);
        return mining;
    }

    static async runWrongIdsTest(context)
    {
        let mining = await TestInteractiveObjectsGuards.prepare(context);
        await TestInteractiveObjectsGuards.sendInteraction(context.page, mining.rockKey, {
            changes: {id: TestInteractiveObjectsGuards.WRONG_ID}
        });
        await TestInteractiveObjectsGuards.expectNoTiming(context.page, 'A wrong id to the rocks starts nothing');
        await TestInteractiveObjectsGuards.sendInteraction(context.page, mining.rockKey, {act: TestInteractiveObjectsGuards.OTHER_ACT});
        await TestInteractiveObjectsGuards.expectNoTiming(context.page, 'A different act starts nothing');
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            context.page,
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            TestInteractiveObjectsGuards.FISHING_SPOT_KEY,
            TimeConstants.SCENE_LOAD
        );
        expect(placement.reached, 'The player is placed next to the fishing spot').toBe(true);
        await TestInteractiveObjectsGuards.sendInteraction(context.page, placement.bodyKey, {
            changes: {id: TestInteractiveObjectsGuards.WRONG_ID}
        });
        await TestInteractiveObjectsGuards.expectNoTiming(context.page, 'A wrong id to the fishing spots starts nothing');
    }

    static async runTemplateIdTest(context)
    {
        let mining = await TestInteractiveObjectsGuards.prepare(context);
        await TestInteractiveObjectsGuards.sendInteraction(context.page, mining.rockKey, {useTemplateId: true});
        await context.page.waitForTimeout(TestInteractiveObjectsGuards.SETTLE_MS);
        expect(await TimingObjectSession.fetchRecordedActions(context.page), 'The shared template id starts a timing')
            .toContain(TimingMiningSteps.START);
    }

    static async runTwoRocksInRangeTest(context)
    {
        let mining = await TestInteractiveObjectsGuards.prepare(context);
        let rockInRange = (await RoomObjectsApi.fetchRoomObjects(context.gameConfig, Login.FOREST_ROOM_NAME)).find(
            snapshot => context.gameConfig.e2eMiningRockKey === snapshot.assetKey && mining.rockKey !== snapshot.bodyKey
        );
        expect(rockInRange, 'Another rock exists').toBeTruthy();
        await TimingObjectSession.changeObjectProperty(
            context.gameConfig,
            context.e2eGroup,
            rockInRange.bodyKey,
            'interactionLimits',
            TestInteractiveObjectsGuards.WHOLE_MAP_LIMITS
        );
        await TestInteractiveObjectsGuards.sendInteraction(context.page, mining.rockKey, {});
        await TestInteractiveObjectsGuards.sendInteraction(context.page, rockInRange.bodyKey, {});
        await context.page.waitForTimeout(TestInteractiveObjectsGuards.SETTLE_MS);
        expect(await TimingObjectSession.fetchRecordedActions(context.page), 'The first timing starts').toContain(TimingMiningSteps.START);
    }

    static async runDisabledPlayerTest(context)
    {
        let mining = await TestInteractiveObjectsGuards.prepare(context);
        let disabled = await GameplayE2eStateApi.setPlayerState(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            GameConst.STATUS.DISABLED
        );
        expect(disabled.inState, 'The player is disabled: '+disabled.error).toBe(GameConst.STATUS.DISABLED);
        await TestInteractiveObjectsGuards.sendInteraction(context.page, mining.rockKey, {});
        await context.page.waitForTimeout(TestInteractiveObjectsGuards.SETTLE_MS);
    }

    static async runRoomActionsTest(context, customData, message)
    {
        let mining = await TestInteractiveObjectsGuards.prepare(context);
        await GameplayE2eStateApi.changeRoomCustomData(context.gameConfig, context.e2eGroup, Login.FOREST_ROOM_NAME, customData);
        await TestInteractiveObjectsGuards.sendInteraction(context.page, mining.rockKey, {});
        await TestInteractiveObjectsGuards.expectNoTiming(context.page, message);
    }

    static async walkIntoRock(page, rock)
    {
        let position = await Phaser.getPlayerServerPosition(page);
        let axis = TimingMiningSteps.isBesideRock(position, rock) ? 'x' : 'y';
        let directions = 'x' === axis ? {increase: 'right', decrease: 'left'} : {increase: 'down', decrease: 'up'};
        await Navigation.walkInDirection(
            page,
            position[axis] < rock[axis] ? directions.increase : directions.decrease,
            TestInteractiveObjectsGuards.WALK_INTO_MS
        );
    }

    static async runOnHitTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context, {runOnHit: true, cancelOnMove: false});
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        await TimingObjectSession.recordTimingActions(context.page);
        await TestInteractiveObjectsGuards.walkIntoRock(context.page, mining.rock);
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.START, mining.serverTimeout);
        let secondGameConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginAndEnterForest(context.secondPage, secondGameConfig, context.longRun);
        let placed = await RoomObjectsApi.placePlayerNextToObject(
            context.secondPage,
            secondGameConfig,
            Login.FOREST_ROOM_NAME,
            mining.rockKey,
            TimeConstants.SCENE_LOAD
        );
        expect(placed.reached, 'The second player is placed next to the rock').toBe(true);
        await TimingObjectSession.recordTimingActions(context.secondPage);
        await TestInteractiveObjectsGuards.walkIntoRock(context.secondPage, mining.rock);
        await TestInteractiveObjectsGuards.expectNoTiming(context.secondPage, 'The busy rock starts no second timing');
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The walk into the rock mines it');
    }

    static async runBarAndRewardTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        expect(await TimingMiningSteps.fetchClientTiming(context.page, mining.rockKey), 'The bar and the tool are shown')
            .toEqual({hasBar: true, hasBarInterval: true, hasTool: true});
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The rock is mined');
        expect(await TimingMiningSteps.fetchClientTiming(context.page, mining.rockKey), 'The bar and the tool are removed')
            .toEqual({hasBar: false, hasBarInterval: false, hasTool: false});
        await context.page.reload();
        let forestData = await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await TimingObjectSession.openInventory(context.page, forestData.pauseMs);
        await expect.poll(
            async () => await TimingObjectSession.fetchInventoryItemQty(context.page, mining.rewardItemId),
            {message: 'The reward is shown after a new login', timeout: mining.serverTimeout}
        ).toBe(mining.rewardQtyBefore + 1);
    }

    static run()
    {
        test.describe('Interactive Objects Guards', () => {
            test('wrong ids and a different act start no timing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsGuards.runWrongIdsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('shared rock template id starts at most one timing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsGuards.runTemplateIdTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player in range of two rocks gets one active timing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsGuards.runTwoRocksInRangeTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('disabled player starts no timing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsGuards.runDisabledPlayerTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('room with every action disabled starts no timing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsGuards.runRoomActionsTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {allActionsDisabled: true},
                    'Every action disabled'
                );
            });
            test('room with the interaction disallowed starts no timing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsGuards.runRoomActionsTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {disallowedActions: [ObjectsConst.OBJECT_INTERACTION]},
                    'The interaction disallowed'
                );
            });
            test('run on hit rock starts on a walk into it and not for a second player', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsGuards.runOnHitTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('bar and tool shown during the timing and the reward kept after a new login', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsGuards.runBarAndRewardTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestInteractiveObjectsGuards.run();
