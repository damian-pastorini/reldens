/**
 *
 * Reldens - Test Message Actions Guards
 *
 */

const { BaseTest } = require('./base-test');
const { InventoryMessageActions } = require('../lib/inventory/server/message-actions');
const { InventoryConst } = require('../lib/inventory/constants');
const { ObjectsConst } = require('../lib/objects/constants');
const { TeamJoin } = require('../lib/teams/server/message-actions/team-join');
const { TeamLeave } = require('../lib/teams/server/message-actions/team-leave');
const { ClanLeave } = require('../lib/teams/server/message-actions/clan-leave');
const { Team } = require('../lib/teams/server/team');
const { Clan } = require('../lib/teams/server/clan');
const { TeamsConst } = require('../lib/teams/constants');

class TestMessageActionsGuards extends BaseTest
{

    createClient(sentMessages)
    {
        return {send: (type, message) => sentMessages.push(message)};
    }

    createPlayer(playerId, currentTeam)
    {
        return {
            player_id: playerId,
            playerName: 'player'+playerId,
            sessionId: 'session'+playerId,
            currentTeam
        };
    }

    createTeamsPlugin(teams, clans)
    {
        return {
            events: {emit: async () => true},
            dataServer: {getEntity: () => ({delete: async () => true, deleteById: async () => true})},
            teams,
            clans,
            teamPendingInvites: {}
        };
    }

    createTeamWithThreePlayers(sentMessages)
    {
        let owner = this.createPlayer(1, 1);
        let team = new Team({owner, ownerClient: this.createClient(sentMessages)});
        let memberA = this.createPlayer(2, 1);
        let memberB = this.createPlayer(3, 1);
        team.join(memberA, this.createClient(sentMessages));
        team.join(memberB, this.createClient(sentMessages));
        return {team, owner, memberA, memberB};
    }

    createTradeRoom(starterPlayer, sentMessages)
    {
        return {
            roomId: 'room-1',
            activePlayerBySessionId: () => ({client: this.createClient(sentMessages)}),
            playerBySessionIdFromState: () => starterPlayer
        };
    }

    createClanOwner(clanId)
    {
        return {
            player_id: 1,
            playerName: 'player1',
            sessionId: 'session1',
            privateData: {clan: clanId},
            getPrivate: () => clanId
        };
    }

    async testRoutersRejectNonStringAction()
    {
        await this.test('the message routers reject a non-string action', async () => {
            let sentMessages = [];
            let client = this.createClient(sentMessages);
            let playerSchema = this.createPlayer(1, false);
            let message = {act: 123};
            let inventoryResult = await new InventoryMessageActions().executeMessageActions(
                client,
                message,
                {},
                playerSchema
            );
            this.assert.strictEqual(inventoryResult, false);
            this.assert.strictEqual(sentMessages.length, 0);
        });
    }

    async testTeamJoinWithoutInviteIsRejected()
    {
        await this.test('a player cannot join a team without an invite', async () => {
            let sentMessages = [];
            let teamsPlugin = this.createTeamsPlugin({}, {});
            let playerSchema = this.createPlayer(2, false);
            let data = {act: TeamsConst.ACTIONS.TEAM_ACCEPTED, value: '1', id: 1};
            let result = await TeamJoin.execute(this.createClient(sentMessages), data, {}, playerSchema, teamsPlugin);
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(playerSchema.currentTeam, false);
            this.assert.strictEqual(Object.keys(teamsPlugin.teams).length, 0);
        });
    }

    async testTeamRemoveByNonOwnerIsRejected()
    {
        await this.test('a team member who is not the owner cannot remove other members', async () => {
            let sentMessages = [];
            let teamData = this.createTeamWithThreePlayers(sentMessages);
            let teamsPlugin = this.createTeamsPlugin({1: teamData.team}, {});
            let data = {act: TeamsConst.ACTIONS.TEAM_REMOVE, id: 2, remove: 3};
            let result = await TeamLeave.fromMessage(data, {}, teamData.memberA, teamsPlugin);
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(Object.keys(teamData.team.players).includes('3'), true);
            this.assert.strictEqual(teamData.memberB.currentTeam, 1);
        });
    }

    async testTeamLeaveWithRemoveByNonOwnerOnlyRemovesTheSender()
    {
        await this.test('a team leave sent by a member with a remove ID only removes the sender', async () => {
            let sentMessages = [];
            let teamData = this.createTeamWithThreePlayers(sentMessages);
            let teamsPlugin = this.createTeamsPlugin({1: teamData.team}, {});
            let data = {act: TeamsConst.ACTIONS.TEAM_LEAVE, id: 1, remove: 3};
            await TeamLeave.fromMessage(data, {}, teamData.memberA, teamsPlugin);
            this.assert.strictEqual(Object.keys(teamData.team.players).includes('3'), true);
            this.assert.strictEqual(Object.keys(teamData.team.players).includes('2'), false);
            this.assert.strictEqual(teamData.memberA.currentTeam, false);
        });
    }

