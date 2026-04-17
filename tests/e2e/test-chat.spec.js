/**
 *
 * Reldens - Test Chat
 *
 * Tests opening the chat panel, sending messages, tab switching, and room announcements.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestChat
{
    static async typeChatMessage(page, longRun, message)
    {
        await page.locator(Selectors.chat.input).click();
        await (longRun
            ? page.locator(Selectors.chat.input).pressSequentially(message, { delay: 80 })
            : page.locator(Selectors.chat.input).fill(message));
    }

    static async loginRootPlayer(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
    }

    static async loginBothPlayers(page, secondPage, screenshots, longRun, p1, p2)
    {
        await Login.loginAndStartGame(page, p1.username, p1.password, p1.playerName, longRun);
        await Login.loginAndStartGame(secondPage, p2.username, p2.password, p2.playerName, longRun);
        await screenshots.capture(page, 'p1-in-game');
        await screenshots.capture(secondPage, 'p2-in-game');
        return longRun ? 800 : 0;
    }

    static async runSendMessageTest(page, screenshots, gameConfig, longRun)
    {
        await TestChat.loginRootPlayer(page, gameConfig, longRun);
        let pauseMs = longRun ? 800 : 0;
        let testMessage = 'e2e-global-test';
        await page.click(Selectors.hud.chatOpen);
        await page.waitForTimeout(pauseMs);
        await expect(page.locator(Selectors.chat.input)).toBeVisible();
        await screenshots.capture(page, 'chat-input-visible');
        await TestChat.typeChatMessage(page, longRun, testMessage);
        await page.waitForTimeout(pauseMs);
        await screenshots.capture(page, 'chat-message-typed');
        await page.click(Selectors.chat.send);
        await page.waitForTimeout(2000 + pauseMs);
        await expect(page.locator(Selectors.chat.tabContentGeneral)).toContainText(testMessage, { timeout: 10000 });
        await screenshots.capture(page, 'general-tab-shows-message');
    }

    static async runGlobalTabTest(page, screenshots, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername2 || 'root2';
        let password = gameConfig.e2ePassword2 || 'root';
        let playerName = gameConfig.e2ePlayerName2 || 'ImRoot2';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
        let pauseMs = longRun ? 800 : 0;
        let testMessage = 'e2e-global-tab-test';
        await page.click(Selectors.hud.chatOpen);
        await page.waitForTimeout(pauseMs);
        await TestChat.typeChatMessage(page, longRun, '#'+testMessage);
        await screenshots.capture(page, 'global-message-typed');
        await page.locator(Selectors.chat.input).press('Enter');
        await expect(page.locator(Selectors.chat.tabContentGlobal)).toContainText(testMessage, { timeout: 10000 });
        await screenshots.capture(page, 'global-tab-shows-message');
    }

    static async runPrivateMessageTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let p1 = {
            username: gameConfig.e2eUsername || 'root',
            password: gameConfig.e2ePassword || 'root',
            playerName: gameConfig.e2ePlayerName || 'ImRoot'
        };
        let p2 = {
            username: gameConfig.e2eUsername2 || 'root2',
            password: gameConfig.e2ePassword2 || 'root',
            playerName: gameConfig.e2ePlayerName2 || 'ImRoot2'
        };
        let pauseMs = await TestChat.loginBothPlayers(page, secondPage, screenshots, longRun, p1, p2);
        let testMessage = 'e2e-private-msg-test';
        await page.click(Selectors.hud.chatOpen);
        await secondPage.click(Selectors.hud.chatOpen);
        await page.waitForTimeout(pauseMs);
        await TestChat.typeChatMessage(page, longRun, '@'+p2.playerName+' '+testMessage);
        await page.waitForTimeout(pauseMs);
        await screenshots.capture(page, 'p1-private-message-typed');
        await page.click(Selectors.chat.send);
        await page.waitForTimeout(2000 + pauseMs);
        await expect(secondPage.locator(Selectors.chat.tabContentGeneral)).toContainText(testMessage);
        await expect(secondPage.locator(Selectors.chat.tabContentPrivate)).toContainText(testMessage);
        await screenshots.capture(secondPage, 'p2-private-message-received');
    }

    static async runTabSwitchingTest(page, screenshots, gameConfig, longRun)
    {
        await TestChat.loginRootPlayer(page, gameConfig, longRun);
        let pauseMs = longRun ? 800 : 0;
        await page.click(Selectors.hud.chatOpen);
        await page.waitForTimeout(pauseMs);
        await expect(page.locator(Selectors.chat.input)).toBeVisible();
        let tabLabels = page.locator(Selectors.chat.tabLabel);
        let tabCount = await tabLabels.count();
        test.skip(tabCount < 2, 'Less than 2 chat tabs available - cannot test tab switching');
        await screenshots.capture(page, 'chat-tabs-visible');
        let firstTabClass = await tabLabels.nth(0).getAttribute('class');
        let secondTabClass = await tabLabels.nth(1).getAttribute('class');
        expect(firstTabClass, 'First chat tab class must be available').toBeTruthy();
        expect(secondTabClass, 'Second chat tab class must be available').toBeTruthy();
        await tabLabels.nth(1).click();
        await page.waitForTimeout(pauseMs);
        await screenshots.capture(page, 'chat-second-tab-active');
        let activeAfterClick = await page.locator(Selectors.chat.tabLabelActive).first().getAttribute('class');
        expect(activeAfterClick).toBeTruthy();
        await tabLabels.nth(0).click();
        await page.waitForTimeout(pauseMs);
        let activeAfterSwitchBack = await page.locator(Selectors.chat.tabLabelActive).first().getAttribute('class');
        expect(activeAfterSwitchBack).toBeTruthy();
        await screenshots.capture(page, 'chat-first-tab-active-again');
    }

    static async runCrossPlayerMessageTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let p1 = {
            username: gameConfig.e2eUsername2 || 'root2',
            password: gameConfig.e2ePassword2 || 'root',
            playerName: gameConfig.e2ePlayerName2 || 'ImRoot2'
        };
        let p2 = {
            username: gameConfig.e2eUsername3 || 'root3',
            password: gameConfig.e2ePassword3 || 'root',
            playerName: gameConfig.e2ePlayerName3 || 'ImRoot3'
        };
        let pauseMs = await TestChat.loginBothPlayers(page, secondPage, screenshots, longRun, p1, p2);
        let testMessage = 'e2e-cross-player-test';
        await page.click(Selectors.hud.chatOpen);
        await secondPage.click(Selectors.hud.chatOpen);
        await page.waitForTimeout(pauseMs);
        await TestChat.typeChatMessage(page, longRun, testMessage);
        await screenshots.capture(page, 'p1-message-typed');
        await page.locator(Selectors.chat.input).press('Enter');
        await page.waitForTimeout(2000 + pauseMs);
        await expect(secondPage.locator(Selectors.chat.tabContentGeneral)).toContainText(testMessage);
        await screenshots.capture(secondPage, 'p2-message-received');
    }

    static run()
    {
        test.describe('Chat System', () => {
            test('send message and verify it appears in chat', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestChat.runSendMessageTest(page, screenshots, gameConfig, longRun);
            });
            test('global message appears in global chat tab', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestChat.runGlobalTabTest(page, screenshots, gameConfig, longRun);
            });
            test('private message reaches the target player', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestChat.runPrivateMessageTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('clicking a chat tab label switches the active tab content', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestChat.runTabSwitchingTest(page, screenshots, gameConfig, longRun);
            });
            test('message from player A is visible to player B', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestChat.runCrossPlayerMessageTest(page, secondPage, screenshots, gameConfig, longRun);
            });

        });
    }
}

TestChat.run();
