/**
 *
 * Reldens - Test NPC Dialog Players
 *
 * Tests the town NPC dialogs with the players around them (exclusive group, NpcDialogSteps, the group players in the
 * town): the dialog is sent only to the player that sent the interaction, and the NPC opened by two players stays in
 * the pause list of each one until each one closes it; the player that leaves the room with the dialog open releases
 * the NPC (a dead player still opens the NPC dialogs, ISSUE #352); the dialog closes with the change point scene change, or stays open with
 * automaticallyCloseAllDialogsOnSceneChange off; the NPC target of the real sprite click is cleared when its dialog
 * opens with client/ui/uiTarget/hideOnDialog on, and kept with it off; and the healer answer to the option of one
 * player reaches only that player while another player keeps the same dialog open.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { NpcDialogSteps } = require('./helpers/npc-dialog-steps');
const { LoginServerApi } = require('./helpers/login-server-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestNpcDialogPlayers
{

    static CLOSE_DIALOGS_PATH = 'client/rooms/automaticallyCloseAllDialogsOnSceneChange';
    static HIDE_TARGET_PATH = 'client/ui/uiTarget/hideOnDialog';
    static HEALER_KEY = 'healer_1';
    static HEAL_HP_OPTION = '1';
    static HEAL_HP_MESSAGE = 'Your HP points has been restored!';
    static CLICK_OFFSET = 8;

    static async runTwoPlayersTest(context)
    {
        let players = await TeamSteps.enterPlayers(context, 2);
        let npcKey = context.gameConfig.e2eNpcKey;
        let firstNpc = await NpcDialogSteps.openDialog(context, players[0].page, npcKey);
        await players[1].page.waitForTimeout(TimeConstants.ACTION);
        await expect(
            players[1].page.locator(Selectors.npc.dialogue).filter({visible: true}),
            'The dialog is sent only to the player that sent the interaction'
        ).toHaveCount(0);
        let secondNpc = await NpcDialogSteps.openDialog(context, players[1].page, npcKey);
        let sessionIds = players.map(player => player.sessionId);
        await NpcDialogSteps.expectOpenDialogs(context, firstNpc, sessionIds, 'Both players pause the NPC');
        await firstNpc.dialog.locator('.box-close').click();
        await NpcDialogSteps.expectOpenDialogs(context, firstNpc, [sessionIds[1]], 'The second dialog keeps it paused');
        await secondNpc.dialog.locator('.box-close').click();
        await NpcDialogSteps.expectOpenDialogs(context, firstNpc, [], 'The last close releases the NPC');
    }

    static async runLeavingPlayerTest(context)
    {
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        let npc = await NpcDialogSteps.openDialog(context, player.page, context.gameConfig.e2eNpcKey);
        await NpcDialogSteps.expectOpenDialogs(context, npc, [player.sessionId], 'The open dialog pauses the NPC');
        await player.page.goto('about:blank');
        await expect.poll(
            async () => LoginServerApi.fetchPlayersInRoom(context.gameConfig, Login.TOWN_ROOM_NAME, player.playerName),
            {message: 'The player left the town', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(0);
        await NpcDialogSteps.expectOpenDialogs(context, npc, [], 'The leaving player releases the NPC');
    }

    static async runChangePointTest(context, isCloseEnabled)
    {
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            TestNpcDialogPlayers.CLOSE_DIALOGS_PATH,
            isCloseEnabled
        );
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        let npc = await NpcDialogSteps.openDialog(context, player.page, context.gameConfig.e2eNpcKey);
        await TeamSteps.changeScene(context, player, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await expect(npc.dialog, 'The change point scene change closes the dialog only with the config on')
            .toHaveCount(isCloseEnabled ? 0 : 1);
    }

    static async runHideTargetTest(context, isHideEnabled)
    {
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            TestNpcDialogPlayers.HIDE_TARGET_PATH,
            isHideEnabled
        );
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        let npc = await NpcDialogSteps.placeNextToNpc(context, player.page, context.gameConfig.e2eNpcKey);
        expect(
            await Phaser.clickObjectAwayFromOwnPlayer(player.page, npc.npcKey, TestNpcDialogPlayers.CLICK_OFFSET),
            'The NPC sprite is clicked on the canvas'
        ).toBe(true);
        await expect(npc.dialog, 'The sprite click opens the dialog').toBeVisible({timeout: TimeConstants.UI_OPEN});
        expect(
            Boolean(await player.page.evaluate(() => window.reldens.getActiveScene().player.currentTarget)),
            'The NPC target is cleared by the dialog only with hideOnDialog on'
        ).toBe(!isHideEnabled);
    }

    static async runHealerAnswerTest(context)
    {
        let players = await TeamSteps.enterPlayers(context, 2);
        let firstNpc = await NpcDialogSteps.openDialog(context, players[0].page, TestNpcDialogPlayers.HEALER_KEY);
        let secondNpc = await NpcDialogSteps.openDialog(context, players[1].page, TestNpcDialogPlayers.HEALER_KEY);
        let secondContent = await secondNpc.dialog.locator('.box-content').innerText();
        await firstNpc.dialog.locator('[data-option-value="'+TestNpcDialogPlayers.HEAL_HP_OPTION+'"]').click();
        await expect(firstNpc.dialog.locator('.box-content'), 'The healer answers the player that chose the option')
            .toHaveText(TestNpcDialogPlayers.HEAL_HP_MESSAGE, {timeout: TimeConstants.SERVER_RESPONSE});
        await players[1].page.waitForTimeout(TimeConstants.ACTION);
        await expect(secondNpc.dialog.locator('.box-content'), 'The other player keeps its own dialog content')
            .toHaveText(secondContent);
        expect(
            (await RoomMessagesRecorder.fetchMessages(players[1].page, GameConst.UI)).filter(
                message => TestNpcDialogPlayers.HEAL_HP_MESSAGE === message.content
            ),
            'The other player gets no healer answer'
        ).toEqual([]);
    }

    static run()
    {
        test.describe('NPC Dialog Players', () => {
            test('the NPC dialog reaches only its player and each player keeps the NPC paused until it closes', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogPlayers.runTwoPlayersTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a player leaving the room with the NPC dialog open releases the NPC', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogPlayers.runLeavingPlayerTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a change point scene change closes the open NPC dialog', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogPlayers.runChangePointTest({page, gameConfig, e2eGroup, longRun}, true);
            });
            test('with the dialogs close off the NPC dialog stays open after a change point', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogPlayers.runChangePointTest({page, gameConfig, e2eGroup, longRun}, false);
            });
            test('with hideOnDialog on the NPC dialog clears the target of the sprite click', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogPlayers.runHideTargetTest({page, gameConfig, e2eGroup, longRun}, true);
            });
            test('with hideOnDialog off the NPC dialog keeps the target of the sprite click', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogPlayers.runHideTargetTest({page, gameConfig, e2eGroup, longRun}, false);
            });
            test('the healer answer to one player option reaches only that player', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestNpcDialogPlayers.runHealerAnswerTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestNpcDialogPlayers.run();
