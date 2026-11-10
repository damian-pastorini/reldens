/**
 *
 * Reldens - Test Chat Global
 *
 * Tests the global chat room of the group players (ChatSteps, the messages each client receives recorded from the
 * scene room and the global chat room, and the stored chat rows of the sender): a rejected global message (disabled
 * for the group) reaches only the sender; a second global or private message inside the cooldown is dropped; tampered
 * messages with a blank or non string text, with no "#" or "@" (which still uses the cooldown) or a global message
 * ending in "@" and a space are delivered to nobody and store no row; a message over the stored text column (the limit
 * raised for the group) is still broadcast and stores no row; and a send with the chat room connection lost reaches no
 * other client.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ChatSteps } = require('./helpers/chat-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { ChatConst } = require('../../lib/chat/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestChatGlobal
{

    static COOLDOWN_MS = 1100;
    static SETTLE_MS = 1500;
    static LIMIT_PATH = 'client/chat/messages/characterLimit';
    static GLOBAL_ENABLED_PATH = 'server/chat/messages/global_enabled';
    static OVER_COLUMN_LIMIT = 200;
    static OVER_COLUMN_LENGTH = 180;

    static async enter(context, withThird = false)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 4, context.longRun));
        return await ChatSteps.enterPlayers(context, withThird);
    }

    static async fetchStoredRows(gameConfig, text)
    {
        return await E2eSeedAndRestoreApi.loadRows(gameConfig, 'chat', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName}),
            message: text
        });
    }

    static async expectTexts(page, chatType, expectedTexts, message)
    {
        await expect.poll(async () => await ChatSteps.fetchTexts(page, chatType), {message, timeout: TimeConstants.SERVER_RESPONSE})
            .toEqual(expectedTexts);
    }

    static async runRejectedTest(context)
    {
        await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, TestChatGlobal.GLOBAL_ENABLED_PATH, false);
        await TestChatGlobal.enter(context);
        await ChatSteps.sendText(context.page, '#e2e-rejected-global');
        await TestChatGlobal.expectTexts(
            context.page,
            ChatConst.TYPES.ERROR,
            [ChatConst.SNIPPETS.GLOBAL_MESSAGE_NOT_ALLOWED],
            'The sender gets the rejection'
        );
        await context.secondPage.waitForTimeout(TestChatGlobal.SETTLE_MS);
        expect(await ChatSteps.fetchChat(context.secondPage), 'The other client sees nothing').toEqual([]);
    }

    static async runCooldownTest(context)
    {
        await TestChatGlobal.enter(context);
        let text = 'e2e-global-cooldown-'+Date.now();
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: '#'+text}, true);
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: '#'+text+'-dropped'}, true);
        await ChatSteps.sendRaw(context.page, {
            [ChatConst.MESSAGE.KEY]: '@'+context.gameConfig.e2ePlayerName2+' '+text+'-private-dropped',
            [ChatConst.CHAT_TO]: context.gameConfig.e2ePlayerName2
        }, true);
        await context.secondPage.waitForTimeout(TestChatGlobal.SETTLE_MS);
        expect(await ChatSteps.fetchTexts(context.secondPage), 'Only the first message passes').toEqual([text]);
    }

    static async runTamperedTest(context)
    {
        await TestChatGlobal.enter(context);
        for(let rawText of [9, '', '   ', 'e2e-no-prefix', '#e2e@x ']){
            await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: rawText}, true);
            await context.page.waitForTimeout(TestChatGlobal.COOLDOWN_MS);
            expect(await TestChatGlobal.fetchStoredRows(context.gameConfig, String(rawText).replace('#', '')), 'No row').toEqual([]);
        }
        await context.secondPage.waitForTimeout(TestChatGlobal.SETTLE_MS);
        expect(await ChatSteps.fetchChat(context.secondPage), 'Nothing is delivered').toEqual([]);
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: 'e2e-no-prefix-cooldown'}, true);
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: '#e2e-after-no-prefix'}, true);
        await context.secondPage.waitForTimeout(TestChatGlobal.SETTLE_MS);
        expect(await ChatSteps.fetchChat(context.secondPage), 'The message with no prefix uses the cooldown').toEqual([]);
    }

    static async runOverColumnTest(context)
    {
        await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, TestChatGlobal.LIMIT_PATH, TestChatGlobal.OVER_COLUMN_LIMIT);
        await TestChatGlobal.enter(context);
        let text = 'g'.repeat(TestChatGlobal.OVER_COLUMN_LENGTH);
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: '#'+text}, true);
        await TestChatGlobal.expectTexts(context.secondPage, ChatConst.TYPES.GLOBAL, [text], 'The long message is broadcast');
        expect(await TestChatGlobal.fetchStoredRows(context.gameConfig, text), 'No row is stored').toEqual([]);
    }

    static async runConnectionLostTest(context)
    {
        await TestChatGlobal.enter(context);
        await context.page.evaluate((globalKey) => window.reldens.joinedRooms[globalKey].connection.close(), ChatConst.CHAT_GLOBAL);
        await ChatSteps.sendText(context.page, '#e2e-connection-lost');
        await context.secondPage.waitForTimeout(TestChatGlobal.SETTLE_MS);
        expect(
            await ChatSteps.fetchTexts(context.secondPage, ChatConst.TYPES.GLOBAL),
            'The message sent on the lost connection arrives nowhere'
        ).toEqual([]);
    }

    static run()
    {
        test.describe('Chat Global', () => {
            test('rejected global message reaches only the sender', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatGlobal.runRejectedTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('global and private messages inside the cooldown are dropped', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatGlobal.runCooldownTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('tampered chat room messages are delivered to nobody with no row', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatGlobal.runTamperedTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('message over the stored column is broadcast with no row', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatGlobal.runOverColumnTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('send with the chat room connection lost reaches no other client', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatGlobal.runConnectionLostTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestChatGlobal.run();
