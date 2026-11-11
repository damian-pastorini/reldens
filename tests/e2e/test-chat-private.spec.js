/**
 *
 * Reldens - Test Chat Private
 *
 * Tests the private chat messages between the group players (ChatSteps, the messages each client receives recorded
 * from the scene room and the global chat room, and the stored chat rows of the sender): the sender and the recipient
 * get the message and an unrelated third player does not; a message to an unknown name or with the wrong letter case
 * returns the translated not found error to the sender only; a message to oneself reaches the same client twice; an
 * "@name" with no text is not sent and the input is cleared; a tampered message reaches only the "t" recipient and one
 * with no "t" reaches nobody and stores no row; a third player in the scene never sees the content over the sender; and a recipient that
 * reloaded and logged in again gets one copy.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ChatSteps } = require('./helpers/chat-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ChatConst } = require('../../lib/chat/constants');
const ChatTranslations = require('../../lib/chat/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestChatPrivate
{

    static COOLDOWN_MS = 1100;
    static SETTLE_MS = 1500;

    static async enter(context, withThird = false)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 4, context.longRun));
        return await ChatSteps.enterPlayers(context, withThird);
    }

    static privateText(playerName, text)
    {
        return '@'+playerName+' '+text;
    }

    static async fetchPrivateTexts(page)
    {
        return await ChatSteps.fetchTexts(page, ChatConst.TYPES.PRIVATE);
    }

    static async expectPrivate(page, expectedTexts, message)
    {
        await expect.poll(async () => await TestChatPrivate.fetchPrivateTexts(page), {message, timeout: TimeConstants.SERVER_RESPONSE})
            .toEqual(expectedTexts);
    }

    static async fetchStoredRows(gameConfig, text)
    {
        return await E2eSeedAndRestoreApi.loadRows(gameConfig, 'chat', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName}),
            message: text
        });
    }

    static async runDeliveryTest(context)
    {
        let pages = await TestChatPrivate.enter(context, true);
        let text = 'e2e-private-'+Date.now();
        await ChatSteps.sendText(context.page, TestChatPrivate.privateText(context.gameConfig.e2ePlayerName2, text));
        await TestChatPrivate.expectPrivate(context.page, [text], 'The sender gets its message');
        await TestChatPrivate.expectPrivate(context.secondPage, [text], 'The recipient gets the message');
        await pages[2].waitForTimeout(TestChatPrivate.SETTLE_MS);
        expect(await ChatSteps.fetchPlayersChat(pages[2]), 'The unrelated player gets nothing').toEqual([]);
        expect(await pages[2].evaluate(
            (senderName) => Object.values(window.reldens.getCurrentPlayer().players).some(
                player => senderName === player.playerName && Boolean(player.overheadTextSprite)
            ),
            context.gameConfig.e2ePlayerName
        ), 'The third player sees no text over the sender').toBe(false);
    }

    static async runNotFoundTest(context)
    {
        await TestChatPrivate.enter(context);
        let wrongCaseName = context.gameConfig.e2ePlayerName2.toLowerCase();
        for(let recipientName of ['e2eMissingPlayer', wrongCaseName]){
            await ChatSteps.recordChat(context.page);
            await ChatSteps.sendText(context.page, TestChatPrivate.privateText(recipientName, 'e2e-not-found'));
            await expect(context.page.locator(Selectors.chat.tabContentGeneral), 'The translated not found error')
                .toContainText(ChatTranslations.chat.playerNotFound.replace('%playerName', recipientName));
            await context.page.waitForTimeout(TestChatPrivate.COOLDOWN_MS);
        }
        expect(await ChatSteps.fetchPlayersChat(context.secondPage), 'Nothing is delivered').toEqual([]);
    }

    static async runSelfMessageTest(context)
    {
        await TestChatPrivate.enter(context);
        let text = 'e2e-self-'+Date.now();
        await ChatSteps.sendText(context.page, TestChatPrivate.privateText(context.gameConfig.e2ePlayerName, text));
        await TestChatPrivate.expectPrivate(context.page, [text, text], 'A message to oneself arrives twice');
    }

    static async runNameOnlyTest(context)
    {
        await TestChatPrivate.enter(context);
        await ChatSteps.sendText(context.page, '@'+context.gameConfig.e2ePlayerName2);
        await expect(context.page.locator(Selectors.chat.input), 'The input is cleared').toHaveValue('');
        await context.secondPage.waitForTimeout(TestChatPrivate.SETTLE_MS);
        expect(await ChatSteps.fetchPlayersChat(context.page), 'Nothing is sent').toEqual([]);
        expect(await ChatSteps.fetchPlayersChat(context.secondPage), 'Nothing is delivered').toEqual([]);
    }

    static async runTamperedTest(context)
    {
        let pages = await TestChatPrivate.enter(context, true);
        let text = 'e2e-tampered-'+Date.now();
        await ChatSteps.sendRaw(context.page, {
            [ChatConst.MESSAGE.KEY]: TestChatPrivate.privateText(context.gameConfig.e2ePlayerName2, text),
            [ChatConst.CHAT_TO]: context.gameConfig.e2ePlayerName3
        }, true);
        await TestChatPrivate.expectPrivate(pages[2], [text], 'Only the "t" recipient gets it');
        expect(await TestChatPrivate.fetchPrivateTexts(context.secondPage), 'The named player gets nothing').toEqual([]);
        let noRecipientMessage = {
            [ChatConst.MESSAGE.KEY]: TestChatPrivate.privateText(context.gameConfig.e2ePlayerName2, text+'-no-to')
        };
        await context.page.waitForTimeout(TestChatPrivate.COOLDOWN_MS);
        await ChatSteps.recordChat(context.secondPage);
        await ChatSteps.sendRaw(context.page, noRecipientMessage, true);
        await context.secondPage.waitForTimeout(TestChatPrivate.SETTLE_MS);
        expect(await ChatSteps.fetchPlayersChat(context.secondPage), 'Nothing is delivered').toEqual([]);
        expect(await TestChatPrivate.fetchStoredRows(context.gameConfig, noRecipientMessage[ChatConst.MESSAGE.KEY]), 'No row')
            .toEqual([]);
    }

    static async runReloginTest(context)
    {
        await TestChatPrivate.enter(context);
        await context.secondPage.reload();
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun, '2');
        await ChatSteps.recordChat(context.secondPage);
        let text = 'e2e-relogin-'+Date.now();
        await ChatSteps.sendText(context.page, TestChatPrivate.privateText(context.gameConfig.e2ePlayerName2, text));
        await TestChatPrivate.expectPrivate(context.secondPage, [text], 'The logged in again recipient gets one copy');
        await context.secondPage.waitForTimeout(TestChatPrivate.SETTLE_MS);
        expect(await TestChatPrivate.fetchPrivateTexts(context.secondPage), 'Still one copy').toEqual([text]);
    }

    static run()
    {
        test.describe('Chat Private', () => {
            test('sender and recipient get the message and an unrelated player does not', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatPrivate.runDeliveryTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('unknown or wrong case name returns the not found error to the sender only', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatPrivate.runNotFoundTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('message to oneself arrives twice', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatPrivate.runSelfMessageTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('name with no text is not sent and the input is cleared', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatPrivate.runNameOnlyTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('tampered private messages reach only the "t" recipient or nobody', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatPrivate.runTamperedTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('recipient logged in again gets one copy', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatPrivate.runReloginTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestChatPrivate.run();
