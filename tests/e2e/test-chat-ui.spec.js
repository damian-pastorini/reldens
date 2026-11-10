/**
 *
 * Reldens - Test Chat UI
 *
 * Tests the chat box of the group players (ChatSteps, the chat client config changed for the group before the login,
 * so the start game config carries it): the close button hides the box and shows the open button; ENTER opens and
 * focuses the chat from the game and ESC closes it from the input; the box opens after the login with defaultOpen on;
 * with the tabs off the messages still reach the client; a tab label click switches the active tab content; an error
 * goes to the active tab when it is not the general one and stays out of it with appendErrorTypeOnActiveTab off; with
 * the chat closed an incoming message shows the notification balloon, an error adds the critical class and opening the
 * chat hides it, and with the balloon off none is shown; the overhead text over the sender is seen by both clients, cut
 * at characterLimitOverhead and removed after its time out, is not shown for a sender alone in the room or with the
 * overhead chat off; the typing indicator shows while typing and not with isTyping off; and the own joined line
 * received before the chat box exists is shown once it is created.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ChatSteps } = require('./helpers/chat-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ChatConst } = require('../../lib/chat/constants');
const ChatTranslations = require('../../lib/chat/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestChatUi
{

    static CHAT_BOX = '#chat-ui';
    static CHAT_CLOSE = '#chat-close';
    static BALLOON = '#notification-balloon';
    static UI_PATH = 'client/ui/chat/';
    static MESSAGES_PATH = 'client/chat/messages/';
    static SETTLE_MS = 1500;
    static OVERHEAD_LIMIT_PATH = 'client/chat/messages/characterLimitOverhead';
    static OVERHEAD_TIME_OUT_PATH = 'client/ui/chat/overheadText/timeOut';

    static async overrideChatConfig(context, configValues)
    {
        for(let configPath of Object.keys(configValues)){
            await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, configPath, configValues[configPath]);
        }
    }

    static async enter(context, configValues = {}, withSecond = true)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 3, context.longRun));
        await TestChatUi.overrideChatConfig(context, configValues);
        if(!withSecond){
            await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
            await ChatSteps.recordChat(context.page);
            return [context.page];
        }
        return await ChatSteps.enterPlayers(context);
    }

    static async fetchOverheadText(page, playerName)
    {
        return await page.evaluate((name) => {
            let players = window.reldens.getCurrentPlayer().players;
            return players[Object.keys(players).find(key => name === players[key].playerName)]?.overheadTextSprite?.text || '';
        }, playerName);
    }

    static async runCloseButtonTest(context)
    {
        await TestChatUi.enter(context, {}, false);
        await ChatSteps.openChat(context.page);
        await context.page.click(TestChatUi.CHAT_CLOSE);
        await expect(context.page.locator(TestChatUi.CHAT_BOX), 'The box is hidden').toBeHidden();
        await expect(context.page.locator(Selectors.hud.chatOpen), 'The open button shows again').toBeVisible();
    }

    static async runKeysTest(context)
    {
        await TestChatUi.enter(context, {}, false);
        await Navigation.focusGame(context.page);
        await context.page.keyboard.press('Enter');
        await expect(context.page.locator(TestChatUi.CHAT_BOX), 'ENTER opens the chat').toBeVisible();
        await expect(context.page.locator(Selectors.chat.input), 'ENTER focuses the input').toBeFocused();
        await context.page.keyboard.press('Escape');
        await expect(context.page.locator(TestChatUi.CHAT_BOX), 'ESC closes the chat').toBeHidden();
    }

    static async runDefaultOpenTest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 2, context.longRun));
        await TestChatUi.overrideChatConfig(context, {[TestChatUi.UI_PATH+'defaultOpen']: true});
        await Login.startConfigPlayer(context.page, context.gameConfig, context.longRun, null, true);
        await expect(context.page.locator(TestChatUi.CHAT_BOX), 'The chat is open after the login').toBeVisible();
    }

    static async runNoTabsTest(context)
    {
        await TestChatUi.enter(context, {[TestChatUi.UI_PATH+'showTabs']: false});
        let text = 'e2e-no-tabs-'+Date.now();
        await ChatSteps.sendText(context.secondPage, text);
        await expect.poll(
            async () => await ChatSteps.fetchTexts(context.page, ChatConst.TYPES.MESSAGE),
            {message: 'The message reaches the client with the tabs off', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([text]);
    }

    static async runTabSwitchTest(context)
    {
        await TestChatUi.enter(context, {}, false);
        await ChatSteps.openChat(context.page);
        await context.page.locator(Selectors.chat.tabLabelById(ChatConst.TYPES.PRIVATE)).dispatchEvent('click');
        await expect(context.page.locator(Selectors.chat.tabContent(ChatConst.TYPES.PRIVATE)), 'The private content is active')
            .toHaveClass(/active/);
        await expect(context.page.locator(Selectors.chat.tabContentGeneral), 'The general content is not active')
            .not.toHaveClass(/active/);
    }

    static async runErrorOnActiveTabTest(context, appendErrorTypeOnActiveTab)
    {
        await TestChatUi.enter(context, {[TestChatUi.MESSAGES_PATH+'appendErrorTypeOnActiveTab']: appendErrorTypeOnActiveTab}, false);
        await ChatSteps.openChat(context.page);
        await context.page.locator(Selectors.chat.tabLabelById(ChatConst.TYPES.PRIVATE)).dispatchEvent('click');
        let missingName = 'e2eMissingPlayer';
        await ChatSteps.sendText(context.page, '@'+missingName+' e2e');
        let notFound = ChatTranslations.chat.playerNotFound.replace('%playerName', missingName);
        await expect(context.page.locator(Selectors.chat.tabContentGeneral), 'The error is in the general tab').toContainText(notFound);
        let privateTab = context.page.locator(Selectors.chat.tabContent(ChatConst.TYPES.PRIVATE));
        await expect.poll(
            async () => (await privateTab.innerText()).includes(notFound),
            {message: 'The error in the active tab follows the option', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(appendErrorTypeOnActiveTab);
    }

    static async runBalloonTest(context)
    {
        await TestChatUi.enter(context);
        await ChatSteps.sendText(context.secondPage, 'e2e-balloon-'+Date.now());
        await expect(context.page.locator(TestChatUi.BALLOON), 'The balloon is shown').not.toHaveClass(/hidden/);
        await ChatSteps.sendRaw(context.page, {[ChatConst.MESSAGE.KEY]: '@e2eMissingPlayer e2e', t: 'e2eMissingPlayer'}, true);
        await expect(context.page.locator(TestChatUi.BALLOON), 'The error adds the critical class').toHaveClass(/critical/);
        await ChatSteps.openChat(context.page);
        await expect(context.page.locator(TestChatUi.BALLOON), 'Opening the chat hides it').toHaveClass(/hidden/);
    }

    static async runNoBalloonTest(context)
    {
        await TestChatUi.enter(context, {[TestChatUi.UI_PATH+'notificationBalloon']: false});
        await ChatSteps.sendText(context.secondPage, 'e2e-no-balloon-'+Date.now());
        await expect.poll(async () => await ChatSteps.fetchTexts(context.page, ChatConst.TYPES.MESSAGE), {timeout: TimeConstants.SERVER_RESPONSE})
            .toHaveLength(1);
        await expect(context.page.locator(TestChatUi.BALLOON), 'No balloon is shown').toHaveClass(/hidden/);
    }

    static async runOverheadTest(context)
    {
        await TestChatUi.enter(context);
        let limit = Number(await E2eSeedAndRestoreApi.fetchConfigValue(context.gameConfig, TestChatUi.OVERHEAD_LIMIT_PATH));
        let timeOut = Number(await E2eSeedAndRestoreApi.fetchConfigValue(context.gameConfig, TestChatUi.OVERHEAD_TIME_OUT_PATH));
        let text = 'e2e-overhead-'+'o'.repeat(limit);
        await ChatSteps.sendText(context.page, text);
        for(let page of [context.page, context.secondPage]){
            await expect.poll(
                async () => await TestChatUi.fetchOverheadText(page, context.gameConfig.e2ePlayerName),
                {message: 'The overhead text is cut at the limit', timeout: TimeConstants.SERVER_RESPONSE}
            ).toBe(text.substring(0, limit));
        }
        await context.secondPage.waitForTimeout(timeOut + TimeConstants.ACTION);
        expect(await TestChatUi.fetchOverheadText(context.secondPage, context.gameConfig.e2ePlayerName), 'Removed after the time out')
            .toBe('');
    }

    static async runNoOverheadTest(context, configValues, withSecond, message)
    {
        await TestChatUi.enter(context, configValues, withSecond);
        let text = 'e2e-no-overhead-'+Date.now();
        await ChatSteps.sendText(context.page, text);
        await expect.poll(async () => await ChatSteps.fetchTexts(context.page, ChatConst.TYPES.MESSAGE), {timeout: TimeConstants.SERVER_RESPONSE})
            .toEqual([text]);
        expect(await TestChatUi.fetchOverheadText(context.page, context.gameConfig.e2ePlayerName), message).toBe('');
    }

    static async runTypingTest(context, isTyping, expectedText)
    {
        await TestChatUi.enter(context, {[TestChatUi.UI_PATH+'overheadChat/isTyping']: isTyping}, false);
        await ChatSteps.openChat(context.page);
        await context.page.locator(Selectors.chat.input).pressSequentially('e2e');
        expect(await TestChatUi.fetchOverheadText(context.page, context.gameConfig.e2ePlayerName), 'The typing indicator')
            .toBe(expectedText);
    }

    static async runQueuedJoinLineTest(context)
    {
        await TestChatUi.enter(context, {}, false);
        await ChatSteps.openChat(context.page);
        await expect(context.page.locator(Selectors.chat.tabContentGeneral), 'The own joined line is shown')
            .toContainText(context.gameConfig.e2ePlayerName);
    }

    static run()
    {
        test.describe('Chat UI', () => {
            test('close button hides the box and shows the open button', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runCloseButtonTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('ENTER opens and focuses the chat and ESC closes it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runKeysTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('default open shows the chat after the login', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runDefaultOpenTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('tabs off still receive the messages', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runNoTabsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('tab label click switches the active tab content', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runTabSwitchTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('error goes to the active tab', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runErrorOnActiveTabTest({page, screenshots, gameConfig, e2eGroup, longRun}, true);
            });
            test('error stays out of the active tab with the option off', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runErrorOnActiveTabTest({page, screenshots, gameConfig, e2eGroup, longRun}, false);
            });
            test('closed chat shows the balloon, critical for errors, hidden on open', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runBalloonTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('balloon off shows no balloon', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runNoBalloonTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('overhead text is seen by both clients, cut and removed after the time out', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runOverheadTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('sender alone in the room gets no overhead text', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runNoOverheadTest({page, screenshots, gameConfig, e2eGroup, longRun}, {}, false, 'No overhead alone');
            });
            test('overhead chat off shows no overhead text', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runNoOverheadTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    {[TestChatUi.UI_PATH+'overheadChat/enabled']: false},
                    true,
                    'No overhead with the option off'
                );
            });
            test('typing indicator shows while typing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runTypingTest({page, screenshots, gameConfig, e2eGroup, longRun}, true, ChatConst.SNIPPETS.WAITING);
            });
            test('typing indicator off shows nothing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runTypingTest({page, screenshots, gameConfig, e2eGroup, longRun}, false, '');
            });
            test('own joined line received before the chat box is shown', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatUi.runQueuedJoinLineTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestChatUi.run();
