/**
 *
 * Reldens - Test Cross Server Names
 *
 * Tests the usernames, emails and player names kept unique between servers with their own database: the signed check
 * routes rejecting a request without a valid token, and with a run where server-2 has its own database and every server
 * lists the others (crossServerNamesCheck in the run config, see the e2e testing guide) a username, an email and a player
 * name taken on server-1 are rejected on server-2, a guest on server-2 can not take a registered player name of
 * server-1, and the same username or player name sent to both servers at the same time is stored only once.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CharacterCreation } = require('./helpers/character-creation');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { E2eServerInstances } = require('./helpers/e2e-server-instances');
const { Login } = require('./helpers/login');
const { SecurityApi } = require('./helpers/security-api');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerNames
{

    static SKIP_REASON = 'Needs a run with crossServerNamesCheck and server-2 on its own database (e2e testing guide)';
    static uniqueValuesCount = 0;

    static isOwnDatabasesRun(gameConfig)
    {
        let secondServerDbName = sc.get(sc.get(sc.get(gameConfig, 'servers', {}), 'server-2', {}), 'dbName', '');
        if('' === secondServerDbName){
            return false;
        }
        return true === sc.get(gameConfig, 'crossServerNamesCheck', false) && gameConfig.dbName !== secondServerDbName;
    }

    static createUniqueValue(prefix)
    {
        TestCrossServerNames.uniqueValuesCount++;
        return prefix+Date.now().toString(36)+TestCrossServerNames.uniqueValuesCount;
    }

    static async openSecondServerPage(page, gameConfig)
    {
        let secondServerPage = (await Login.openClientPage(
            page,
            E2eServerInstances.forServer(gameConfig, 'server-2')
        )).clientPage;
        await DirectFormSubmit.openPage(secondServerPage);
        return secondServerPage;
    }

    static async countRowsOnBothServers(gameConfig, entityKey, filters)
    {
        return (await E2eSeedAndRestoreApi.loadRows(gameConfig, entityKey, filters)).length
            + (await E2eSeedAndRestoreApi.loadRows(
                E2eServerInstances.forServer(gameConfig, 'server-2'),
                entityKey,
                filters
            )).length;
    }

    static async registerOnPage(page, username, email, longRun)
    {
        await DirectFormSubmit.submit(page, DirectFormSubmit.createRegistration(username, email, DirectFormSubmit.VALID_PASSWORD), true);
        await DirectFormSubmit.expectPlayerSelection(page, longRun, 'Registered '+username);
    }

    static async runCheckRoutesTokenTest(gameConfig)
    {
        for(let checkRoute of [GameConst.ROUTE_PATHS.CHECK_PLAYER_NAME, GameConst.ROUTE_PATHS.CHECK_USER_NAME]){
            await TestCrossServerNames.expectRouteRejectsUnsignedChecks(gameConfig, checkRoute);
        }
    }

    static async expectRouteRejectsUnsignedChecks(gameConfig, checkRoute)
    {
        for(let checkBody of [{}, {values: ['e2e-name'], token: '1.bad'}, {values: ['e2e-name']}]){
            expect(
                await SecurityApi.request(gameConfig, 'POST', checkRoute, checkBody),
                checkRoute+' '+sc.toJsonString(checkBody)
            ).toEqual({isAvailable: false});
        }
    }

    static async runTakenUserValuesTest(page, gameConfig, longRun)
    {
        let username = TestCrossServerNames.createUniqueValue('e2eu');
        let email = username+'@yourgame.com';
        await TestCrossServerNames.registerOnPage(page, username, email, longRun);
        let secondServerPage = await TestCrossServerNames.openSecondServerPage(page, gameConfig);
        let takenCases = [
            {label: 'Username taken on server-1', username, email: TestCrossServerNames.createUniqueValue('e2ee')+'@yourgame.com'},
            {label: 'Email taken on server-1', username: TestCrossServerNames.createUniqueValue('e2eu'), email}
        ];
        for(let takenCase of takenCases){
            await DirectFormSubmit.submit(
                secondServerPage,
                DirectFormSubmit.createRegistration(takenCase.username, takenCase.email, DirectFormSubmit.VALID_PASSWORD),
                true
            );
            await DirectFormSubmit.expectFormError(
                secondServerPage,
                Selectors.registerResponse.error,
                longRun,
                takenCase.label
            );
            expect(
                await TestCrossServerNames.countRowsOnBothServers(gameConfig, 'users', {username: takenCase.username}),
                takenCase.label
            ).toBe(takenCase.username === username ? 1 : 0);
        }
    }

    static async runTakenPlayerNameTest(page, gameConfig, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.submitCreateForm(page, playerName);
        await CharacterCreation.waitForGameStart(page, longRun);
        let secondServerPage = await TestCrossServerNames.openSecondServerPage(page, gameConfig);
        let username = TestCrossServerNames.createUniqueValue('e2eu');
        await TestCrossServerNames.registerOnPage(secondServerPage, username, username+'@yourgame.com', longRun);
        await CharacterCreation.submitCreateForm(secondServerPage, playerName);
        await CharacterCreation.expectCreateError(secondServerPage, CharacterCreation.NAME_UNAVAILABLE_MESSAGE, longRun);
        let guestPage = await TestCrossServerNames.openSecondServerPage(page, gameConfig);
        await DirectFormSubmit.enterGuestToCreation(guestPage, longRun);
        await CharacterCreation.submitCreateForm(guestPage, playerName);
        await CharacterCreation.expectCreateError(guestPage, CharacterCreation.NAME_UNAVAILABLE_MESSAGE, longRun);
        expect(await TestCrossServerNames.countRowsOnBothServers(gameConfig, 'players', {name: playerName})).toBe(1);
    }

    static async runSameUsernameAtTheSameTimeTest(page, gameConfig)
    {
        let username = TestCrossServerNames.createUniqueValue('e2eu');
        let secondServerPage = await TestCrossServerNames.openSecondServerPage(page, gameConfig);
        let registrationPages = [page, secondServerPage];
        for(let registrationPage of registrationPages){
            await DirectFormSubmit.openPage(registrationPage);
        }
        await Promise.all(registrationPages.map((registrationPage, pageIndex) => DirectFormSubmit.startGame(
            registrationPage,
            DirectFormSubmit.createRegistration(username, username+pageIndex+'@yourgame.com', DirectFormSubmit.VALID_PASSWORD),
            true
        )));
        await TestCrossServerNames.expectStoredOnce(page, gameConfig, 'users', {username});
    }

    static async runSamePlayerNameAtTheSameTimeTest(page, gameConfig, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        let secondServerPage = await TestCrossServerNames.openSecondServerPage(page, gameConfig);
        let username = TestCrossServerNames.createUniqueValue('e2eu');
        await TestCrossServerNames.registerOnPage(secondServerPage, username, username+'@yourgame.com', longRun);
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        let creationPages = [page, secondServerPage];
        for(let creationPage of creationPages){
            await creationPage.locator(Selectors.characterSelect.newPlayerName).fill(playerName);
        }
        await Promise.all(creationPages.map(
            creationPage => creationPage.click(Selectors.characterSelect.createSubmit)
        ));
        await TestCrossServerNames.expectStoredOnce(page, gameConfig, 'players', {name: playerName});
    }

    static async expectStoredOnce(page, gameConfig, entityKey, filters)
    {
        await expect.poll(
            async () => await TestCrossServerNames.countRowsOnBothServers(gameConfig, entityKey, filters),
            {timeout: 10000}
        ).toBe(1);
        await page.waitForTimeout(CharacterCreation.NOTHING_SENT_WAIT_MS);
        expect(await TestCrossServerNames.countRowsOnBothServers(gameConfig, entityKey, filters), 'Stored once').toBe(1);
    }

    static run()
    {
        test.describe('Cross Server Names', () => {
            test('the names check routes reject the requests without a valid signed token', async ({ gameConfig }) => {
                await TestCrossServerNames.runCheckRoutesTokenTest(gameConfig);
            });
            test('username and email taken on server-1 are rejected on server-2', async ({ page, gameConfig, longRun }) => {
                test.skip(!TestCrossServerNames.isOwnDatabasesRun(gameConfig), TestCrossServerNames.SKIP_REASON);
                await TestCrossServerNames.runTakenUserValuesTest(page, gameConfig, longRun);
            });
            test('player name taken on server-1 is rejected for a user and a guest on server-2', async ({ page, gameConfig, longRun }) => {
                test.skip(!TestCrossServerNames.isOwnDatabasesRun(gameConfig), TestCrossServerNames.SKIP_REASON);
                await TestCrossServerNames.runTakenPlayerNameTest(page, gameConfig, longRun);
            });
            test('same username registered on both servers at the same time is stored once', async ({ page, gameConfig }) => {
                test.skip(!TestCrossServerNames.isOwnDatabasesRun(gameConfig), TestCrossServerNames.SKIP_REASON);
                await TestCrossServerNames.runSameUsernameAtTheSameTimeTest(page, gameConfig);
            });
            test('same player name created on both servers at the same time is stored once', async ({ page, gameConfig, longRun }) => {
                test.skip(!TestCrossServerNames.isOwnDatabasesRun(gameConfig), TestCrossServerNames.SKIP_REASON);
                await TestCrossServerNames.runSamePlayerNameAtTheSameTimeTest(page, gameConfig, longRun);
            });
        });
    }

}

TestCrossServerNames.run();
