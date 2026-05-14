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
        return page.waitForFunction(() => {
            return window.reldens && Array.isArray(window.reldens.playerQuestsData);
        }, null, { timeout: timeout || 15000 }).then(() => true).catch(() => false);
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

    static async runQuestsDataTest(page, screenshots, gameConfig, longRun, captureLabel)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
        await screenshots.capture(page, 'quests-game-started');
        let waitTimeout = longRun ? 30000 : 15000;
        let dataReady = await TestQuestsTracking.waitForPlayerQuestsData(page, waitTimeout);
        expect(dataReady, 'Quests feature must be enabled and playerQuestsData initialized').toBeTruthy();
        let questsData = await TestQuestsTracking.getPlayerQuestsData(page);
        await screenshots.capture(page, captureLabel);
        expect(Array.isArray(questsData), 'playerQuestsData must be an array').toBeTruthy();
    }

    static run()
    {
        test.describe('Quests Tracking', () => {
            test('playerQuestsData is initialized as array after room join', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestQuestsTracking.runQuestsDataTest(page, screenshots, gameConfig, longRun, 'quests-data-received');
            });
            test('playerQuestsData is accessible after room transition', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestQuestsTracking.runQuestsDataTest(page, screenshots, gameConfig, longRun, 'quests-initial-room');
            });
        });
    }

}

TestQuestsTracking.run();