    async testTeamRemoveOfNonMemberIsRejected()
    {
        await this.test('the team owner cannot remove a player that is not a team member', async () => {
            let sentMessages = [];
            let teamData = this.createTeamWithThreePlayers(sentMessages);
            let teamsPlugin = this.createTeamsPlugin({1: teamData.team}, {});
            let data = {act: TeamsConst.ACTIONS.TEAM_REMOVE, id: 1, remove: 99};
            let result = await TeamLeave.fromMessage(data, {}, teamData.owner, teamsPlugin);
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(Object.keys(teamData.team.players).length, 3);
        });
    }

    async testTradeAcceptWithoutInviteIsRejected()
    {
        await this.test('a trade cannot be accepted without an invite from the starter', async () => {
            let sentMessages = [];
            let initializedExchanges = [];
            let starterPlayer = {
                sessionId: 'session1',
                tradeInvitedSessionId: 'session3',
                tradeInProgress: {initializeExchangeBetween: (props) => initializedExchanges.push(props)}
            };
            let room = this.createTradeRoom(starterPlayer, sentMessages);
            let data = {act: InventoryConst.ACTIONS.TRADE_ACCEPTED, value: '1', id: 'session1'};
            let result = new InventoryMessageActions().startExchange(
                this.createClient(sentMessages),
                data,
                room,
                {sessionId: 'session2'}
            );
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(initializedExchanges.length, 0);
            this.assert.strictEqual(sentMessages.length, 0);
        });
    }

    createTradePlayer(sessionId, tradeInProgress)
    {
        return {
            sessionId,
            playerName: 'player-'+sessionId,
            tradeInProgress,
            inventory: {
                manager: {findItemsByPropertyValue: () => []},
                client: {extractItemsDataForSend: () => ({})}
            }
        };
    }

    createTradeInProgress(initializedExchanges)
    {
        let tradeInProgress = {
            confirmations: {A: false, B: false},
            exchangeBetween: {A: {}, B: {}},
            inventories: {}
        };
        tradeInProgress.initializeExchangeBetween = (props) => {
            initializedExchanges.push(props);
            tradeInProgress.inventories = {A: {owner: {sessionId: 'session1'}}, B: {owner: {sessionId: 'session2'}}};
        };
        return tradeInProgress;
    }

    async testTheTradeInviteIsNotReusableAfterTheAccept()
    {
        await this.test('a trade invite cannot be accepted a second time', async () => {
            let sentMessages = [];
            let initializedExchanges = [];
            let tradeInProgress = this.createTradeInProgress(initializedExchanges);
            let starterPlayer = this.createTradePlayer('session1', tradeInProgress);
            starterPlayer.tradeInvitedSessionId = 'session2';
            let invitedPlayer = this.createTradePlayer('session2', false);
            let room = this.createTradeRoom(starterPlayer, sentMessages);
            let data = {act: InventoryConst.ACTIONS.TRADE_ACCEPTED, value: '1', id: 'session1'};
            let messageActions = new InventoryMessageActions();
            let client = this.createClient(sentMessages);
            this.assert.strictEqual(messageActions.startExchange(client, data, room, invitedPlayer), true);
            this.assert.strictEqual(messageActions.startExchange(client, data, room, invitedPlayer), false);
            // @possible-hallucinated-undefined-method
            this.assert.strictEqual(initializedExchanges.length, 1);
        });
    }

    async testTradeActionWithoutTradeInProgressIsRejected()
    {
        await this.test('a trade action without a trade in progress is rejected', async () => {
            let sentMessages = [];
            let room = this.createTradeRoom(false, sentMessages);
            let data = {
                act: InventoryConst.ACTIONS.TRADE_ACTION,
                sub: ObjectsConst.TRADE_ACTIONS.ADD,
                id: 'session1'
            };
            let result = await new InventoryMessageActions().runTradeAction(
                this.createClient(sentMessages),
                data,
                room,
                {sessionId: 'session2', tradeInProgress: null}
            );
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(sentMessages.length, 0);
        });
    }

    async testClanRemoveOfNonMember()
    {
        await this.test('the clan owner removal skips non-members', async () => {
            let sentMessages = [];
            let clanOwner = this.createClanOwner(10);
            let clan = new Clan({
                id: 10,
                owner: {player_id: 1, playerName: 'player1'},
                players: {1: clanOwner},
                clients: {1: this.createClient(sentMessages)},
                members: {1: {related_players: {name: 'player1'}}, 2: {related_players: {name: 'player2'}}}
            });
            let teamsPlugin = this.createTeamsPlugin({}, {10: clan});
            let nonMemberData = {act: TeamsConst.ACTIONS.CLAN_REMOVE, id: 10, remove: '99'};
            await ClanLeave.fromMessage(nonMemberData, clanOwner, teamsPlugin);
            this.assert.strictEqual(Object.keys(clan.members).length, 2);
        });
    }

}

module.exports.TestMessageActionsGuards = TestMessageActionsGuards;
