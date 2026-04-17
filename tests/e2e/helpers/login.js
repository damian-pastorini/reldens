/**
 *
 * Reldens - Login Helper
 *
 * Provides page actions for logging in, selecting a character, and waiting for the game to start.
 *
 */

const { expect } = require('@playwright/test');
const { Selectors } = require('../selectors');

class Login
{
    static async selectPlayer(page, playerName)
    {
        let select = page.locator(Selectors.characterSelect.select);
        await expect(select).toBeVisible();
        let options = await select.locator('option').all();
        for(let option of options) {
            let text = await option.textContent();
            let trimmed = text ? text.trim() : '';
            if(trimmed === playerName || trimmed.startsWith(playerName+' ') || trimmed.startsWith(playerName+'-')) {
                let value = await option.getAttribute('value');
                await select.selectOption(value);
                return true;
            }
        }
        return false;
    }

    static async loginToSelection(page, username, password, longRun)
    {
        let typeDelay = longRun ? 150 : 0;
        let pauseMs = longRun ? 800 : 0;
        await page.goto('/');
        await page.waitForSelector(Selectors.login.form, { state: 'visible' });
        await page.locator(Selectors.login.username).click();
        await page.locator(Selectors.login.username).pressSequentially(username, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await page.locator(Selectors.login.password).click();
        await page.locator(Selectors.login.password).pressSequentially(password, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await page.hover(Selectors.login.submit);
        await page.waitForTimeout(pauseMs);
        await page.click(Selectors.login.submit);
        await page.waitForSelector(Selectors.characterSelect.container+':not(.hidden)', { timeout: longRun ? 120000 : 20000 });
        await page.waitForTimeout(pauseMs);
    }

    static async selectScene(page, sceneName)
    {
        let sceneSelect = page.locator(Selectors.characterSelect.sceneSelect);
        let count = await sceneSelect.count();
        if(0 === count) {
            return false;
        }
        await sceneSelect.selectOption(sceneName);
        return true;
    }

    static async loginAndStartGame(page, username, password, playerName, longRun, skipUiSelectors = false, scene = null)
    {
        let pauseMs = longRun ? 800 : 0;
        await Login.loginToSelection(page, username, password, longRun);
        if(playerName) {
            let selected = await Login.selectPlayer(page, playerName);
            if(!selected) {
                let available = await page.locator(Selectors.characterSelect.option).allTextContents();
                expect(selected, 'Player "'+playerName+'" not found. Available: '+available.join(', ')).toBeTruthy();
            }
        }
        if(scene) {
            await Login.selectScene(page, scene);
        }
        await page.waitForTimeout(pauseMs);
        await page.hover(Selectors.characterSelect.selectorSubmit);
        await page.waitForTimeout(pauseMs);
        let gameTimeout = longRun ? 120000 : 60000;
        let uiTimeout = longRun ? 10000 : 5000;
        let gameStartedPromise = page.waitForSelector(Selectors.body.gameEngineStarted, { timeout: gameTimeout });
        let dialogHandler = async (dialog) => { await dialog.dismiss(); };
        page.on('dialog', dialogHandler);
        await page.click(Selectors.characterSelect.selectorSubmit);
        await gameStartedPromise;
        page.off('dialog', dialogHandler);
        if(skipUiSelectors){
            return;
        }
        let uiSelectors = [
            Selectors.hud.chatOpen,
            Selectors.hud.logout,
            Selectors.hud.up,
            Selectors.hud.settingsOpen,
            Selectors.hud.playerStatsOpen,
            Selectors.hud.fullScreen,
            Selectors.hud.inventoryOpen,
            Selectors.hud.equipmentOpen,
            Selectors.hud.minimapOpen
        ];
        for(let selector of uiSelectors) {
            await page.waitForSelector(selector, { state: 'visible', timeout: uiTimeout })
                .catch((e) => { expect(false, 'UI selector failed ['+selector+']: '+e.message).toBeTruthy(); });
        }
    }
}

module.exports.Login = Login;
