/**
 *
 * Reldens - Test Clans Create
 *
 * Tests the clan creation of the group players in their scene (TeamSteps players, ClanSteps with the clan rows of the
 * players preserved, the clan settings changed for the group): a created clan stores its owner, name, first level,
 * starting points and owner membership and the panel shows the title, the owner without remove button and no connected
 * players; a duplicate name answers NAME_EXISTS; an empty name is not sent by the client; a name that cleans to nothing
 * answers CREATE_ERROR and a blank name still creates a clan; a long name is cut at the name limit and a name of exactly
 * the limit is kept; a lowered name limit and a set of starting points are used; a second create by an owner answers
 * CREATE_ERROR with no second clan; two creates of one name at once make one clan; a non string name creates nothing
 * and the room keeps answering; and a name of a disbanded clan can be used again.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { ClanSteps } = require('./helpers/clan-steps');
const { ClanSeed } = require('./helpers/clan-seed');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { TeamsConst } = require('../../lib/teams/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClansCreate
{

    static NAME_LIMIT_PATH = 'server/clan/settings/nameLimit';
    static STARTING_POINTS_PATH = 'server/clan/settings/startingPoints';
    static LOWERED_LIMIT = 10;
    static STARTING_POINTS = 7;
    static SETTLE_MS = 1500;

    static async enter(context, playersCount = 1, configValues = {})
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 2), context.longRun));
        for(let configPath of Object.keys(configValues)){
            await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, configPath, configValues[configPath]);
        }
        let players = await TeamSteps.enterPlayers(context, playersCount);
        await ClanSteps.preserveClanRows(context.gameConfig, context.e2eGroup, players);
        for(let player of players){
            expect(await ClanSteps.fetchStoredMemberships(context.gameConfig, player.playerId), player.playerName+' starts with no clan')
                .toEqual([]);
        }
        return players;
    }

    static uniqueName(prefix)
    {
        return prefix+Date.now();
    }

    static async openClanPanel(page)
    {
        await page.click(Selectors.hud.clanOpen);
        await expect(page.locator(Selectors.clans.dialog), 'The clan panel is open').toBeVisible({timeout: TimeConstants.UI_OPEN});
    }

    static async runCreateTest(context)
    {
        let players = await TestClansCreate.enter(context);
        let clanName = TestClansCreate.uniqueName('E2eCreate');
        let created = await ClanSteps.createClan(players[0], clanName);
        let storedClan = [...await ClanSteps.fetchStoredClans(context.gameConfig, {name: clanName})].shift();
        let firstLevel = await ClanSeed.fetchInitialLevel(context.gameConfig);
        expect(
            [Number(storedClan.owner_id), Number(storedClan.level), Number(storedClan.points), Number(storedClan.id)],
            'The stored clan'
        ).toEqual([players[0].playerId, Number(firstLevel.key), TeamsConst.CLAN_STARTING_POINTS, Number(created.id)]);
        expect((await ClanSteps.fetchStoredMemberships(context.gameConfig, players[0].playerId)).map(row => Number(row.clan_id)), 'The owner membership')
            .toEqual([Number(created.id)]);
        await TestClansCreate.openClanPanel(players[0].page);
        let dialog = players[0].page.locator(Selectors.clans.dialog);
        await expect(dialog, 'The clan title').toContainText(
            TeamsConst.LABELS.CLAN.CLAN_TITLE.replace('%clanName', clanName).replace('%leaderName', '')
        );
        await expect(dialog, 'The leader name').toContainText(players[0].playerName);
        await expect(dialog.locator('.clan-remove-button'), 'No remove button on the owner').toHaveCount(0);
        await expect(dialog, 'No connected players').toContainText(TeamsConst.LABELS.CLAN.NONE_CONNECTED);
    }

    static async runNameRulesTest(context)
    {
        let players = await TestClansCreate.enter(context, 2);
        let clanName = TestClansCreate.uniqueName('E2eRules');
        await ClanSteps.createClan(players[0], clanName);
        expect((await ClanSteps.create(players[1], clanName)).result, 'A duplicate name').toBe(TeamsConst.VALIDATION.NAME_EXISTS);
        expect((await ClanSteps.create(players[1], '\\\\')).result, 'A name that cleans to nothing').toBe(TeamsConst.VALIDATION.CREATE_ERROR);
        let longName = 'L'.repeat(TeamsConst.NAME_LIMIT + 5)+Date.now();
        expect((await ClanSteps.createClan(players[1], longName)).clanName, 'A long name is cut at the limit')
            .toBe(longName.substring(0, TeamsConst.NAME_LIMIT));
    }

    static async runExactLimitTest(context)
    {
        let players = await TestClansCreate.enter(context);
        let exactName = (TestClansCreate.uniqueName('E2eExact')+'x'.repeat(TeamsConst.NAME_LIMIT)).substring(0, TeamsConst.NAME_LIMIT);
        await ClanSteps.createClan(players[0], exactName);
        expect((await ClanSteps.fetchStoredClans(context.gameConfig, {owner_id: players[0].playerId})).map(row => row.name), 'Kept')
            .toEqual([exactName]);
    }

    static async runBlankNameTest(context)
    {
        let players = await TestClansCreate.enter(context);
        expect((await ClanSteps.create(players[0], '   ')).result, 'A blank name still creates a clan').toBe(TeamsConst.VALIDATION.SUCCESS);
    }

    static async runEmptyClientNameTest(context)
    {
        let players = await TestClansCreate.enter(context);
        await TestClansCreate.openClanPanel(players[0].page);
        await RoomMessagesRecorder.start(players[0].page);
        await players[0].page.locator(Selectors.clans.nameInput).fill('');
        await players[0].page.click(Selectors.clans.submitCreate);
        await players[0].page.waitForTimeout(TestClansCreate.SETTLE_MS);
        expect(await RoomMessagesRecorder.fetchMessages(players[0].page, TeamsConst.ACTIONS.CLAN_CREATE), 'Nothing is sent').toEqual([]);
    }

    static async runSettingsTest(context)
    {
        let players = await TestClansCreate.enter(context, 1, {
            [TestClansCreate.NAME_LIMIT_PATH]: TestClansCreate.LOWERED_LIMIT,
            [TestClansCreate.STARTING_POINTS_PATH]: TestClansCreate.STARTING_POINTS
        });
        let clanName = TestClansCreate.uniqueName('E2eSettings');
        await ClanSteps.createClan(players[0], clanName);
        let storedClan = [...await ClanSteps.fetchStoredClans(context.gameConfig, {owner_id: players[0].playerId})].shift();
        expect([storedClan.name, Number(storedClan.points)], 'The lowered limit and the starting points')
            .toEqual([clanName.substring(0, TestClansCreate.LOWERED_LIMIT), TestClansCreate.STARTING_POINTS]);
    }

    static async runSecondCreateTest(context)
    {
        let players = await TestClansCreate.enter(context);
        await ClanSteps.createClan(players[0], TestClansCreate.uniqueName('E2eFirst'));
        expect((await ClanSteps.create(players[0], TestClansCreate.uniqueName('E2eSecond'))).result, 'The owner second create')
            .toBe(TeamsConst.VALIDATION.CREATE_ERROR);
        expect((await ClanSteps.fetchStoredClans(context.gameConfig, {owner_id: players[0].playerId})).length, 'No second clan').toBe(1);
    }

    static async runSameNameTest(context)
    {
        let players = await TestClansCreate.enter(context, 2);
        let clanName = TestClansCreate.uniqueName('E2eRace');
        for(let player of players){
            await RoomMessagesRecorder.start(player.page);
        }
        await Promise.all(players.map(player => RoomMessagesRecorder.sendMessage(player.page, {
            act: TeamsConst.ACTIONS.CLAN_CREATE,
            [TeamsConst.ACTIONS.CLAN_NAME]: clanName
        })));
        await players[0].page.waitForTimeout(TestClansCreate.SETTLE_MS);
        expect((await ClanSteps.fetchStoredClans(context.gameConfig, {name: clanName})).length, 'One clan').toBe(1);
    }

    static async runNonStringNameTest(context)
    {
        let players = await TestClansCreate.enter(context);
        await RoomMessagesRecorder.sendMessage(players[0].page, {act: TeamsConst.ACTIONS.CLAN_CREATE, [TeamsConst.ACTIONS.CLAN_NAME]: 12345});
        await players[0].page.waitForTimeout(TestClansCreate.SETTLE_MS);
        expect(await ClanSteps.fetchStoredClans(context.gameConfig, {owner_id: players[0].playerId}), 'No clan').toEqual([]);
        await ClanSteps.createClan(players[0], TestClansCreate.uniqueName('E2eAfter'));
    }

    static async runNameReuseTest(context)
    {
        let players = await TestClansCreate.enter(context);
        let clanName = TestClansCreate.uniqueName('E2eReuse');
        let created = await ClanSteps.createClan(players[0], clanName);
        await ClanSteps.leave(players[0], created.id);
        await expect.poll(async () => await ClanSteps.fetchStoredClans(context.gameConfig, {name: clanName}), {
            message: 'The clan is disbanded',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual([]);
        await ClanSteps.createClan(players[0], clanName);
    }

    static run()
    {
        test.describe('Clans Create', () => {
            test('created clan stores its data and the panel shows it', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansCreate.runCreateTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('duplicate, cleaned and long names follow the name rules', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansCreate.runNameRulesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('name of exactly the limit is kept', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansCreate.runExactLimitTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('blank name still creates a clan', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansCreate.runBlankNameTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('empty name is not sent by the client', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansCreate.runEmptyClientNameTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('lowered name limit and starting points are used', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansCreate.runSettingsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second create by an owner leaves no second clan', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansCreate.runSecondCreateTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two creates of one name at once make one clan', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansCreate.runSameNameTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('non string name creates nothing and the room keeps answering', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansCreate.runNonStringNameTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('name of a disbanded clan can be used again', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansCreate.runNameReuseTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestClansCreate.run();
