/**
 *
 * Reldens - Test Player Name Sprites
 *
 * Tests the name shown over the players sprites by the client/ui/players options (exclusive group, both group players
 * in the town, the options set on the first client before its engine starts): with showNames on, showCurrentPlayerName
 * off and showNamesLimit 3 the own sprite has no name and the other player shows its first three letters and "...";
 * with showNames off, showCurrentPlayerName on and no limit the own sprite shows its full name and the other player
 * none.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { InitialClientConfig } = require('./helpers/initial-client-config');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestPlayerNameSprites
{

    static PLAYERS_UI_PATH = 'client/ui/players';
    static NAME_LIMIT = 3;
    static READ_NAMES = (sessionIds) => sessionIds.map((sessionId) => [
        window.reldens.getActiveScene().player.players[sessionId]?.nameSprite
    ].map((nameSprite) => nameSprite ? nameSprite.text : false).pop());

    static async readShownNames(context, playersOptions)
    {
        await InitialClientConfig.overrideBeforeEngine(context.page, TestPlayerNameSprites.PLAYERS_UI_PATH, playersOptions);
        let players = await TeamSteps.enterPlayers(context, 2);
        await expect.poll(
            async () => context.page.evaluate((otherSessionId) => Boolean(
                window.reldens.getActiveScene().player.players[otherSessionId]
            ), players[1].sessionId),
            {message: 'The first client shows the other player'}
        ).toBe(true);
        return await context.page.evaluate(TestPlayerNameSprites.READ_NAMES, players.map((player) => player.sessionId));
    }

    static async runOtherNamesLimitTest(context)
    {
        let otherName = context.gameConfig.e2ePlayerName2;
        expect(
            await TestPlayerNameSprites.readShownNames(context, {
                showNames: true,
                showCurrentPlayerName: false,
                showNamesLimit: TestPlayerNameSprites.NAME_LIMIT
            }),
            'The own sprite has no name and the other name is cut to the limit'
        ).toEqual([false, otherName.slice(0, TestPlayerNameSprites.NAME_LIMIT)+'...']);
    }

    static async runOwnNameOnlyTest(context)
    {
        expect(
            await TestPlayerNameSprites.readShownNames(context, {
                showNames: false,
                showCurrentPlayerName: true,
                showNamesLimit: 0
            }),
            'The own sprite shows its full name and the other player none'
        ).toEqual([context.gameConfig.e2ePlayerName, false]);
    }

    static run()
    {
        test.describe('Player Name Sprites', () => {
            test('the own name off and the names limit show only the other player name cut to the limit', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestPlayerNameSprites.runOtherNamesLimitTest({page, secondPage, gameConfig, longRun});
            });
            test('the names off and the own name on show only the own full name', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestPlayerNameSprites.runOwnNameOnlyTest({page, secondPage, gameConfig, longRun});
            });
        });
    }

}

TestPlayerNameSprites.run();
