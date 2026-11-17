/**
 *
 * Reldens - Test Quests Tracking
 *
 * Tests the quests tracking data sent to the client on every room join (exclusive group, it seeds global quest rows that
 * every player gets and it changes the rooms): the player rows and the global rows (no player id) are delivered with
 * their keys while the rows of another player are not, and the data of a player online is not replaced when another
 * player joins its room; a row added during the session is delivered on the next room change and a row added after the
 * logout on the next login, with the previous keys; and a guest with no rows gets an empty list, and its row after a
 * room change. The seeded quests rows are created for the group and deleted by the group reset.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TeamSteps } = require('./helpers/team-steps');
const { CharacterCreation } = require('./helpers/character-creation');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestQuestsTracking
{

    static QUEST_KEY_PREFIX = 'e2e-quest-';

    static async seedQuest(context, questKey, playerName = false)
    {
        let gameConfig = context.gameConfig;
        return await E2eSeedAndRestoreApi.createRow(gameConfig, context.e2eGroup, 'questsProgress', {
            player_id: playerName ? await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName}) : null,
            quest_key: TestQuestsTracking.QUEST_KEY_PREFIX+questKey
        });
    }

    static async expectSeededKeys(page, questKeys, message)
    {
        let expectedKeys = questKeys.map(questKey => TestQuestsTracking.QUEST_KEY_PREFIX+questKey).sort();
        await expect.poll(async () => await page.evaluate(
            (keyPrefix) => (window.reldens?.playerQuestsData || []).filter(questKey => questKey.startsWith(keyPrefix)).sort(),
            TestQuestsTracking.QUEST_KEY_PREFIX
        ), {message, timeout: TimeConstants.SERVER_RESPONSE}).toEqual(expectedKeys);
    }

    static async runPlayerAndGlobalRowsTest(context)
    {
        let gameConfig = context.gameConfig;
        await TestQuestsTracking.seedQuest(context, 'first', gameConfig.e2ePlayerName);
        await TestQuestsTracking.seedQuest(context, 'second', gameConfig.e2ePlayerName2);
        await TestQuestsTracking.seedQuest(context, 'global');
        await Login.loginRootPlayer(context.page, gameConfig, context.longRun);
        await TestQuestsTracking.expectSeededKeys(context.page, ['first', 'global'], 'The own and the global rows');
        await context.page.evaluate((markerKey) => window.reldens.playerQuestsData.push(markerKey), 'e2e-quest-marker');
        await Login.loginRootPlayer(context.secondPage, gameConfig, context.longRun, '2');
        await TestQuestsTracking.expectSeededKeys(context.secondPage, ['second', 'global'], 'The other player rows');
        await TestQuestsTracking.expectSeededKeys(
            context.page,
            ['first', 'global', 'marker'],
            'The data of the player online is not replaced by the join of another player'
        );
    }

    static async runRowsAddedLaterTest(context)
    {
        let gameConfig = context.gameConfig;
        await TestQuestsTracking.seedQuest(context, 'first', gameConfig.e2ePlayerName);
        await Login.loginRootPlayer(context.page, gameConfig, context.longRun);
        await TestQuestsTracking.expectSeededKeys(context.page, ['first'], 'The row before the session');
        await TestQuestsTracking.seedQuest(context, 'session', gameConfig.e2ePlayerName);
        await TeamSteps.changeScene(context, {page: context.page, playerName: gameConfig.e2ePlayerName});
        await TestQuestsTracking.expectSeededKeys(context.page, ['first', 'session'], 'The row added during the session');
        await context.page.reload();
        await TestQuestsTracking.seedQuest(context, 'logout', gameConfig.e2ePlayerName);
        await Login.loginRootPlayer(context.page, gameConfig, context.longRun);
        await TestQuestsTracking.expectSeededKeys(
            context.page,
            ['first', 'session', 'logout'],
            'The row added after the logout with the previous rows'
        );
    }

    static async runGuestRowsTest(context)
    {
        let guest = await CharacterCreation.enterGuestInGame(context.page, context.longRun, Login.TOWN_ROOM_NAME);
        await expect.poll(async () => await context.page.evaluate(() => window.reldens.playerQuestsData), {
            message: 'The guest with no rows gets an empty list',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual([]);
        await TestQuestsTracking.seedQuest(context, 'guest', guest.playerName);
        await TeamSteps.changeScene(context, {page: context.page, playerName: guest.playerName});
        await TestQuestsTracking.expectSeededKeys(context.page, ['guest'], 'The guest row after the room change');
    }

    static run()
    {
        test.describe('Quests Tracking', () => {
            test('player and global quest rows are delivered and another player join does not replace them', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestQuestsTracking.runPlayerAndGlobalRowsTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('rows added during the session and after the logout are delivered on the room change and login', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestQuestsTracking.runRowsAddedLaterTest({page, gameConfig, e2eGroup, longRun});
            });
            test('guest with no rows gets an empty list and its row after a room change', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestQuestsTracking.runGuestRowsTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestQuestsTracking.run();
