/**
 *
 * Reldens - Test Chat Messages
 *
 * Tests the room chat messages of the group players in their scene (ChatSteps, the messages each client receives
 * recorded from the scene room and the global chat room, and the stored chat rows of the sender): three clients see a
 * room message once each; an HTML text and a text equal to a snippet key are
 * shown as literal text; a dead player message is still broadcast; an input with only "#", "@" or blanks is not sent
 * and the raw blank, non string or prefix only messages are dropped with no row; a message over the character limit is
 * cut by the client and by the server, one with exactly the limit arrives whole and a limit of 0 cuts nothing; the
 * backslashes are removed and the line breaks replaced; and the cooldown drops a second room message, keeps separate
 * counters for the room and the global messages, lets a message after it pass, and with 0 lets every message pass.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ChatSteps } = require('./helpers/chat-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Navigation } = require('./helpers/navigation');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ChatConst } = require('../../lib/chat/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestChatMessages
{

    static LIMIT_PATH = 'client/chat/messages/characterLimit';
    static COOLDOWN_PATH = 'server/chat/messages/cooldownMs';
    static COOLDOWN_MS = 1000;
    static SETTLE_MS = 1500;
    static HTML_ELEMENT_ID = 'e2e-chat-html';

    static async enter(context, withThird = false)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 3, context.longRun));
        return await ChatSteps.enterPlayers(context, withThird);
    }

    static async expectReceived(page, chatType, expectedTexts, message)
    {
        await expect.poll(async () => await ChatSteps.fetchTexts(page, chatType), {message, timeout: TimeConstants.SERVER_RESPONSE})
            .toEqual(expectedTexts);
    }

    static async fetchStoredRows(gameConfig, playerName, text)
    {
        return await E2eSeedAndRestoreApi.loadRows(gameConfig, 'chat', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName}),
            message: text
        });
    }

    static async runThreeClientsTest(context)
    {
        let pages = await TestChatMessages.enter(context, true);
        let text = 'e2e-three-clients-'+Date.now();
        await ChatSteps.sendText(context.page, text);
        for(let page of pages){
            await TestChatMessages.expectReceived(page, ChatConst.TYPES.MESSAGE, [text], 'Every client sees the message once');
        }
    }

    static async runLiteralTextsTest(context)
    {
        await TestChatMessages.enter(context);
        let htmlText = '<b id="'+TestChatMessages.HTML_ELEMENT_ID+'">e2e</b>';
        await ChatSteps.sendText(context.page, htmlText);
        await TestChatMessages.expectReceived(context.secondPage, ChatConst.TYPES.MESSAGE, [htmlText], 'The HTML text arrives');
        await ChatSteps.openChat(context.secondPage);
        for(let page of [context.page, context.secondPage]){
            await expect(page.locator(Selectors.chat.tabContentGeneral), 'The HTML is shown as text').toContainText(htmlText);
            await expect(page.locator('#'+TestChatMessages.HTML_ELEMENT_ID), 'No element is created').toHaveCount(0);
        }
        await context.page.waitForTimeout(TestChatMessages.COOLDOWN_MS);
        let snippetText = ChatConst.SNIPPETS.JOINED_ROOM;
        await ChatSteps.sendText(context.page, snippetText);
        await TestChatMessages.expectReceived(
            context.secondPage,
            ChatConst.TYPES.MESSAGE,
            [htmlText, snippetText],
            'The snippet key text arrives as it was sent'
        );
    }

    static async runDeadPlayerTest(context)
    {
        await TestChatMessages.enter(context);
        let dead = await GameplayE2eStateApi.setPlayerState(
            context.gameConfig,
            await Navigation.getCurrentRoomName(context.page),
            context.gameConfig.e2ePlayerName,
            GameConst.STATUS.DEATH
        );
        expect(dead.inState, 'The player is dead: '+dead.error).toBe(GameConst.STATUS.DEATH);
        let text = 'e2e-dead-player-'+Date.now();
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: text});
        await TestChatMessages.expectReceived(context.secondPage, ChatConst.TYPES.MESSAGE, [text], 'The dead player message is broadcast');
    }

    static async runBlankMessagesTest(context)
    {
        await TestChatMessages.enter(context);
        for(let inputText of ['#', '@', '   ']){
            await ChatSteps.sendText(context.page, inputText);
            await expect(context.page.locator(Selectors.chat.input), 'The input is kept: '+inputText).toHaveValue(inputText);
            await context.page.locator(Selectors.chat.input).fill('');
        }
        for(let rawText of ['#', '@', '  ', 7]){
            await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: rawText});
            await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: rawText}, true);
            await context.page.waitForTimeout(TestChatMessages.COOLDOWN_MS);
        }
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: '# '}, true);
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: '@'+context.gameConfig.e2ePlayerName2+' ', t: context.gameConfig.e2ePlayerName2}, true);
        await context.page.waitForTimeout(TestChatMessages.SETTLE_MS);
        for(let page of [context.page, context.secondPage]){
            expect(await ChatSteps.fetchChat(page), 'No blank message is delivered').toEqual([]);
        }
    }

    static async runCharacterLimitTest(context)
    {
        await TestChatMessages.enter(context);
        let limit = Number(await E2eSeedAndRestoreApi.fetchConfigValue(context.gameConfig, TestChatMessages.LIMIT_PATH));
        expect(limit, 'The character limit is set').toBeGreaterThan(0);
        let longText = 'a'.repeat(limit + 20);
        await ChatSteps.sendText(context.page, longText);
        await context.page.waitForTimeout(TestChatMessages.COOLDOWN_MS);
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: 'b'.repeat(limit + 20)});
        await context.page.waitForTimeout(TestChatMessages.COOLDOWN_MS);
        await ChatSteps.sendText(context.page, 'c'.repeat(limit));
        await TestChatMessages.expectReceived(context.secondPage, ChatConst.TYPES.MESSAGE, [
            'a'.repeat(limit),
            'b'.repeat(limit),
            'c'.repeat(limit)
        ], 'The client and the server cut at the limit and the exact limit arrives whole');
    }

    static async runNoLimitTest(context)
    {
        await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, TestChatMessages.LIMIT_PATH, 0);
        await TestChatMessages.enter(context);
        let longText = 'd'.repeat(200);
        await ChatSteps.sendText(context.page, longText);
        await TestChatMessages.expectReceived(context.secondPage, ChatConst.TYPES.MESSAGE, [longText], 'A limit of 0 cuts nothing');
    }

    static async runCleaningTest(context)
    {
        await TestChatMessages.enter(context);
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: 'e2e\\clean\nline\tend'});
        await TestChatMessages.expectReceived(context.secondPage, ChatConst.TYPES.MESSAGE, ['e2eclean line end'], 'The text is cleaned');
    }

    static async runTamperedSceneTest(context)
    {
        await TestChatMessages.enter(context);
        for(let rawText of [12, '', '   ', null]){
            await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: rawText});
            await context.page.waitForTimeout(TestChatMessages.COOLDOWN_MS);
        }
        await context.secondPage.waitForTimeout(TestChatMessages.SETTLE_MS);
        expect(await ChatSteps.fetchChat(context.secondPage), 'No tampered message is broadcast').toEqual([]);
        expect(await TestChatMessages.fetchStoredRows(context.gameConfig, context.gameConfig.e2ePlayerName, ''), 'No row').toEqual([]);
    }

    static async runCooldownTest(context)
    {
        await TestChatMessages.enter(context);
        let firstText = 'e2e-cooldown-first-'+Date.now();
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: firstText});
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: firstText+'-dropped'});
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: '#'+firstText+'-global'}, true);
        await context.page.waitForTimeout(TestChatMessages.COOLDOWN_MS + 100);
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: firstText+'-after'});
        await TestChatMessages.expectReceived(
            context.secondPage,
            ChatConst.TYPES.MESSAGE,
            [firstText, firstText+'-after'],
            'The second room message inside the cooldown is dropped and the one after it passes'
        );
        await TestChatMessages.expectReceived(
            context.secondPage,
            ChatConst.TYPES.GLOBAL,
            [firstText+'-global'],
            'The global message has its own cooldown'
        );
    }

    static async runNoCooldownTest(context)
    {
        await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, TestChatMessages.COOLDOWN_PATH, 0);
        await TestChatMessages.enter(context);
        let texts = ['e2e-no-cooldown-1', 'e2e-no-cooldown-2', 'e2e-no-cooldown-3'];
        for(let text of texts){
            await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: text});
        }
        await TestChatMessages.expectReceived(context.secondPage, ChatConst.TYPES.MESSAGE, texts, 'Every message passes');
    }

    static run()
    {
        test.describe('Chat Messages', () => {
            test('three clients see a room message once each', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatMessages.runThreeClientsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('HTML and snippet key texts are shown literally', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatMessages.runLiteralTextsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player message is broadcast', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatMessages.runDeadPlayerTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('blank and prefix only messages are not delivered', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatMessages.runBlankMessagesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('messages are cut at the character limit by the client and the server', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatMessages.runCharacterLimitTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('character limit 0 cuts nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatMessages.runNoLimitTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('backslashes are removed and line breaks replaced', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatMessages.runCleaningTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('tampered room messages are not broadcast', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatMessages.runTamperedSceneTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cooldown drops the second room message with separate global counters', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatMessages.runCooldownTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cooldown 0 lets every message pass', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatMessages.runNoCooldownTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestChatMessages.run();
