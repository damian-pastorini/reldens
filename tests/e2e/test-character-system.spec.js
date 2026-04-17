/**
 *
 * Reldens - Test Character System
 *
 * Tests character selection, creation, and in-scene appearance.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCharacterSystem
{
    static async waitForPlayerNameInScene(page, playerName, timeout)
    {
        await page.waitForFunction((name) => {
            if(!window.reldens || !window.reldens.activeRoomEvents) {
                return false;
            }
            let scene = window.reldens.getActiveScene();
            if(!scene || !scene.player || !scene.player.players) {
                return false;
            }
            return Object.values(scene.player.players).some(p => p.playerName && p.playerName.includes(name));
        }, playerName, { timeout });
    }

    static async runCreateCharacterTest(page, screenshots, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let newCharName = gameConfig.e2eNewCharacterName || '';
        expect(newCharName, 'e2eNewCharacterName must be configured').toBeTruthy();
        let typeDelay = longRun ? 150 : 0;
        let pauseMs = longRun ? 800 : 0;
        await Login.loginToSelection(page, username, password, longRun);
        await screenshots.capture(page, 'player-selection-before-create');
        let existingOptions = await page.locator(Selectors.characterSelect.option).allTextContents();
        let alreadyExists = existingOptions.some(opt => {
            let t = opt.trim();
            return t === newCharName || t.startsWith(newCharName+' ') || t.startsWith(newCharName+'-');
        });
        let charName = alreadyExists ? newCharName+'-'+Date.now() : newCharName;
        await page.locator(Selectors.characterSelect.newPlayerName).click();
        await page.locator(Selectors.characterSelect.newPlayerName).pressSequentially(charName, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await screenshots.capture(page, 'new-character-name-typed');
        await page.hover(Selectors.characterSelect.createSubmit);
        await page.waitForTimeout(pauseMs);
        await page.click(Selectors.characterSelect.createSubmit);
        await page.waitForSelector(Selectors.body.gameStarted, { timeout: longRun ? 120000 : 60000 });
        await expect(page.locator(Selectors.canvas)).toBeVisible();
        await screenshots.capture(page, 'game-started-with-new-character');
    }

    static run()
    {
        test.describe('Character System', () => {

            test('player selection shows characters', async ({ page, screenshots, gameConfig, longRun }) => {
                let username = gameConfig.e2eUsername || 'root';
                let password = gameConfig.e2ePassword || 'root';
                await Login.loginToSelection(page, username, password, longRun);
                let select = page.locator(Selectors.characterSelect.select);
                await expect(select).toBeVisible();
                await screenshots.capture(page, 'player-selection-visible');
                let optionCount = await select.locator('option').count();
                expect(optionCount).toBeGreaterThan(0);
            });

            test('create new character starts the game', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterSystem.runCreateCharacterTest(page, screenshots, gameConfig, longRun);
            });

            test('selected character loads with correct name in game', async ({ page, screenshots, gameConfig, longRun }) => {
                let username = gameConfig.e2eUsername || 'root';
                let password = gameConfig.e2ePassword || 'root';
                let playerName = gameConfig.e2ePlayerName || 'ImRoot';
                await Login.loginAndStartGame(page, username, password, playerName, longRun);
                await screenshots.capture(page, 'game-started');
                let waitNameTimeout = longRun ? 30000 : 15000;
                await TestCharacterSystem.waitForPlayerNameInScene(page, playerName, waitNameTimeout);
                await screenshots.capture(page, 'player-name-loaded-in-scene');
            });

        });
    }
}

TestCharacterSystem.run();
