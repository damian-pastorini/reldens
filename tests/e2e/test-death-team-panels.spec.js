/**
 *
 * Reldens - Test Death Team Panels
 *
 * Tests the team and the clan panels of the second player while the first player dies in the forest and revives in
 * place (the death teleport is off, the aggressive enemies are disabled and the first player is killed by the other
 * enemy of the configured enemy respawn layer, TestCombatDeath): with both players in a team (the first player targets
 * the second one with the same client method the sprite click calls, invites it from the target box and the second one
 * accepts) or in a clan (seeded for the group before the login, ClanSeed), the second player panel shows the first
 * player life at 0 after the death and at its full value after the revive.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { ClanSeed } = require('./helpers/clan-seed');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { ObserverSteps } = require('./helpers/observer-steps');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathTeamPanels
{

    static TELEPORT_OFF = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};
    static LIFE_PROPERTY_KEY = 'hp';

    static async fetchPlayersIds(gameConfig)
    {
        return {
            first: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName}),
            second: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName2})
        };
    }

    static async enterForest(context)
    {
        await DeathReviveSteps.prepareDeath(context, TestDeathTeamPanels.TELEPORT_OFF);
        await DeathObserverSteps.loginBothInForest(context);
        await RoomObjectsApi.disableEnemies(context.gameConfig, Login.FOREST_ROOM_NAME, true);
    }

    static async expectLifeShownOnDeathAndRevive(context, lifeSelector)
    {
        let shownLife = context.secondPage.locator(lifeSelector);
        await expect(shownLife, 'The second player panel shows the first player life').toHaveCount(
            1,
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
        await TestCombatDeath.killPlayerAgain(context.page, context.gameConfig, TimeConstants.ENEMY_KILL);
        await expect(shownLife, 'The panel shows the dead player life at 0').toHaveText(
            '0',
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
        let revivedPlayer = await DeathReviveSteps.expectAliveInForest(context);
        await expect(shownLife, 'The panel shows the revived player full life').toHaveText(
            String(revivedPlayer.totalLife),
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
    }

    static async runTeamPanelTest(context)
    {
        let playersIds = await TestDeathTeamPanels.fetchPlayersIds(context.gameConfig);
        await TestDeathTeamPanels.enterForest(context);
        await ObserverSteps.joinTeam(context, await DeathObserverSteps.fetchSessionId(context.secondPage));
        await TestDeathTeamPanels.expectLifeShownOnDeathAndRevive(
            context,
            Selectors.teams.playerProperty(playersIds.first, TestDeathTeamPanels.LIFE_PROPERTY_KEY)
        );
    }

    static async runClanPanelTest(context)
    {
        let playersIds = await TestDeathTeamPanels.fetchPlayersIds(context.gameConfig);
        await ClanSeed.seedClanWithMembers(
            context.gameConfig,
            context.e2eGroup,
            playersIds.first,
            [playersIds.first, playersIds.second]
        );
        await TestDeathTeamPanels.enterForest(context);
        await TestDeathTeamPanels.expectLifeShownOnDeathAndRevive(
            context,
            Selectors.clans.playerProperty(playersIds.first, TestDeathTeamPanels.LIFE_PROPERTY_KEY)
        );
    }

    static run()
    {
        test.describe('Death Team Panels', () => {
            test('team panel of the other member shows the dead player life at 0 and full after the revive', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeamPanels.runTeamPanelTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('clan panel of the other member shows the dead player life at 0 and full after the revive', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeamPanels.runClanPanelTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestDeathTeamPanels.run();
