/**
 *
 * Reldens - Test Teleport NPC Options
 *
 * Tests the teleport NPC option checks (exclusive group, the town teleport NPC Portia, TeleportNpcSteps, the room
 * messages recorded on the page): the stored "House 1" option moves the player to that room; with
 * sendInvalidOptionMessage off for the group an option value out of the options gets no message and relocates nothing;
 * the forest option sent with the id of another town object is ignored by Portia; a player next to Portia that sends
 * an option without opening the dialog is relocated (the server only checks the reach, no open dialog); with
 * closeInteractionOnOutOfReach off for the group an option sent out of reach keeps the dialog open and relocates
 * nothing; an interaction sent from out of reach opens no dialog; the town custom data with every action disabled or
 * with the option action disallowed (for the group) makes Portia ignore the option; a player that teleported to the
 * forest and walked back through the change point teleports again; and a guest choosing a room of the guest rooms is
 * relocated.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TeamSteps } = require('./helpers/team-steps');
const { TeleportNpcSteps } = require('./helpers/teleport-npc-steps');
const { NpcDialogSteps } = require('./helpers/npc-dialog-steps');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { CharacterCreation } = require('./helpers/character-creation');
const { Phaser } = require('./helpers/phaser');
const { Navigation } = require('./helpers/navigation');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeleportNpcOptions
{

    static HOUSE_OPTION_VALUE = 2;
    static HOUSE_ROOM_NAME = 'reldens-new-age-town-house-01';
    static NOT_AN_OPTION_VALUE = 999;

    static async enterPlayer(context)
    {
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        player.walkContext = MovementScenario.createWalkContext(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            player.playerName,
            context.longRun
        );
        return player;
    }

    static async expectStillInTown(page, message)
    {
        await page.waitForTimeout(TimeConstants.ACTION);
        expect(await Navigation.getCurrentRoomName(page), message).toBe(Login.TOWN_ROOM_NAME);
    }

    static async fetchNpcMessages(npc, act)
    {
        let [npcId, messages] = await Promise.all([
            npc.page.evaluate(
                (objectKey) => window.reldens.getActiveScene().objectsAnimations[objectKey].id,
                npc.teleportData.clientKey
            ),
            RoomMessagesRecorder.fetchMessages(npc.page, act)
        ]);
        return messages.filter(message => npcId === message.id);
    }

    static async runHouseOptionTest(context)
    {
        let player = await TestTeleportNpcOptions.enterPlayer(context);
        let npc = await TeleportNpcSteps.openDialog(context, player.page);
        await TeleportNpcSteps.chooseOption(npc, TestTeleportNpcOptions.HOUSE_OPTION_VALUE);
        await Navigation.waitForRoom(player.page, TestTeleportNpcOptions.HOUSE_ROOM_NAME, TimeConstants.ROOM_TRANSITION);
    }

    static async runSilentInvalidOptionTest(context)
    {
        let player = await TestTeleportNpcOptions.enterPlayer(context);
        let npc = await TeleportNpcSteps.openDialog(context, player.page);
        await TeleportNpcSteps.changeNpcProperty(context, npc, 'sendInvalidOptionMessage', false);
        let shownBefore = (await TestTeleportNpcOptions.fetchNpcMessages(npc, GameConst.UI)).length;
        await TeleportNpcSteps.chooseOption(npc, TestTeleportNpcOptions.NOT_AN_OPTION_VALUE);
        await TestTeleportNpcOptions.expectStillInTown(player.page, 'The invalid option relocates nothing');
        expect(
            (await TestTeleportNpcOptions.fetchNpcMessages(npc, GameConst.UI)).length,
            'With sendInvalidOptionMessage off the invalid option gets no message'
        ).toBe(shownBefore);
    }

    static async runOtherObjectIdTest(context)
    {
        let player = await TestTeleportNpcOptions.enterPlayer(context);
        let npc = await TeleportNpcSteps.openDialog(context, player.page);
        await RoomMessagesRecorder.sendObjectMessage(player.page, context.gameConfig.e2eNpcKey, {
            act: GameConst.BUTTON_OPTION,
            value: npc.teleportData.optionValue
        });
        await TestTeleportNpcOptions.expectStillInTown(player.page, 'Portia ignores an option sent with another object id');
    }

    static async runOptionWithoutDialogTest(context)
    {
        let player = await TestTeleportNpcOptions.enterPlayer(context);
        let npc = await TeleportNpcSteps.placeNextToNpc(context, player.page);
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await Navigation.waitForRoom(player.page, npc.teleportData.destinationRoom, TimeConstants.ROOM_TRANSITION);
    }

    static async runKeptDialogOutOfReachTest(context)
    {
        let player = await TestTeleportNpcOptions.enterPlayer(context);
        let npc = await TeleportNpcSteps.openDialog(context, player.page);
        await TeleportNpcSteps.changeNpcProperty(context, npc, 'closeInteractionOnOutOfReach', false);
        await MovementScenario.placePlayerOnReturnPoint(player.page, player.walkContext);
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await TestTeleportNpcOptions.expectStillInTown(player.page, 'The option out of reach relocates nothing');
        await expect(
            npc.dialog.locator('[data-option-value="'+npc.teleportData.optionValue+'"]'),
            'With closeInteractionOnOutOfReach off the dialog stays open'
        ).toBeVisible();
    }

    static async runInteractionOutOfReachTest(context)
    {
        let player = await TestTeleportNpcOptions.enterPlayer(context);
        let npc = await TeleportNpcSteps.placeNextToNpc(context, player.page);
        await MovementScenario.placePlayerOnReturnPoint(player.page, player.walkContext);
        expect(await Phaser.triggerObjectInteraction(player.page, npc.teleportData.clientKey), 'The NPC interaction is sent')
            .toBe(true);
        await player.page.waitForTimeout(TimeConstants.ACTION);
        await expect(npc.dialog, 'The interaction from out of reach opens no dialog').toHaveCount(0);
    }

    static async runRoomActionsTest(context, customData, message)
    {
        let player = await TestTeleportNpcOptions.enterPlayer(context);
        let npc = await TeleportNpcSteps.openDialog(context, player.page);
        await NpcDialogSteps.changeRoomCustomData(context, Login.TOWN_ROOM_NAME, customData);
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await TestTeleportNpcOptions.expectStillInTown(player.page, message);
    }

    static async runTeleportAgainTest(context)
    {
        let player = await TestTeleportNpcOptions.enterPlayer(context);
        for(let teleportNumber of [1, 2]){
            let npc = await TeleportNpcSteps.openDialog(context, player.page);
            await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
            await Navigation.waitForRoom(player.page, Login.FOREST_ROOM_NAME, TimeConstants.ROOM_TRANSITION);
            await TeamSteps.waitForScenePreloader(player.page, Login.FOREST_ROOM_NAME);
            if(1 === teleportNumber){
                await TeamSteps.changeScene(context, player, Login.FOREST_ROOM_NAME, Login.TOWN_ROOM_NAME);
            }
        }
        expect(
            (await GameplayE2eStateApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, player.playerName)).scene,
            'The second teleport leaves the player in the forest'
        ).toBe(Login.FOREST_ROOM_NAME);
    }

    static async runGuestRoomTest(context)
    {
        await CharacterCreation.enterGuestInGame(context.page, context.longRun, Login.TOWN_ROOM_NAME);
        let npc = await TeleportNpcSteps.openDialog(context, context.page);
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await Navigation.waitForRoom(context.page, npc.teleportData.destinationRoom, TimeConstants.ROOM_TRANSITION);
    }

    static run()
    {
        test.describe('Teleport NPC Options', () => {
            test('the House 1 option moves the player to that room', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcOptions.runHouseOptionTest({page, gameConfig, e2eGroup, longRun});
            });
            test('with the invalid option message off an invalid option gets no message and relocates nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcOptions.runSilentInvalidOptionTest({page, gameConfig, e2eGroup, longRun});
            });
            test('an option sent with the id of another object is ignored by the teleport NPC', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcOptions.runOtherObjectIdTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a player in reach that sends an option without opening the dialog is relocated', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcOptions.runOptionWithoutDialogTest({page, gameConfig, e2eGroup, longRun});
            });
            test('with the out of reach close off an option out of reach keeps the dialog and relocates nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcOptions.runKeptDialogOutOfReachTest({page, gameConfig, e2eGroup, longRun});
            });
            test('an interaction sent from out of reach opens no dialog', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcOptions.runInteractionOutOfReachTest({page, gameConfig, e2eGroup, longRun});
            });
            test('in a room with every action disabled the teleport option relocates nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcOptions.runRoomActionsTest(
                    {page, gameConfig, e2eGroup, longRun},
                    {allActionsDisabled: true},
                    'Every action disabled: Portia ignores the option'
                );
            });
            test('in a room with the option action disallowed the teleport option relocates nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcOptions.runRoomActionsTest(
                    {page, gameConfig, e2eGroup, longRun},
                    {disallowedActions: [GameConst.BUTTON_OPTION]},
                    'The option action disallowed: Portia ignores the option'
                );
            });
            test('a player that teleported and walked back through a change point teleports again', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcOptions.runTeleportAgainTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a guest choosing a room of the guest rooms is relocated', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcOptions.runGuestRoomTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTeleportNpcOptions.run();
