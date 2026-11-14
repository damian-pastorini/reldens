/**
 *
 * Reldens - Test NPC Dialogs
 *
 * Tests the dialog of the town NPC Alfred (exclusive group, NpcDialogSteps: its random movement stopped and its body on
 * its original tile, the player placed next to it): the dialog shows the stored title and content and no option button
 * (Alfred has no options); the close button closes it, takes the player out of the NPC pause list and the same dialog
 * opens again, and the moving NPC keeps its movement loop while paused and after the close, while with the random
 * movement off the close starts no movement timer; an interaction sent once the player walked away closes the open
 * dialog, and walking away without an interaction keeps it open; an interaction with an object id that does not exist,
 * or sent in a room with every action disabled or with the interaction disallowed (the town custom data for the
 * group), opens nothing; a real canvas click on the NPC and on the trader opens their dialog and shows their title in
 * the target box; and a click on the NPC with a page element under the pointer opens nothing.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { NpcDialogSteps } = require('./helpers/npc-dialog-steps');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ObjectsConst } = require('../../lib/objects/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestNpcDialogs
{

    static MISSING_OBJECT_ID = 999999;
    static CLICK_OFFSET = 8;
    static enterPlayer = async (context) => (await TeamSteps.enterPlayers(context, 1)).shift();
    static fetchNpcRow = async (context, npcKey) => [
        ...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'objects', {client_key: npcKey})
    ].shift();

    static async expectNoDialog(page, message)
    {
        await page.waitForTimeout(TimeConstants.ACTION);
        await expect(page.locator(Selectors.npc.dialogue).filter({visible: true}), message).toHaveCount(0);
    }

    static async runStoredContentTest(context)
    {
        let player = await TestNpcDialogs.enterPlayer(context);
        let npc = await NpcDialogSteps.openDialog(context, player.page, context.gameConfig.e2eNpcKey);
        let npcRow = await TestNpcDialogs.fetchNpcRow(context, npc.npcKey);
        await expect(npc.dialog.locator('.box-title'), 'The dialog title is the stored title').toHaveText(npcRow.title);
        await expect(npc.dialog.locator('.box-content'), 'The dialog content is the stored content')
            .toContainText(sc.toJson(npcRow.client_params).content);
        await expect(npc.dialog.locator('[data-option-value]'), 'An NPC without options shows no option button')
            .toHaveCount(0);
    }

    static async expectNpcMovement(context, npc, isMoving, message)
    {
        let npcBody = await RoomMovementApi.fetchObject(context.gameConfig, npc.roomName, npc.npcKey);
        expect([npcBody.hasRandomMovement, npcBody.pathSteps], message).toEqual([isMoving, 0]);
    }

    static async runCloseButtonTest(context, isMoving)
    {
        let player = await TestNpcDialogs.enterPlayer(context);
        let npc = await NpcDialogSteps.placeNextToNpc(context, player.page, context.gameConfig.e2eNpcKey);
        await RoomMovementApi.switchRandomMovement(context.gameConfig, npc.roomName, npc.npcKey, isMoving);
        expect(await Phaser.triggerObjectInteraction(player.page, npc.npcKey), 'The interaction is sent').toBe(true);
        await expect(npc.dialog, 'The NPC dialog is open').toBeVisible({timeout: TimeConstants.UI_OPEN});
        await NpcDialogSteps.expectOpenDialogs(context, npc, [player.sessionId], 'The open dialog pauses the NPC');
        await TestNpcDialogs.expectNpcMovement(context, npc, isMoving, 'The paused NPC walks no path');
        await npc.dialog.locator('.box-close').click();
        await expect(npc.dialog, 'The close button closes the dialog').toHaveCount(0);
        await NpcDialogSteps.expectOpenDialogs(context, npc, [], 'The close button releases the NPC');
        await TestNpcDialogs.expectNpcMovement(context, npc, isMoving, 'The close keeps the movement loop as it was');
        expect(await Phaser.triggerObjectInteraction(player.page, npc.npcKey), 'The interaction is sent again').toBe(true);
        await expect(npc.dialog, 'The same NPC dialog opens again').toBeVisible({timeout: TimeConstants.UI_OPEN});
    }

    static async runAwayFromNpcTest(context, isInteractionSent)
    {
        let player = await TestNpcDialogs.enterPlayer(context);
        let npc = await NpcDialogSteps.openDialog(context, player.page, context.gameConfig.e2eNpcKey);
        await MovementScenario.placePlayerOnReturnPoint(
            player.page,
            MovementScenario.createWalkContext(context.gameConfig, Login.TOWN_ROOM_NAME, player.playerName, context.longRun)
        );
        if(isInteractionSent){
            expect(await Phaser.triggerObjectInteraction(player.page, npc.npcKey), 'The far interaction is sent').toBe(true);
        }
        await player.page.waitForTimeout(TimeConstants.ACTION);
        await expect(npc.dialog, 'Only the interaction sent out of reach closes the open dialog')
            .toHaveCount(isInteractionSent ? 0 : 1);
    }

    static async runMissingObjectTest(context)
    {
        let player = await TestNpcDialogs.enterPlayer(context);
        await NpcDialogSteps.placeNextToNpc(context, player.page, context.gameConfig.e2eNpcKey);
        await RoomMessagesRecorder.sendMessage(player.page, {
            act: ObjectsConst.OBJECT_INTERACTION,
            id: TestNpcDialogs.MISSING_OBJECT_ID
        });
        await TestNpcDialogs.expectNoDialog(player.page, 'An interaction with a missing object id opens nothing');
    }

    static async runRoomActionsTest(context, customData)
    {
        let player = await TestNpcDialogs.enterPlayer(context);
        let npc = await NpcDialogSteps.placeNextToNpc(context, player.page, context.gameConfig.e2eNpcKey);
        await NpcDialogSteps.changeRoomCustomData(context, Login.TOWN_ROOM_NAME, customData);
        expect(await Phaser.triggerObjectInteraction(player.page, npc.npcKey), 'The interaction is sent').toBe(true);
        await TestNpcDialogs.expectNoDialog(player.page, 'The room actions rules block the NPC interaction');
    }

    static async runRealClickTest(context, npcKey, openedSelector)
    {
        let player = await TestNpcDialogs.enterPlayer(context);
        let npc = await NpcDialogSteps.placeNextToNpc(context, player.page, npcKey);
        expect(
            await Phaser.clickObjectAwayFromOwnPlayer(player.page, npc.npcKey, TestNpcDialogs.CLICK_OFFSET),
            'The NPC sprite is clicked on the canvas'
        ).toBe(true);
        await expect(player.page.locator(openedSelector).first(), 'The real click opens the NPC dialog')
            .toBeVisible({timeout: TimeConstants.UI_OPEN});
        await expect(player.page.locator(Selectors.combat.targetBox), 'The target box shows the NPC title')
            .toContainText((await TestNpcDialogs.fetchNpcRow(context, npcKey)).title);
    }

    static async runUiOverlayClickTest(context)
    {
        let player = await TestNpcDialogs.enterPlayer(context);
        let npc = await NpcDialogSteps.placeNextToNpc(context, player.page, context.gameConfig.e2eNpcKey);
        expect(
            await Phaser.clickPageElementOverObject(player.page, npc.npcKey, TestNpcDialogs.CLICK_OFFSET),
            'The page element over the NPC sprite is clicked'
        ).toBe(true);
        await TestNpcDialogs.expectNoDialog(player.page, 'A click with a page element under the pointer opens nothing');
        await NpcDialogSteps.expectOpenDialogs(context, npc, [], 'No interaction reached the NPC');
    }

    static run()
    {
        test.describe('NPC Dialogs', () => {
            test('the NPC dialog shows the stored title and content and no option button for an NPC without options', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogs.runStoredContentTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the close button closes the dialog of a moving NPC, releases it and the dialog opens again', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogs.runCloseButtonTest({page, gameConfig, e2eGroup, longRun}, true);
            });
            test('with the random movement off the closed NPC dialog starts no movement timer', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogs.runCloseButtonTest({page, gameConfig, e2eGroup, longRun}, false);
            });
            test('an interaction sent from out of reach closes the open NPC dialog', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogs.runAwayFromNpcTest({page, gameConfig, e2eGroup, longRun}, true);
            });
            test('a player walking away from the NPC with no interaction keeps the dialog open', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogs.runAwayFromNpcTest({page, gameConfig, e2eGroup, longRun}, false);
            });
            test('an interaction with an object id that does not exist opens nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogs.runMissingObjectTest({page, gameConfig, e2eGroup, longRun});
            });
            test('in a room with every action disabled the NPC interaction opens nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogs.runRoomActionsTest({page, gameConfig, e2eGroup, longRun}, {allActionsDisabled: true});
            });
            test('in a room with the interaction disallowed the NPC interaction opens nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogs.runRoomActionsTest(
                    {page, gameConfig, e2eGroup, longRun},
                    {disallowedActions: [ObjectsConst.OBJECT_INTERACTION]}
                );
            });
            test('a real canvas click on the NPC opens its dialog and shows its title in the target box', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogs.runRealClickTest(
                    {page, gameConfig, e2eGroup, longRun},
                    gameConfig.e2eNpcKey,
                    Selectors.npc.dialogue
                );
            });
            test('a real canvas click on the trader opens its options and shows its title in the target box', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogs.runRealClickTest(
                    {page, gameConfig, e2eGroup, longRun},
                    gameConfig.e2eTraderKey,
                    '[data-option-value="buy"]'
                );
            });
            test('a click on the NPC with a page element under the pointer opens nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogs.runUiOverlayClickTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestNpcDialogs.run();
