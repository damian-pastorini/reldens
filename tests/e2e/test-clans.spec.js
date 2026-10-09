/**
 *
 * Reldens - Test Clans
 *
 * Tests the clans panel visibility, clan creation, and multi-player clan interactions. The clan level modifiers and the
 * owner disband cases use the third group player as the clan owner (the second one keeps the clan of the creation case):
 * the modifiers case preserves the owner clan rows, so the reset deletes the clan created by the test, and the disband
 * case seeds the clan and its memberships (the owner and the first group player, offline) before the owner logs in.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClans
{

    static INCREMENT_OPERATION = 1;
    static CLAN_MODIFIER_STAT_KEY = 'atk';
    static CLAN_MODIFIER_VALUE = 10;
    static CLAN_OWNER_USER_KEY_SUFFIX = '3';

    static async openClanPanel(page, longRun)
    {
        let pauseMs = TimeConstants.pauseMs(longRun);
        await page.click(Selectors.hud.clanOpen);
        await page.waitForTimeout(pauseMs);
        await expect(page.locator(Selectors.clans.dialog)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
        );
        return { pauseMs };
    }

    static async loginAndOpenClanPanel(page, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun, '2');
        return await TestClans.openClanPanel(page, longRun);
    }

    static async preserveClanRows(gameConfig, e2eGroup, ownerId)
    {
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'clanMembers', {player_id: ownerId});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'clan', {owner_id: ownerId});
    }

    static async fetchInitialLevel(gameConfig)
    {
        let clanLevels = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'clanLevels', {});
        return [...clanLevels].sort((levelA, levelB) => Number(levelA.key) - Number(levelB.key)).shift();
    }

    static async seedClanWithMembers(gameConfig, e2eGroup, ownerId, membersIds)
    {
        let clan = await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'clan', {
            name: 'E2eClan'+Date.now(),
            owner_id: ownerId,
            level: (await TestClans.fetchInitialLevel(gameConfig)).key
        });
        for(let playerId of membersIds){
            await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'clanMembers', {
                clan_id: clan.id,
                player_id: playerId
            });
        }
        return clan.id;
    }

    static async createClan(page, screenshots, longRun)
    {
        let nameInput = page.locator(Selectors.clans.nameInput);
        await expect(nameInput, 'The clan owner must start without a clan').toBeVisible();
        await nameInput.fill('E2eClan'+Date.now());
        await page.click(Selectors.clans.submitCreate);
        await expect(page.locator(Selectors.clans.disbandAction)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
        await screenshots.capture(page, 'clan-created');
    }

    static async expectStatValue(statValueLocator, longRun, expectedValue, message)
    {
        await expect.poll(
            async () => Number(await statValueLocator.textContent()),
            { message, timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        ).toBe(expectedValue);
    }

    static async runClanLevelModifiersTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let ownerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName3});
        await TestClans.preserveClanRows(gameConfig, e2eGroup, ownerId);
        await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'clanLevelsModifiers', {
            level_id: (await TestClans.fetchInitialLevel(gameConfig)).id,
            key: 'e2e_clan_'+TestClans.CLAN_MODIFIER_STAT_KEY,
            property_key: 'stats/'+TestClans.CLAN_MODIFIER_STAT_KEY,
            operation: TestClans.INCREMENT_OPERATION,
            value: String(TestClans.CLAN_MODIFIER_VALUE)
        });
        await Login.loginRootPlayer(page, gameConfig, longRun, TestClans.CLAN_OWNER_USER_KEY_SUFFIX);
        let statValueLocator = page.locator(Selectors.stats.valueByKey(TestClans.CLAN_MODIFIER_STAT_KEY));
        await statValueLocator.waitFor(
            { state: 'attached', timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
        let statBefore = Number(await statValueLocator.textContent());
        await TestClans.openClanPanel(page, longRun);
        await TestClans.createClan(page, screenshots, longRun);
        await TestClans.expectStatValue(
            statValueLocator,
            longRun,
            statBefore + TestClans.CLAN_MODIFIER_VALUE,
            'The clan level modifier must be applied to the clan owner'
        );
        await page.click(Selectors.clans.disbandAction);
        await TestClans.expectStatValue(
            statValueLocator,
            longRun,
            statBefore,
            'The clan level modifier must be reverted on leave'
        );
        await screenshots.capture(page, 'clan-left-modifier-reverted');
    }

    static async runOfflineMemberDisbandTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let ownerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName3});
        let offlineMemberId = await E2eSeedAndRestoreApi.fetchRowId(
            gameConfig,
            'players',
            {name: gameConfig.e2ePlayerName}
        );
        let clanId = await TestClans.seedClanWithMembers(gameConfig, e2eGroup, ownerId, [ownerId, offlineMemberId]);
        await Login.loginRootPlayer(page, gameConfig, longRun, TestClans.CLAN_OWNER_USER_KEY_SUFFIX);
        await TestClans.openClanPanel(page, longRun);
        await expect(page.locator(Selectors.clans.disbandAction)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
        await screenshots.capture(page, 'clan-loaded-with-offline-member');
        await page.click(Selectors.clans.disbandAction);
        await expect.poll(
            async () => await E2eSeedAndRestoreApi.loadRows(gameConfig, 'clanMembers', {clan_id: clanId}),
            {
                message: 'The disband must delete every membership, the offline members included',
                timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
            }
        ).toEqual([]);
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'clan', {id: clanId}), 'The clan must be deleted').toEqual(
            []
        );
        await screenshots.capture(page, 'clan-disbanded');
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
                let disbandButton = page.locator(Selectors.clans.disbandAction);
                let alreadyInClan = await disbandButton.isVisible().catch(() => false);
                if(alreadyInClan) {
                    await disbandButton.click();
                    await page.waitForTimeout(TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun));
                    await page.click(Selectors.hud.clanOpen);
                    await page.waitForTimeout(setup.pauseMs);
                    await expect(page.locator(Selectors.clans.dialog)).toBeVisible(
                        { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
                    );
                }
                let nameInput = page.locator(Selectors.clans.nameInput);
                let formVisible = await nameInput.isVisible().catch(() => false);
                expect(formVisible, 'Clan create form not available after disband').toBeTruthy();
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
            test('clan level modifiers change the owner stats until the clan is left', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClans.runClanLevelModifiersTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('owner disband removes the offline members from the clan', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClans.runOfflineMemberDisbandTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }
}

TestClans.run();
