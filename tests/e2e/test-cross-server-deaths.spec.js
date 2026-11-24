/**
 *
 * Reldens - Test Cross Server Deaths
 *
 * Tests the death teleport to a town room of another server (exclusive group, the second house on server-2 and the town
 * on server-1 set by CrossServerHouseAssignment, the second house set as the death teleport room in the stored config
 * row read by the revive messages checks and in the live config of the group, both restored by the group reset): the
 * player killed in the forest on server-1 with the auto revive on and no restoration item is told it revives in the
 * second house and arrives there alive on server-2 on its default return point; with the auto revive off the Revive
 * button sends it there alive; and carrying the restoration item it keeps when asked, it revives there with the item
 * kept. The death and revive steps are the DeathReviveSteps ones.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CrossServerHouseAssignment } = require('./helpers/cross-server-house-assignment');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathReviveShowcase } = require('./helpers/death-revive-showcase');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerDeaths
{

    static async assignSecondServerTown(context, configValues = {})
    {
        context.secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        let teleportRoomPath = ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID.split('/');
        let houseId = await E2eSeedAndRestoreApi.fetchRowId(
            context.gameConfig,
            'rooms',
            {name: CrossServerHouseAssignment.SECOND_HOUSE}
        );
        await E2eSeedAndRestoreApi.updateWithPreserve(
            context.gameConfig,
            context.e2eGroup,
            'config',
            {scope: teleportRoomPath.shift(), path: teleportRoomPath.join('/')},
            {value: String(houseId)}
        );
        return Object.assign({[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID]: houseId}, configValues);
    }

    static async expectAliveOnSecondServer(context)
    {
        await DeathReviveSteps.expectRevivedInTown(
            Object.assign({}, context, {gameConfig: context.secondServerConfig}),
            CrossServerHouseAssignment.SECOND_HOUSE
        );
    }

    static async expectRevivedOnSecondServer(context)
    {
        expect(
            await DeathReviveSteps.expectTownGameOverMessage(context, 0),
            'The game over box tells the player revives in the second house'
        ).toBe(CrossServerHouseAssignment.SECOND_HOUSE);
        await TestCrossServerDeaths.expectAliveOnSecondServer(context);
    }

    static async killInForest(context, configValues)
    {
        await DeathReviveSteps.prepareDeath(context, await TestCrossServerDeaths.assignSecondServerTown(context, configValues));
        await DeathReviveSteps.killPlayerInForest(
            context,
            await DeathReviveSteps.enterForest(context),
            'The player died in the forest on server-1'
        );
    }

    static async runAutoReviveTest(context)
    {
        await TestCrossServerDeaths.killInForest(context, {});
        await TestCrossServerDeaths.expectRevivedOnSecondServer(context);
    }

    static async runManualReviveTest(context)
    {
        await TestCrossServerDeaths.killInForest(context, DeathReviveSteps.MANUAL_REVIVE_CONFIG);
        await DeathReviveSteps.expectReviveWait(context);
        await DeathReviveSteps.requestReviveInForest(context);
        await TestCrossServerDeaths.expectAliveOnSecondServer(context);
    }

    static async runKeptRestorationItemTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerAskedForTheItem(
            context,
            await TestCrossServerDeaths.assignSecondServerTown(context)
        );
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.restorationItemKeepButton);
        await TestCrossServerDeaths.expectRevivedOnSecondServer(context);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static run()
    {
        test.describe('Cross Server Deaths', () => {
            test('a player killed on server-1 revives alive in the death town room of server-2', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerDeaths.runAutoReviveTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('without the auto revive the Revive button sends the player alive to the death town room of server-2', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerDeaths.runManualReviveTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('a player keeping its restoration item revives in the death town room of server-2 with the item kept', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerDeaths.runKeptRestorationItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestCrossServerDeaths.run();
