/**
 *
 * Reldens - Test Trading
 *
 * Tests simultaneous player login, trade initiation, cancellation, and item transfer.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTrading
{
    static async loginBothPlayers(page, secondPage, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername2 || 'root2';
        let password = gameConfig.e2ePassword2 || 'root';
        let playerName = gameConfig.e2ePlayerName2 || 'ImRoot2';
        let username2 = gameConfig.e2eUsername3 || 'root3';
        let password2 = gameConfig.e2ePassword3 || 'root';
        let playerName2 = gameConfig.e2ePlayerName3 || 'ImRoot3';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
        await Login.loginAndStartGame(secondPage, username2, password2, playerName2, longRun);
    }

    static async loginAndOpenTradeContainer(page, secondPage, gameConfig, longRun)
    {
        await TestTrading.loginBothPlayers(page, secondPage, gameConfig, longRun);
        let pauseMs = TimeConstants.pauseMs(longRun);
        let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
        await secondPage.waitForFunction(() => {
            let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            return !!(room && room.sessionId);
        }, { timeout: sceneTimeout });
        let playerBSessionId = await secondPage.evaluate(() => {
            let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            return room ? room.sessionId : null;
        });
        expect(playerBSessionId, 'Player B session ID must be available').not.toBeNull();
        await Phaser.waitForPlayerBySessionId(page, playerBSessionId, sceneTimeout);
        let playerBCoords = await Phaser.getOtherPlayerScreenCoords(page, playerBSessionId);
        expect(playerBCoords, 'Player B must be visible in player A scene').not.toBeNull();
        await Phaser.clickPlayerBySessionId(page, playerBSessionId);
        await page.waitForTimeout(pauseMs);
        let startTradeButton = page.locator(Selectors.playerTrade.startTrade(playerBSessionId));
        await expect(startTradeButton).toBeVisible({ timeout: uiTimeout });
        await startTradeButton.click();
        await page.waitForTimeout(1000 + pauseMs);
        await expect(secondPage.locator(Selectors.playerTrade.acceptYes)).toBeVisible({ timeout: uiTimeout });
        await secondPage.locator(Selectors.playerTrade.acceptYes).click();
        await page.waitForTimeout(pauseMs);
        await expect(page.locator(Selectors.playerTrade.container)).toBeVisible({ timeout: uiTimeout });
        return { pauseMs };
    }

    static async resolveTradeConfirmClass(page)
    {
        return page.evaluate(() => {
            let buttons = document.querySelectorAll('[class*="confirm-"]');
            for(let btn of buttons) {
                let cls = [...btn.classList].find(c => c.startsWith('confirm-') && c !== 'confirm-buy' && c !== 'confirm-sell');
                if(cls) {
                    return cls;
                }
            }
            return null;
        });
    }

    static run()
    {
        test.describe('Player Trading', () => {
            test('both players can be in game simultaneously', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestTrading.loginBothPlayers(page, secondPage, gameConfig, longRun);
                await expect(page.locator(Selectors.canvas)).toBeVisible();
                await expect(secondPage.locator(Selectors.canvas)).toBeVisible();
                await screenshots.capture(page, 'p1-in-game');
                await screenshots.capture(secondPage, 'p2-in-game');
            });
            test('player can initiate trade with another player', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestTrading.loginAndOpenTradeContainer(page, secondPage, gameConfig, longRun);
                await screenshots.capture(page, 'p1-trade-container-visible');
                await screenshots.capture(secondPage, 'p2-trade-container-visible');
            });
            test('player can cancel an open trade', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                let setup = await TestTrading.loginAndOpenTradeContainer(page, secondPage, gameConfig, longRun);
                let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
                await expect(secondPage.locator(Selectors.playerTrade.container)).toBeVisible({ timeout: uiTimeout });
                await screenshots.capture(page, 'p1-trade-container-before-cancel');
                let cancelButton = page.locator(Selectors.playerTrade.cancelButton).first();
                await expect(cancelButton).toBeVisible({ timeout: uiTimeout });
                await cancelButton.click();
                await page.waitForTimeout(2000 + setup.pauseMs);
                await expect(page.locator(Selectors.playerTrade.container)).toBeHidden({ timeout: uiTimeout });
                await expect(secondPage.locator(Selectors.playerTrade.container)).toBeHidden({ timeout: uiTimeout });
                await screenshots.capture(page, 'p1-trade-container-cancelled');
                await screenshots.capture(secondPage, 'p2-trade-container-cancelled');
            });
            test('player trade completes and items transfer between players', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                let setup = await TestTrading.loginAndOpenTradeContainer(page, secondPage, gameConfig, longRun);
                let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
                await expect(secondPage.locator(Selectors.playerTrade.container)).toBeVisible({ timeout: uiTimeout });
                let offerButton = page.locator(Selectors.playerTrade.offerButton).first();
                await expect(offerButton).toBeVisible({ timeout: uiTimeout });
                await screenshots.capture(page, 'p1-trade-offer-button-visible');
                await offerButton.click();
                await page.waitForTimeout(setup.pauseMs);
                let tradeConfirmClass = await TestTrading.resolveTradeConfirmClass(page);
                expect(tradeConfirmClass, 'Trade confirm button class must be available').not.toBeNull();
                await page.click('.'+tradeConfirmClass);
                await secondPage.click('.'+tradeConfirmClass);
                await page.waitForTimeout(2000 + setup.pauseMs);
                await secondPage.click(Selectors.hud.inventoryOpen);
                await expect(secondPage.locator(Selectors.inventory.items)).not.toBeEmpty({ timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) });
                await screenshots.capture(secondPage, 'p2-inventory-after-trade');
            });
        });
    }
}

TestTrading.run();
