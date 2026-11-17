/**
 *
 * Reldens - Test Interactive Objects Limits
 *
 * Tests the limits of the interactions with the forest mining rocks and the chest (TimingMiningSteps, the player placed
 * next to the first mining rock): a dead player (the death state the battle sets on the player) next to a rock or next
 * to the chest gets no timing, no answer and no close message, and once active again the same message mines the rock
 * or opens the chest (the player chest rows preserved for the group); a player exactly on each limit of the rock
 * interaction area (the limits changed for the group around the server player position) is rejected with the close
 * message and one pixel inside every limit mines the rock; a player in range of two rocks (the second rock limits
 * opened to the whole map) starts the second rock once the first rock timing completed or was cancelled by a lower life;
 * and a run on hit rock walked into (the player placed on a clear line one tile from it) while the player runs the timing
 * of another rock starts nothing, and the same walk into it starts it once that timing completed. The completed rock
 * respawn is pinned out of reach of the player, so it never lands next to the player during the case.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Navigation } = require('./helpers/navigation');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestInteractiveObjectsLimits
{

    static SETTLE_MS = 1000;
    static WALK_INTO_MS = 600;
    static COIN_KEY = 'coins';
    static WHOLE_MAP_LIMITS = {left: -1, right: 100000, up: -1, down: 100000};
    static LIMIT_SIDES = [
        {side: 'right', axis: 'x'},
        {side: 'left', axis: 'x'},
        {side: 'down', axis: 'y'},
        {side: 'up', axis: 'y'}
    ];

    static async setPlayerState(gameConfig, inState)
    {
        let changed = await GameplayE2eStateApi.setPlayerState(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName,
            inState
        );
        expect(changed.inState, 'The player state must change: '+changed.error).toBe(inState);
    }

    static async fetchCoins(gameConfig)
    {
        return await E2eSeedAndRestoreApi.fetchInventoryQuantity(
            gameConfig,
            gameConfig.e2ePlayerName,
            TestInteractiveObjectsLimits.COIN_KEY
        );
    }

    static async expectNoAnswer(page, answerAct, message)
    {
        await page.waitForTimeout(TestInteractiveObjectsLimits.SETTLE_MS);
        expect(await RoomMessagesRecorder.fetchMessages(page, answerAct), message+': no answer').toEqual([]);
        expect(await RoomMessagesRecorder.fetchMessages(page, GameConst.CLOSE_UI_ACTION), message+': no close message')
            .toEqual([]);
    }

    static async fetchOtherActiveRock(gameConfig, mining)
    {
        let otherRock = (await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.FOREST_ROOM_NAME)).find(
            snapshot => gameConfig.e2eMiningRockKey === snapshot.assetKey
                && mining.rockKey !== snapshot.bodyKey
                && GameConst.STATUS.ACTIVE === snapshot.inState
        );
        expect(otherRock, 'Another active rock exists').toBeTruthy();
        return otherRock.bodyKey;
    }

    static async expectStartedKeys(page, expectedKeys, message)
    {
        expect((await TimingObjectSession.fetchRecordedMessages(page)).map(timingMessage => timingMessage.key), message)
            .toEqual(expectedKeys);
    }

    static async waitForCompletion(page, mining)
    {
        await TimingObjectSession.waitForTimingAction(
            page,
            TimingMiningSteps.COMPLETE,
            mining.duration + mining.serverTimeout
        );
    }

    static async runDeadPlayerRockTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        await RoomMessagesRecorder.start(context.page);
        await TestInteractiveObjectsLimits.setPlayerState(context.gameConfig, GameConst.STATUS.DEATH);
        expect(await Phaser.triggerObjectInteraction(context.page, mining.rockKey), 'The interaction is sent').toBe(true);
        await TestInteractiveObjectsLimits.expectNoAnswer(context.page, TimingMiningSteps.START, 'The dead player at a rock');
        expect(
            (await TimingObjectSession.fetchTimingState(context.gameConfig, mining.rockKey)).isActive,
            'The rock stays free'
        ).toBe(false);
        await TestInteractiveObjectsLimits.setPlayerState(context.gameConfig, GameConst.STATUS.ACTIVE);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The active player mines the rock');
    }

    static async runDeadPlayerChestTest(context)
    {
        let gameConfig = context.gameConfig;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun));
        await TimingObjectSession.enterForestWithoutEnemies(context.page, gameConfig, context.longRun);
        let chestKey = await TimingObjectSession.placeNextToObject(
            context.page,
            gameConfig,
            gameConfig.e2eChestKey,
            TimeConstants.SCENE_LOAD,
            'chest'
        );
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, context.e2eGroup, 'questsProgress', {player_id: playerId});
        let chestRowsFilters = {quest_key: chestKey, player_id: playerId};
        let chestRowsBefore = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'questsProgress', chestRowsFilters);
        let coinsBefore = await TestInteractiveObjectsLimits.fetchCoins(gameConfig);
        let chestMessage = {act: ObjectsConst.OBJECT_INTERACTION};
        await RoomMessagesRecorder.start(context.page);
        await TestInteractiveObjectsLimits.setPlayerState(gameConfig, GameConst.STATUS.DEATH);
        expect(
            await RoomMessagesRecorder.sendObjectMessage(context.page, chestKey, chestMessage),
            'The chest message is sent'
        ).toBeTruthy();
        await TestInteractiveObjectsLimits.expectNoAnswer(context.page, GameConst.UI, 'The dead player at the chest');
        expect(await TestInteractiveObjectsLimits.fetchCoins(gameConfig), 'The dead player gets no coin').toBe(coinsBefore);
        expect(
            await E2eSeedAndRestoreApi.loadRows(gameConfig, 'questsProgress', chestRowsFilters),
            'The chest rows of the dead player do not change'
        ).toEqual(chestRowsBefore);
        await TestInteractiveObjectsLimits.setPlayerState(gameConfig, GameConst.STATUS.ACTIVE);
        await RoomMessagesRecorder.sendObjectMessage(context.page, chestKey, chestMessage);
        await RoomMessagesRecorder.waitForMessage(context.page, GameConst.UI, TimeConstants.SERVER_RESPONSE);
    }

    static async interactWithLimits(context, mining, limits)
    {
        await TimingObjectSession.changeObjectProperty(
            context.gameConfig,
            context.e2eGroup,
            mining.rockKey,
            'interactionLimits',
            limits
        );
        expect(await Phaser.triggerObjectInteraction(context.page, mining.rockKey), 'The interaction is sent').toBe(true);
    }

    static async runExactLimitTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        let player = await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName
        );
        await TimingObjectSession.recordTimingActions(context.page);
        await RoomMessagesRecorder.start(context.page);
        for(let limitSide of TestInteractiveObjectsLimits.LIMIT_SIDES){
            await TestInteractiveObjectsLimits.interactWithLimits(context, mining, Object.assign(
                {},
                TestInteractiveObjectsLimits.WHOLE_MAP_LIMITS,
                {[limitSide.side]: player[limitSide.axis]}
            ));
            await expect.poll(
                async () => (await RoomMessagesRecorder.fetchMessages(context.page, GameConst.CLOSE_UI_ACTION)).length,
                {message: 'The player on the '+limitSide.side+' limit is rejected', timeout: mining.serverTimeout}
            ).toBe(TestInteractiveObjectsLimits.LIMIT_SIDES.indexOf(limitSide) + 1);
        }
        expect(await TimingObjectSession.fetchRecordedActions(context.page), 'No timing starts on a limit').toEqual([]);
        await TestInteractiveObjectsLimits.interactWithLimits(context, mining, {
            left: player.x - 1,
            right: player.x + 1,
            up: player.y - 1,
            down: player.y + 1
        });
        await TimingMiningSteps.expectCompleted(context.page, mining, 'One pixel inside every limit mines the rock');
    }

    static async prepareTwoRocks(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        let otherRockKey = await TestInteractiveObjectsLimits.fetchOtherActiveRock(context.gameConfig, mining);
        await TimingObjectSession.changeObjectProperty(
            context.gameConfig,
            context.e2eGroup,
            otherRockKey,
            'interactionLimits',
            TestInteractiveObjectsLimits.WHOLE_MAP_LIMITS
        );
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        return {mining, otherRockKey};
    }

    static async expectOtherRockMined(context, rocks, message)
    {
        await TimingObjectSession.startTiming(context.page, rocks.otherRockKey, rocks.mining.serverTimeout);
        await TestInteractiveObjectsLimits.expectStartedKeys(context.page, [rocks.otherRockKey], message);
        await TestInteractiveObjectsLimits.waitForCompletion(context.page, rocks.mining);
    }

    static async runSecondRockAfterCompletionTest(context)
    {
        let rocks = await TestInteractiveObjectsLimits.prepareTwoRocks(context);
        await TimingObjectSession.pinRespawnOutOfReach(context.gameConfig, context.e2eGroup, rocks.mining.rockKey);
        await TimingMiningSteps.expectCompleted(context.page, rocks.mining, 'The first rock is mined');
        await TestInteractiveObjectsLimits.expectOtherRockMined(context, rocks, 'The second rock starts after the completion');
    }

    static async runSecondRockAfterCancelTest(context)
    {
        let rocks = await TestInteractiveObjectsLimits.prepareTwoRocks(context);
        let gameConfig = context.gameConfig;
        let lowerLife = (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName))
            .life - 1;
        let changed = await RoomObjectsApi.setPlayerAffectedProperty(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName,
            lowerLife
        );
        expect(changed.value, 'The miner life must be lowered: '+changed.error).toBe(lowerLife);
        await TimingMiningSteps.expectCancelled(context.page, rocks.mining, 'The lower life cancels the first rock');
        await TestInteractiveObjectsLimits.expectOtherRockMined(context, rocks, 'The second rock starts after the cancel');
    }

    static async walkIntoRock(context, rockKey)
    {
        await TimingObjectSession.placeNextToObject(
            context.page,
            context.gameConfig,
            rockKey,
            TimeConstants.SCENE_LOAD,
            'run on hit rock'
        );
        let rock = await TimingObjectSession.fetchTimingState(context.gameConfig, rockKey);
        await Navigation.walkTowardWorldPoint(context.page, rock.x, rock.y, TestInteractiveObjectsLimits.WALK_INTO_MS);
    }

    static async runOnHitWhileBusyTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context, {
            cancelOnMove: false,
            interactionLimits: TestInteractiveObjectsLimits.WHOLE_MAP_LIMITS
        });
        let otherRockKey = await TestInteractiveObjectsLimits.fetchOtherActiveRock(context.gameConfig, mining);
        await TimingObjectSession.pinRespawnOutOfReach(context.gameConfig, context.e2eGroup, mining.rockKey);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingObjectSession.changeObjectProperty(context.gameConfig, context.e2eGroup, otherRockKey, 'runOnHit', true);
        await TimingObjectSession.changeObjectProperty(context.gameConfig, context.e2eGroup, otherRockKey, 'cancelOnMove', false);
        await TestInteractiveObjectsLimits.walkIntoRock(context, otherRockKey);
        await TestInteractiveObjectsLimits.waitForCompletion(context.page, mining);
        await TestInteractiveObjectsLimits.expectStartedKeys(
            context.page,
            [mining.rockKey, mining.rockKey],
            'The run on hit rock walked into during the other timing starts nothing'
        );
        await TimingObjectSession.recordTimingActions(context.page);
        await TestInteractiveObjectsLimits.walkIntoRock(context, otherRockKey);
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.START, mining.serverTimeout);
        await TestInteractiveObjectsLimits.expectStartedKeys(context.page, [otherRockKey], 'The same walk starts the free rock');
        await TestInteractiveObjectsLimits.waitForCompletion(context.page, mining);
    }

    static run()
    {
        test.describe('Interactive Objects Limits', () => {
            test('dead player next to a rock starts nothing and mines once active', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsLimits.runDeadPlayerRockTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player next to the chest gets no answer and opens it once active', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsLimits.runDeadPlayerChestTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player on each interaction limit is rejected and one pixel inside mines the rock', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsLimits.runExactLimitTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second rock in range starts once the first rock timing completed', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsLimits.runSecondRockAfterCompletionTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('second rock in range starts once the first rock timing is cancelled', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsLimits.runSecondRockAfterCancelTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('run on hit rock walked into during another rock timing starts only after it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsLimits.runOnHitWhileBusyTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestInteractiveObjectsLimits.run();
