/**
 *
 * Reldens - Test Clans Sessions
 *
 * Tests the clan of the group players across their sessions and scenes (ClanSteps players with the clan level modifier
 * of the stat atk, or a clan seeded for the group before the logins): a member reload drops it from the connected
 * players of the owner panel and keeps its membership, its next login applies the modifier once, and the last member
 * going offline unloads the clan until the next login loads it again; a member changing the scene keeps the clan panel
 * and the modifier once, and the stored stat never keeps it; the owner removing a member and disbanding with members in
 * another scene returns them to the create form there; the accepted line of an invite reaches the owner on a clan first
 * loaded by a member and after the owner changes the scene; and a login shows the clan title, members and connected
 * players (the configured none label, a connected player name targets it), the clan message received before the UI
 * scene exists (the preloader held on its loading template) applied once the scene is created, and the create form for a
 * player with no clan; and the clan leave button of an owner whose player id is also its clan id (the clan seeded with
 * that id), in a team too, sends only the clan leave and keeps the team.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { ClanSteps } = require('./helpers/clan-steps');
const { ClanSeed } = require('./helpers/clan-seed');
const { ChatSteps } = require('./helpers/chat-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { TeamsConst } = require('../../lib/teams/constants');
const { ChatConst } = require('../../lib/chat/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClansSessions
{

    static NONE_CONNECTED_PATH = 'client/clan/labels/noneConnected';
    static NONE_CONNECTED_LABEL = 'E2E nobody online';
    static LOADING_TEMPLATE_ROUTE = '**/assets/html/ui-loading.html';

    static async expectAcceptedLine(owner, otherPlayers, joiningPlayer)
    {
        let acceptedLine = TeamsConst.CHAT.MESSAGE.INVITE_ACCEPTED.replace('%playerName', joiningPlayer.playerName);
        await expect.poll(async () => await ChatSteps.fetchTexts(owner.page, ChatConst.TYPES.TEAMS), {
            message: 'The owner gets the accepted line',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toContain(acceptedLine);
        for(let otherPlayer of otherPlayers){
            expect(await ChatSteps.fetchTexts(otherPlayer.page, ChatConst.TYPES.TEAMS), 'Only the owner gets it')
                .not.toContain(acceptedLine);
        }
    }

    static async runDisconnectsTest(context)
    {
        let gameConfig = context.gameConfig;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 8, context.longRun));
        let entered = await ClanSteps.enterWithClan(context, 2, 1);
        let [owner, member] = entered.players;
        await member.page.reload();
        await ClanSteps.expectConnected(gameConfig, entered.clanId, [owner], 'The member is offline');
        await expect(owner.page.locator('.clan-player-'+member.playerId), 'The owner panel drops the connected member')
            .toHaveCount(0, {timeout: TimeConstants.SERVER_RESPONSE});
        await expect(owner.page.locator('.clan-member-'+member.playerId), 'The member is still listed').toHaveCount(1);
        expect((await ClanSteps.fetchStoredMemberships(gameConfig, member.playerId)).length, 'The membership is kept').toBe(1);
        await Login.loginRootPlayer(member.page, gameConfig, context.longRun, '2');
        await ClanSteps.expectConnected(gameConfig, entered.clanId, entered.players, 'The member is back');
        await ClanSteps.expectStat(gameConfig, member, Login.TOWN_ROOM_NAME, true, 'The modifier is applied once');
        await owner.page.reload();
        await member.page.reload();
        await expect.poll(async () => Object.keys(await ClanSteps.fetchClans(gameConfig)), {
            message: 'The clan is unloaded with no member online',
            timeout: TimeConstants.SERVER_RESPONSE
        }).not.toContain(String(entered.clanId));
        await Login.loginRootPlayer(owner.page, gameConfig, context.longRun);
        await ClanSteps.expectConnected(gameConfig, entered.clanId, [owner], 'The clan is loaded again');
        await ClanSteps.expectMembers(gameConfig, entered.clanId, TeamSteps.sortedIds(entered.players), 'Both members');
    }

    static async runSceneChangeTest(context)
    {
        let gameConfig = context.gameConfig;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 6, context.longRun));
        let entered = await ClanSteps.enterWithClan(context, 2, 1);
        let [owner, member] = entered.players;
        await TeamSteps.changeScene(context, member, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await ClanSteps.expectMemberInNewRoom(gameConfig, owner, member, Login.FOREST_ROOM_NAME);
        expect(
            await ClanSeed.fetchStoredStatValue(gameConfig, member.playerId, ClanSteps.STAT_KEY),
            'The stored stat does not keep the modifier'
        ).toBe(member.storedStat);
    }

    static async runOtherSceneRemovesTest(context)
    {
        let gameConfig = context.gameConfig;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 8, context.longRun));
        let entered = await ClanSteps.enterWithClan(context, 3, 2);
        let [owner, removed, disbanded] = entered.players;
        for(let member of [removed, disbanded]){
            await TeamSteps.changeScene(context, member, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        }
        await ClanSteps.leave(owner, entered.clanId, String(removed.playerId));
        let removedLine = TeamsConst.CHAT.MESSAGE.REMOVED;
        await ClanSteps.expectOutOfClan(gameConfig, removed, Login.FOREST_ROOM_NAME, removedLine, removed.playerName);
        await ClanSteps.leave(owner, entered.clanId);
        let disbandedLine = TeamsConst.CHAT.MESSAGE.DISBANDED;
        await ClanSteps.expectOutOfClan(gameConfig, disbanded, Login.FOREST_ROOM_NAME, disbandedLine, owner.playerName);
    }

    static async runMemberLoadedClanTest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 6, context.longRun));
        let clanId = (await ClanSteps.seedGroupClan(context, 1, [1, 0])).clanId;
        let players = await TeamSteps.enterPlayers(context, 3);
        await ClanSteps.expectConnected(context.gameConfig, clanId, players.slice(0, 2), 'The member loaded the clan first');
        await ClanSteps.join(context.gameConfig, players[1], players[2], clanId, TeamSteps.sortedIds(players));
        await TestClansSessions.expectAcceptedLine(players[1], [players[0]], players[2]);
    }

    static async runOwnerSceneChangeTest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 7, context.longRun));
        let entered = await ClanSteps.enterWithClan(context, 3, 1);
        let [owner, member, invited] = entered.players;
        for(let player of [invited, owner]){
            await TeamSteps.changeScene(context, player, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        }
        await ClanSteps.join(context.gameConfig, owner, invited, entered.clanId, TeamSteps.sortedIds(entered.players));
        await TestClansSessions.expectAcceptedLine(owner, [member], invited);
    }

    static async loginWithHeldUiScene(context)
    {
        let page = context.page;
        let gate = {isHeld: true};
        await page.route(TestClansSessions.LOADING_TEMPLATE_ROUTE, async (route) => {
            await expect.poll(() => gate.isHeld, {timeout: TimeConstants.ROOM_TRANSITION}).toBe(false);
            await route.continue();
        });
        let ownerLogin = Login.loginRootPlayer(page, context.gameConfig, context.longRun);
        await page.waitForSelector(Selectors.body.gameEngineStarted, {timeout: TimeConstants.GAME_START});
        await expect.poll(async () => await page.evaluate(() => (window.reldens?.activeRoomEvents?.clanMessagesQueue || []).map(
            message => message.act
        )), {message: 'The clan update waits for the UI scene', timeout: TimeConstants.ROOM_TRANSITION})
            .toContain(TeamsConst.ACTIONS.CLAN_UPDATE);
        gate.isHeld = false;
        await ownerLogin;
    }

    static async runLoginPanelTest(context)
    {
        let gameConfig = context.gameConfig;
        let page = context.page;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 6, context.longRun));
        let path = TestClansSessions.NONE_CONNECTED_PATH;
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, context.e2eGroup, path, TestClansSessions.NONE_CONNECTED_LABEL);
        let seeded = await ClanSteps.seedGroupClan(context, 0, [0, 1]);
        await TestClansSessions.loginWithHeldUiScene(context);
        let clanName = (await ClanSteps.fetchStoredClans(gameConfig, {id: seeded.clanId})).shift().name;
        await expect(page.locator('#box-'+TeamsConst.CLAN_KEY+' .box-title'), 'The clan title').toHaveText(
            TeamsConst.LABELS.CLAN.CLAN_TITLE.replace('%clanName', clanName).replace('%leaderName', gameConfig.e2ePlayerName),
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
        for(let member of seeded.players.slice(0, 2)){
            await expect(page.locator('.clan-member-'+member.playerId), member.playerName+' is listed').toHaveCount(1);
        }
        await expect(page.locator('.clan-players-boxes'), 'The none label').toHaveText(TestClansSessions.NONE_CONNECTED_LABEL);
        await Login.loginRootPlayer(context.secondPage, gameConfig, context.longRun, '2');
        let connectedName = page.locator('.clan-player-'+seeded.players[1].playerId+' .player-name');
        await expect(connectedName, 'The second member is connected').toHaveCount(1, {timeout: TimeConstants.SERVER_RESPONSE});
        await page.click(Selectors.hud.clanOpen);
        await connectedName.click();
        let secondSessionId = await context.secondPage.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await expect.poll(async () => await page.evaluate(() => window.reldens.getCurrentPlayer().currentTarget?.id), {
            message: 'The connected player name targets it',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toBe(secondSessionId);
        let thirdPage = (await Login.openClientPage(page, gameConfig)).clientPage;
        await Login.loginRootPlayer(thirdPage, gameConfig, context.longRun, '3');
        await expect(thirdPage.locator(Selectors.clans.nameInput), 'The create form for no clan')
            .toHaveCount(1, {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async runSharedLeaveClassTest(context)
    {
        let gameConfig = context.gameConfig;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 5, context.longRun));
        let ownerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName});
        expect(await ClanSteps.fetchStoredClans(gameConfig, {id: ownerId}), 'No clan uses the owner id').toEqual([]);
        let seeded = await ClanSteps.seedGroupClan(context, 0, [0, 1], true);
        let players = await TeamSteps.enterPlayers(context, 2);
        await TeamSteps.formTeam(gameConfig, players[0], players.slice(1));
        let owner = players[0];
        await expect(owner.page.locator('#box-'+TeamsConst.KEY+ownerId+' .leave-'+ownerId), 'The team leave button')
            .toHaveCount(1, {timeout: TimeConstants.SERVER_RESPONSE});
        await owner.page.evaluate(() => {
            let roomEvents = window.reldens.activeRoomEvents;
            let send = roomEvents.send.bind(roomEvents);
            window.e2eSentActs = [];
            roomEvents.send = (message) => {
                window.e2eSentActs.push(String(message.act));
                return send(message);
            };
        });
        let groupsActsPrefixes = [TeamsConst.TEAM_PREF, TeamsConst.CLAN_PREF];
        await owner.page.click(Selectors.hud.clanOpen);
        await owner.page.locator(Selectors.clans.disbandAction).click();
        expect(
            (await owner.page.evaluate(() => window.e2eSentActs)).filter(
                act => groupsActsPrefixes.some(actPrefix => 0 === act.indexOf(actPrefix))
            ),
            'The clan button sends only the clan leave'
        ).toEqual([TeamsConst.ACTIONS.CLAN_LEAVE]);
        await expect.poll(async () => (await ClanSteps.fetchStoredClans(gameConfig, {id: seeded.clanId})).length, {
            message: 'The clan button disbands the clan',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toBe(0);
        await TeamSteps.expectTeams(gameConfig, [[ownerId, TeamSteps.sortedIds(players)]], 'The team is kept');
    }

    static run()
    {
        test.describe('Clans Sessions', () => {
            test('clan leave button of a player whose id is its clan id acts on the clan only', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansSessions.runSharedLeaveClassTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('member reload keeps the membership and the last member offline unloads the clan', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansSessions.runDisconnectsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('member changing the scene keeps the clan panel and the modifier once', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansSessions.runSceneChangeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('owner remove and disband reach the members in another scene', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansSessions.runOtherSceneRemovesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('accepted line reaches the owner on a clan first loaded by a member', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansSessions.runMemberLoadedClanTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('accepted line reaches the owner after its scene change', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansSessions.runOwnerSceneChangeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('login shows the clan panel after the UI scene and the create form with no clan', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansSessions.runLoginPanelTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestClansSessions.run();
