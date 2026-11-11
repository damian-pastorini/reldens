/**
 *
 * Reldens - Test Teams Invites
 *
 * Tests the team invites between the group players in their scene (TeamSteps, the team messages sent like a client
 * does and the live teams and pending invites of the server): a declined invite is consumed and the inviter gets the
 * rejected line, also when declined from the request box option; the accept option forms the team; a
 * decline or an accept with no pending invite, a second accept, a self invite, an accept with the own id, an invite to
 * a player that left and an accept after the inviter left are rejected; two inviters give one request box each; only
 * the invited player gets the box; the invite from the target box hides the button and clears the target, and no
 * invite button is shown for the own player; a decline followed by a tampered accept and a decline with the inviter
 * gone consume the invite; and an invite kept over the inviter new login is still accepted.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { ChatSteps } = require('./helpers/chat-steps');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ChatConst } = require('../../lib/chat/constants');
const { TeamsConst } = require('../../lib/teams/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeamsInvites
{

    static SETTLE_MS = 1500;

    static async enter(context, playersCount = 2)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 1), context.longRun));
        return await TeamSteps.enterPlayers(context, playersCount);
    }

    static requestBox(inviter)
    {
        return '#box-'+TeamsConst.KEY+inviter.playerId;
    }

    static async expectState(gameConfig, expectedState, message)
    {
        await new Promise(resolve => setTimeout(resolve, TestTeamsInvites.SETTLE_MS));
        let state = await TeamSteps.fetchState(gameConfig);
        let pendingInvites = Object.keys(state.pendingInvites).filter(
            inviterId => 0 < state.pendingInvites[inviterId].length
        ).reduce((invites, inviterId) => Object.assign(invites, {[inviterId]: state.pendingInvites[inviterId]}), {});
        expect({teams: state.teams, pendingInvites}, message).toEqual(expectedState);
    }

    static async runDeclineTest(context)
    {
        let players = await TestTeamsInvites.enter(context);
        await TeamSteps.invite(players[0], players[1]);
        await TeamSteps.waitForInvite(context.gameConfig, players[0], players[1]);
        await TeamSteps.answer(players[1], players[0], TeamSteps.DECLINE);
        await expect.poll(async () => await ChatSteps.fetchTexts(players[0].page, ChatConst.TYPES.TEAMS), {
            message: 'The inviter gets the rejected line',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual([TeamsConst.CHAT.MESSAGE.INVITE_REJECTED.replace('%playerName', players[1].playerName)]);
        await TestTeamsInvites.expectState(context.gameConfig, {teams: {}, pendingInvites: {}}, 'Consumed');
        await TeamSteps.answer(players[1], players[0], TeamSteps.ACCEPT);
        await TestTeamsInvites.expectState(context.gameConfig, {teams: {}, pendingInvites: {}}, 'Accept after decline');
    }

    static async runDeclineOptionTest(context)
    {
        let players = await TestTeamsInvites.enter(context);
        await TeamSteps.invite(players[0], players[1]);
        let requestBox = players[1].page.locator(TestTeamsInvites.requestBox(players[0]));
        await expect(requestBox, 'The request box is shown').toBeVisible({timeout: TimeConstants.SERVER_RESPONSE});
        await players[1].page.locator('[id^="opt-decline-'+TeamsConst.KEY+players[0].playerId+'"]').click();
        await expect.poll(async () => await ChatSteps.fetchTexts(players[0].page, ChatConst.TYPES.TEAMS), {
            message: 'The decline option sends the decline',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual([TeamsConst.CHAT.MESSAGE.INVITE_REJECTED.replace('%playerName', players[1].playerName)]);
    }

    static async runAcceptOptionTest(context)
    {
        let players = await TestTeamsInvites.enter(context);
        await Phaser.waitForPlayerBySessionId(players[1].page, players[0].sessionId, TimeConstants.SCENE_LOAD);
        await CombatSkillCasting.targetPlayer(players[1].page, players[0].sessionId);
        await players[1].page.evaluate(
            (targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId),
            players[0].sessionId
        );
        await expect(players[1].page.locator(Selectors.teams.invite(players[0].playerId)), 'The invite button is shown')
            .toBeVisible({timeout: TimeConstants.SERVER_RESPONSE});
        await TeamSteps.invite(players[0], players[1]);
        await players[1].page.locator(Selectors.teams.acceptOption).first().click({timeout: TimeConstants.SERVER_RESPONSE});
        await TeamSteps.expectTeams(context.gameConfig, [[players[0].playerId, TeamSteps.sortedIds(players)]], 'The team is formed');
    }

    static async runRejectedMessagesTest(context)
    {
        let players = await TestTeamsInvites.enter(context);
        await TeamSteps.answer(players[1], players[0], TeamSteps.DECLINE);
        await TeamSteps.answer(players[1], players[0], TeamSteps.ACCEPT);
        await TeamSteps.invite(players[0], players[0]);
        await TeamSteps.answer(players[0], players[0], TeamSteps.ACCEPT);
        await TestTeamsInvites.expectState(context.gameConfig, {teams: {}, pendingInvites: {}}, 'No answer without invite and no self invite');
        expect(await ChatSteps.fetchTexts(players[0].page, ChatConst.TYPES.TEAMS), 'No rejected line').toEqual([]);
        await TeamSteps.invite(players[0], players[1]);
        await TeamSteps.waitForInvite(context.gameConfig, players[0], players[1]);
        await TeamSteps.answer(players[1], players[0], TeamSteps.ACCEPT);
        await TeamSteps.answer(players[1], players[0], TeamSteps.ACCEPT);
        let ownerId = players[0].playerId;
        await TestTeamsInvites.expectState(context.gameConfig, {
            teams: {[ownerId]: {ownerId, playersIds: [players[0].playerId, players[1].playerId].sort((idA, idB) => idA - idB)}},
            pendingInvites: {}
        }, 'A second accept changes nothing');
    }

    static async runLeftPlayersTest(context)
    {
        let players = await TestTeamsInvites.enter(context);
        await players[1].page.reload();
        await TeamSteps.invite(players[0], players[1]);
        await TestTeamsInvites.expectState(context.gameConfig, {teams: {}, pendingInvites: {}}, 'An invite to a player that left');
        await Login.loginRootPlayer(players[1].page, context.gameConfig, context.longRun, '2');
        await TeamSteps.invite(players[0], players[1]);
        await TeamSteps.waitForInvite(context.gameConfig, players[0], players[1]);
        await players[0].page.reload();
        await TeamSteps.answer(players[1], players[0], TeamSteps.ACCEPT);
        await TestTeamsInvites.expectState(context.gameConfig, {teams: {}, pendingInvites: {}}, 'Accept after the inviter left');
    }

    static async runTwoInvitersTest(context)
    {
        let players = await TestTeamsInvites.enter(context, 3);
        await TeamSteps.invite(players[0], players[1]);
        await TeamSteps.invite(players[2], players[1]);
        for(let inviter of [players[0], players[2]]){
            await expect(players[1].page.locator(TestTeamsInvites.requestBox(inviter)), 'One box per inviter').toBeVisible({
                timeout: TimeConstants.SERVER_RESPONSE
            });
            await expect(players[1].page.locator(TestTeamsInvites.requestBox(inviter)), 'The inviter name').toContainText(inviter.playerName);
        }
        for(let otherPlayer of [players[0], players[2]]){
            await expect(otherPlayer.page.locator('[id^="box-'+TeamsConst.KEY+'"]'), 'No box for the others').toHaveCount(0);
        }
    }

    static async runTargetBoxTest(context)
    {
        let players = await TestTeamsInvites.enter(context);
        await Phaser.waitForPlayerBySessionId(players[0].page, players[1].sessionId, TimeConstants.SCENE_LOAD);
        await players[0].page.evaluate(
            (targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId),
            players[0].sessionId
        );
        await players[0].page.waitForTimeout(TestTeamsInvites.SETTLE_MS);
        await expect(players[0].page.locator(Selectors.teams.invite(players[0].playerId)), 'No invite button for the own player')
            .toHaveCount(0);
        await players[0].page.evaluate(
            (targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId),
            players[1].sessionId
        );
        let inviteButton = players[0].page.locator(Selectors.teams.invite(players[1].playerId));
        await inviteButton.click({timeout: TimeConstants.SERVER_RESPONSE});
        await expect(inviteButton, 'The invite button hides').toBeHidden();
        expect(await players[0].page.evaluate(() => window.reldens.getCurrentPlayer().currentTarget), 'The target is cleared')
            .toBe(false);
        await TeamSteps.waitForInvite(context.gameConfig, players[0], players[1]);
    }

    static async runConsumedInvitesTest(context)
    {
        let players = await TestTeamsInvites.enter(context);
        await TeamSteps.invite(players[0], players[1]);
        await TeamSteps.waitForInvite(context.gameConfig, players[0], players[1]);
        await players[0].page.reload();
        await TeamSteps.answer(players[1], players[0], TeamSteps.DECLINE);
        await TestTeamsInvites.expectState(context.gameConfig, {teams: {}, pendingInvites: {}}, 'Declined with the inviter gone');
    }

    static async runKeptInviteTest(context)
    {
        let players = await TestTeamsInvites.enter(context);
        await TeamSteps.invite(players[0], players[1]);
        await TeamSteps.waitForInvite(context.gameConfig, players[0], players[1]);
        await players[0].page.reload();
        await Login.loginRootPlayer(players[0].page, context.gameConfig, context.longRun);
        await TeamSteps.answer(players[1], players[0], TeamSteps.ACCEPT);
        await TeamSteps.expectTeams(context.gameConfig, [[players[0].playerId, TeamSteps.sortedIds(players)]], 'The team is formed');
    }

    static run()
    {
        test.describe('Teams Invites', () => {
            test('declined invite is consumed and the inviter gets the rejected line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsInvites.runDeclineTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('decline option sends the decline', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsInvites.runDeclineOptionTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('accept option forms the team', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsInvites.runAcceptOptionTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('answers without invite, self invites and a second accept are rejected', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsInvites.runRejectedMessagesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('invite to a player that left and accept after the inviter left are rejected', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsInvites.runLeftPlayersTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two inviters give one request box each only to the invited player', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsInvites.runTwoInvitersTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('target box invite hides the button and clears the target', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsInvites.runTargetBoxTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('decline with the inviter gone consumes the invite', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsInvites.runConsumedInvitesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('invite kept over the inviter new login is accepted', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsInvites.runKeptInviteTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTeamsInvites.run();
