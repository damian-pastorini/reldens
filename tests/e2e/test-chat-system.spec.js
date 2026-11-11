/**
 *
 * Reldens - Test Chat System
 *
 * Tests the system chat lines and the stored chat rows of the group players (ChatSteps, the join and leave broadcasts
 * changed for the group before the logins): with broadcast_join on the first player sees the second player joined line
 * and with it off sees none; with broadcast_leave on the first player sees the second player left line when it
 * disconnects and with it off sees none; and a room, a global and a private message are stored with their type, the
 * room of the sender and the private recipient.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ChatSteps } = require('./helpers/chat-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ChatConst } = require('../../lib/chat/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestChatSystem
{

    static JOIN_PATH = 'server/chat/messages/broadcast_join';
    static LEAVE_PATH = 'server/chat/messages/broadcast_leave';
    static COOLDOWN_MS = 1100;
    static SETTLE_MS = 1500;

    static async enterFirst(context, configValues = {})
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 3, context.longRun));
        for(let configPath of Object.keys(configValues)){
            await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, configPath, configValues[configPath]);
        }
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await ChatSteps.recordChat(context.page);
    }

    static async fetchSystemLines(page, snippet)
    {
        return (await ChatSteps.fetchChat(page)).filter(
            message => ChatConst.TYPES.SYSTEM === message[ChatConst.TYPES.KEY] && snippet === message[ChatConst.MESSAGE.KEY]
        ).map(message => message[ChatConst.MESSAGE.DATA.KEY][ChatConst.MESSAGE.DATA.PLAYER_NAME]);
    }

    static async runJoinLineTest(context, broadcastJoin, expectedNames)
    {
        await TestChatSystem.enterFirst(context, {[TestChatSystem.JOIN_PATH]: broadcastJoin});
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun, '2');
        await context.page.waitForTimeout(TestChatSystem.SETTLE_MS);
        expect(await TestChatSystem.fetchSystemLines(context.page, ChatConst.SNIPPETS.JOINED_ROOM), 'The joined lines')
            .toEqual(expectedNames);
    }

    static async runLeaveLineTest(context, broadcastLeave, expectedNames)
    {
        await TestChatSystem.enterFirst(context, {[TestChatSystem.LEAVE_PATH]: broadcastLeave});
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun, '2');
        await context.secondPage.reload();
        await context.page.waitForTimeout(TestChatSystem.SETTLE_MS);
        expect(await TestChatSystem.fetchSystemLines(context.page, ChatConst.SNIPPETS.LEFT_ROOM), 'The left lines')
            .toEqual(expectedNames);
    }

    static async runStoredRowsTest(context)
    {
        await ChatSteps.enterPlayers(context);
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'players', {name: context.gameConfig.e2ePlayerName});
        let recipientId = await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'players', {name: context.gameConfig.e2ePlayerName2});
        let roomId = Number((await E2eSeedAndRestoreApi.fetchPlayerState(context.gameConfig, context.gameConfig.e2ePlayerName)).room_id);
        let text = 'e2e-stored-'+Date.now();
        await ChatSteps.sendText(context.page, text);
        await context.page.waitForTimeout(TestChatSystem.COOLDOWN_MS);
        await ChatSteps.sendText(context.page, '#'+text);
        await context.page.waitForTimeout(TestChatSystem.COOLDOWN_MS);
        await ChatSteps.sendText(context.page, '@'+context.gameConfig.e2ePlayerName2+' '+text);
        await expect.poll(async () => (await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'chat', {player_id: playerId}))
            .filter(row => -1 !== String(row.message).indexOf(text))
            .map(row => [String(row.message).trim(), Number(row.message_type), Number(row.room_id), Number(row.private_player_id || 0)])
            .sort((rowA, rowB) => rowA[1] - rowB[1]), {message: 'The stored rows', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([
            [text, ChatConst.TYPES.MESSAGE, roomId, 0],
            [text, ChatConst.TYPES.PRIVATE, roomId, recipientId],
            [text, ChatConst.TYPES.GLOBAL, roomId, 0]
        ]);
    }

    static run()
    {
        test.describe('Chat System', () => {
            test('broadcast join on shows the joined line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatSystem.runJoinLineTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, true, [gameConfig.e2ePlayerName2]);
            });
            test('broadcast join off shows no joined line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatSystem.runJoinLineTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, false, []);
            });
            test('broadcast leave on shows the left line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatSystem.runLeaveLineTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, true, [gameConfig.e2ePlayerName2]);
            });
            test('broadcast leave off shows no left line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatSystem.runLeaveLineTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, false, []);
            });
            test('room, global and private messages are stored with their type, room and recipient', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatSystem.runStoredRowsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestChatSystem.run();
