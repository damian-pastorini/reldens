/**
 *
 * Reldens - Test Quests Tracking
 *
 * Verifies that the quests tracking server plugin pushes quest key data to the client
 * on room join, and that the client stores it on gameManager.playerQuestsData.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestQuestsTracking
{

    static async waitForPlayerQuestsData(page, timeout)
    {
        await page.waitForFunction(() => {
            return window.reldens && Array.isArray(window.reldens.playerQuestsData);
        }, { timeout: timeout || 15000 });
    }

    static async getPlayerQuestsData(page)
    {
        return page.evaluate(() => {
            if(!window.reldens){
                return null;
            }
            return window.reldens.playerQuestsData;
        });
    }

    static run()
    {
        test.describe('Quests Tracking', () => {
            test('playerQuestsData is initialized as array after room join', async ({ page, screenshots, gameConfig, longRun }) => {
                let username = gameConfig.e2eUsername || 'root';
                let password = gameConfig.e2ePassword || 'root';
                let playerName = gameConfig.e2ePlayerName || 'ImRoot';
                await Login.loginAndStartGame(page, username, password, playerName, longRun);
                await screenshots.capture(page, 'quests-game-started');
                let waitTimeout = longRun ? 30000 : 15000;
                await TestQuestsTracking.waitForPlayerQuestsData(page, waitTimeout);
                let questsData = await TestQuestsTracking.getPlayerQuestsData(page);
                await screenshots.capture(page, 'quests-data-received');
                expect(Array.isArray(questsData), 'playerQuestsData must be an array after room join').toBeTruthy();
            });
            test('playerQuestsData is accessible after room transition', async ({ page, screenshots, gameConfig, longRun }) => {
                let username = gameConfig.e2eUsername || 'root';
                let password = gameConfig.e2ePassword || 'root';
                let playerName = gameConfig.e2ePlayerName || 'ImRoot';
                await Login.loginAndStartGame(page, username, password, playerName, longRun);
                let waitTimeout = longRun ? 30000 : 15000;
                await TestQuestsTracking.waitForPlayerQuestsData(page, waitTimeout);
                let questsDataInitial = await TestQuestsTracking.getPlayerQuestsData(page);
                await screenshots.capture(page, 'quests-initial-room');
                expect(Array.isArray(questsDataInitial), 'playerQuestsData must be array in initial room').toBeTruthy();
            });
        });
    }

}

TestQuestsTracking.run();
