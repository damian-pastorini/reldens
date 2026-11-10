/**
 *
 * Reldens - Test Character Names
 *
 * Tests the names accepted and rejected on the players creation: the short and empty names the client never sends,
 * the server minimum length, the names already used in any letter case, the banned names, the guests names, the exact
 * minimum and the names with HTML shown as text.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { BaseE2eTest } = require('./base-e2e-test');
const { CharacterCreation } = require('./helpers/character-creation');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCharacterNames
{

    static SHORT_NAME = 'Q9';
    static STORED_HTML_PATH = FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'assets', 'stored-html-payload.html');

    static async runNotSentTest(page, screenshots, gameConfig, longRun)
    {
        let createMessages = CharacterCreation.trackCreateMessages(page);
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        for(let playerName of [TestCharacterNames.SHORT_NAME, '']){
            await CharacterCreation.submitCreateForm(page, playerName);
        }
        await page.waitForTimeout(CharacterCreation.NOTHING_SENT_WAIT_MS);
        expect(createMessages.count, 'No create message must be sent').toBe(0);
        expect(await CharacterCreation.loadPlayers(gameConfig, TestCharacterNames.SHORT_NAME)).toEqual([]);
        await screenshots.capture(page, 'short-names-not-sent');
    }

    static async runServerMinimumTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let minimumLength = 6;
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/players/name/minimumLength', minimumLength);
        let playerName = 'Q'+Date.now().toString(36).slice(-(minimumLength - 2));
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.submitCreateForm(page, playerName);
        await CharacterCreation.expectCreateError(page, CharacterCreation.INVALID_NAME_MESSAGE, longRun);
        expect(await CharacterCreation.loadPlayers(gameConfig, playerName)).toEqual([]);
        await screenshots.capture(page, 'server-minimum-name-length');
    }

    static async runTakenNamesTest(page, screenshots, gameConfig, longRun)
    {
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        for(let takenName of [gameConfig.e2ePlayerName2, gameConfig.e2ePlayerName.toLowerCase()]){
            await CharacterCreation.submitCreateForm(page, takenName);
            await CharacterCreation.expectCreateError(page, CharacterCreation.NAME_UNAVAILABLE_MESSAGE, longRun);
        }
        await screenshots.capture(page, 'taken-names-rejected');
        let playerName = CharacterCreation.createPlayerName();
        await CharacterCreation.submitCreateForm(page, playerName);
        await CharacterCreation.waitForGameStart(page, longRun);
        expect((await CharacterCreation.loadPlayers(gameConfig, playerName)).length).toBe(1);
    }

    static async runBannedNameTest(page, screenshots, gameConfig, longRun)
    {
        let bannedName = CharacterCreation.createPlayerName();
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/characters/banned-names', {bannedNames: bannedName});
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.submitCreateForm(page, bannedName);
        await CharacterCreation.expectCreateError(page, CharacterCreation.NAME_UNAVAILABLE_MESSAGE, longRun);
        expect(await CharacterCreation.loadPlayers(gameConfig, bannedName)).toEqual([]);
        await screenshots.capture(page, 'banned-name-rejected');
    }

    static async runGuestsNamesTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let sharedName = CharacterCreation.createPlayerName();
        await DirectFormSubmit.enterGuestToCreation(page, longRun);
        await CharacterCreation.submitCreateForm(page, gameConfig.e2ePlayerName);
        await CharacterCreation.expectCreateError(page, CharacterCreation.NAME_UNAVAILABLE_MESSAGE, longRun);
        await CharacterCreation.submitCreateForm(page, sharedName);
        await CharacterCreation.waitForGameStart(page, longRun);
        await DirectFormSubmit.enterGuestToCreation(secondPage, longRun);
        await CharacterCreation.submitCreateForm(secondPage, sharedName);
        await CharacterCreation.waitForGameStart(secondPage, longRun);
        await page.goto('about:blank');
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.submitCreateForm(page, sharedName);
        await CharacterCreation.waitForGameStart(page, longRun);
        expect((await CharacterCreation.loadPlayers(gameConfig, sharedName)).length, 'Two guests and the user').toBe(3);
        await screenshots.capture(page, 'guests-shared-name');
    }

    static async runExactMinimumTest(page, gameConfig, longRun)
    {
        let playerName = 'Q'+Date.now().toString(36).slice(-2);
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.submitCreateForm(page, playerName);
        await CharacterCreation.waitForGameStart(page, longRun);
        expect((await CharacterCreation.loadPlayers(gameConfig, playerName)).length).toBe(1);
    }

    static HTML_PAYLOAD_EFFECTS = () => [!window.e2eStoredScriptRan, document.querySelectorAll('img[src="x"]').length];

    static async runHtmlNameTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let playerName = FileHandler.readFile(TestCharacterNames.STORED_HTML_PATH).trim()+Date.now().toString(36);
        let chatMessage = 'e2e-html-name-'+Date.now();
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await CharacterCreation.createPlayerInRoom(page, gameConfig, longRun, playerName, Login.TOWN_ROOM_NAME);
        expect(await page.evaluate(() => window.reldens.playerData.name)).toBe(playerName);
        await page.click(Selectors.hud.chatOpen);
        await page.locator(Selectors.chat.input).fill(chatMessage);
        await page.click(Selectors.chat.send);
        await expect(secondPage.locator(Selectors.chat.tabContentGeneral)).toContainText(playerName+': '+chatMessage, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        expect(await secondPage.evaluate(TestCharacterNames.HTML_PAYLOAD_EFFECTS), 'Chat of the other client').toEqual([
            true,
            0
        ]);
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await expect(page.locator(Selectors.characterSelect.option).filter({hasText: playerName})).toHaveCount(1);
        expect(await page.evaluate(TestCharacterNames.HTML_PAYLOAD_EFFECTS), 'Selection').toEqual([true, 0]);
        await screenshots.capture(page, 'html-name-as-text');
    }

    static run()
    {
        test.describe('Character Names', () => {
            test('short and empty names are never sent', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterNames.runNotSentTest(page, screenshots, gameConfig, longRun);
            });
            test('server minimum length shows the error', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCharacterNames.runServerMinimumTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('taken names are rejected and a corrected name works', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterNames.runTakenNamesTest(page, screenshots, gameConfig, longRun);
            });
            test('banned name is rejected', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterNames.runBannedNameTest(page, screenshots, gameConfig, longRun);
            });
            test('guests share names but not the registered ones', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestCharacterNames.runGuestsNamesTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('name of exactly three characters creates the player', async ({ page, gameConfig, longRun }) => {
                await TestCharacterNames.runExactMinimumTest(page, gameConfig, longRun);
            });
            test('name with HTML is shown as text', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestCharacterNames.runHtmlNameTest(page, secondPage, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestCharacterNames.run();
