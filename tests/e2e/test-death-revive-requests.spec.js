/**
 *
 * Reldens - Test Death Revive Requests
 *
 * Tests the dead player requests sent as raw room messages (RoomMessagesRecorder, the exact payloads a modified client
 * could send): a revive request ("drq") sent before the game over time passed is rejected and the revive button still
 * works once it passed; the revive request and the restoration item choice ("drc") of an alive player, and of a player
 * marked dead in a room where it did not die, are rejected; a double click on the revive button and two revive requests
 * sent together run one resolution and consume one restoration item; and a revive request with the auto revive on does
 * not revive the player before the game over time. No revive message and no revive answer a rejected request.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { TimeConstants } = require('./helpers/time-constants');
const { Login } = require('./helpers/login');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathReviveRequests
{

    static QUIET_MS = 1500;
    static REVIVE_REQUEST = {act: ActionsConst.DEATH.ACTIONS.REVIVE_REQUEST};
    static TELEPORT_OFF = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};

    static choice(use)
    {
        return {act: ActionsConst.DEATH.ACTIONS.RESTORATION_ITEM_CHOICE, use};
    }

    static async sendIgnored(context, messages, label)
    {
        expect(await RoomMessagesRecorder.sendAndFetchAnswers(
            context.page,
            messages,
            [ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE, GameConst.REVIVED],
            TestDeathReviveRequests.QUIET_MS
        ), label+': no revive message and no revive answer it').toEqual([]);
    }

    static async runAutoReviveRequestTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, {}, 0);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await TestDeathReviveRequests.sendIgnored(
            context,
            [TestDeathReviveRequests.REVIVE_REQUEST],
            'Revive request with the auto revive on'
        );
        expect((await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState).toBe(GameConst.STATUS.DEATH);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
    }

    static async runEarlyReviveRequestTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(
            context,
            Object.assign({}, TestDeathReviveRequests.TELEPORT_OFF, DeathReviveSteps.MANUAL_REVIVE_CONFIG),
            0
        );
        await TestDeathReviveRequests.sendIgnored(
            context,
            [TestDeathReviveRequests.REVIVE_REQUEST],
            'Revive request before the wait passed'
        );
        expect((await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState).toBe(GameConst.STATUS.DEATH);
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectAliveInForest(context);
    }

    static async runAlivePlayerRequestsTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.prepareDeath(context, DeathReviveSteps.ASKED_ITEM_CONFIG);
        await DeathReviveSteps.seedRestorationItems(context, restorationItemKey, 1);
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let alivePlayer = await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME);
        await TestDeathReviveRequests.sendIgnored(
            context,
            [TestDeathReviveRequests.REVIVE_REQUEST, TestDeathReviveRequests.choice(true)],
            'Requests of an alive player'
        );
        let checkedPlayer = await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME);
        expect([checkedPlayer.inState, checkedPlayer.life]).toEqual([alivePlayer.inState, alivePlayer.life]);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runOtherRoomDeathRequestsTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, DeathReviveSteps.MANUAL_REVIVE_CONFIG, 0);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        let gameConfig = context.gameConfig;
        let deathState = GameConst.STATUS.DEATH;
        await GameplayE2eStateApi.setPlayerState(gameConfig, townRoomName, gameConfig.e2ePlayerName, deathState);
        await TestDeathReviveRequests.sendIgnored(
            context,
            [TestDeathReviveRequests.REVIVE_REQUEST, TestDeathReviveRequests.choice(true)],
            'Requests for a death in another room'
        );
        expect((await DeathReviveSteps.fetchPlayer(context, townRoomName)).inState).toBe(deathState);
        let activeState = GameConst.STATUS.ACTIVE;
        await GameplayE2eStateApi.setPlayerState(gameConfig, townRoomName, gameConfig.e2ePlayerName, activeState);
    }

    static async killReadyToReviveWithTwoItems(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(
            context,
            DeathReviveSteps.MANUAL_REVIVE_CONFIG,
            2
        );
        await expect(context.page.locator(Selectors.gameOver.reviveButton)).toBeVisible(
            {timeout: TimeConstants.PLAYER_REVIVE}
        );
        await RoomMessagesRecorder.start(context.page);
        return restorationItemKey;
    }

    static async expectOneResolution(context, restorationItemKey)
    {
        await DeathReviveSteps.expectAliveInForest(context);
        await context.page.waitForTimeout(TestDeathReviveRequests.QUIET_MS);
        expect(
            (await RoomMessagesRecorder.fetchMessages(context.page, GameConst.REVIVED)).length,
            'One revive'
        ).toBe(1);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
        await context.screenshots.capture(context.page, 'one-resolution-one-item-consumed');
    }

    static async runDoubleClickReviveTest(context)
    {
        let restorationItemKey = await TestDeathReviveRequests.killReadyToReviveWithTwoItems(context);
        await context.page.locator(Selectors.gameOver.reviveButton).dblclick();
        await TestDeathReviveRequests.expectOneResolution(context, restorationItemKey);
    }

    static async runOverlappingRequestsTest(context)
    {
        let restorationItemKey = await TestDeathReviveRequests.killReadyToReviveWithTwoItems(context);
        await RoomMessagesRecorder.sendMessages(
            context.page,
            [TestDeathReviveRequests.REVIVE_REQUEST, TestDeathReviveRequests.REVIVE_REQUEST]
        );
        await TestDeathReviveRequests.expectOneResolution(context, restorationItemKey);
    }

    static run()
    {
        test.describe('Death Revive Requests', () => {
            test('revive request sent before the wait passed is rejected', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveRequests.runEarlyReviveRequestTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('revive request and item choice of an alive player are rejected', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveRequests.runAlivePlayerRequestsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('revive request and item choice for a death in another room are rejected', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveRequests.runOtherRoomDeathRequestsTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('double click on the revive button runs one resolution and consumes one item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveRequests.runDoubleClickReviveTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('overlapping revive requests run one resolution and consume one item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveRequests.runOverlappingRequestsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('revive request with the auto revive on does not revive the player early', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveRequests.runAutoReviveRequestTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestDeathReviveRequests.run();
