/**
 *
 * Reldens - Test Clans
 *
 * Tests the clans panel visibility, clan creation, and multi-player clan interactions.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClans
{
    static async loginRoot2Player(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername2 || 'root2';
        let password = gameConfig.e2ePassword2 || 'root';
        let playerName = gameConfig.e2ePlayerName2 || 'ImRoot2';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
    }

    static async loginAndOpenClanPanel(page, gameConfig, longRun)
    {
        await TestClans.loginRoot2Player(page, gameConfig, longRun);
        let pauseMs = TimeConstants.pauseMs(longRun);
        await page.click(Selectors.hud.clanOpen);
        await page.waitForTimeout(pauseMs);
        await expect(page.locator(Selectors.clans.dialog)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
        );
        return { pauseMs };
    }

    static run()
    {
        test.describe('Clans', () => {
            test('clan panel opens and shows content', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestClans.loginAndOpenClanPanel(page, gameConfig, longRun);
                await expect(page.locator(Selectors.clans.dialogContent)).toBeVisible();
                await screenshots.capture(page, 'clan-panel-open');
            });
            test('player can create a new clan', async ({ page, screenshots, gameConfig, longRun }) => {
                let setup = await TestClans.loginAndOpenClanPanel(page, gameConfig, longRun);
                let nameInput = page.locator(Selectors.clans.nameInput);
                let formVisible = await nameInput.isVisible().catch(() => false);
                test.skip(!formVisible, 'Player already belongs to a clan; create form not available');
                await screenshots.capture(page, 'clan-create-form-visible');
                let clanName = 'TestClan'+Date.now();
                await nameInput.fill(clanName);
                await page.waitForTimeout(setup.pauseMs);
                await screenshots.capture(page, 'clan-name-typed');
                await page.click(Selectors.clans.submitCreate);
                await expect(page.locator(Selectors.clans.disbandAction)).toBeVisible(
                    { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
                );
                await screenshots.capture(page, 'clan-container-visible');
            });
        });
    }
}

TestClans.run();
