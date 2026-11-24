/**
 *
 * Reldens - Test Message Actions Guards
 *
 * Tests the guards of the inventory and team message actions: the routers reject a non string action, the equip and use
 * of a missing or wrong item are rejected, an inactive player and a locked inventory refuse the inventory actions, a
 * declined trade invite is consumed, and the team join, remove and leave guards. The player trades are tested in
 * TestPlayerTradeExchanges and the clan removals in TestClanInviteGuards.
 *
 */

const { BaseTest } = require('./base-test');
const { ClanFixturesBuilder } = require('./fixtures/clan-fixtures-builder');
const { PlayerTradeBuilder } = require('./fixtures/player-trade-builder');
const { InventoryMessageActions } = require('../lib/inventory/server/message-actions');
const { InventoryConst } = require('../lib/inventory/constants');
const { GameConst } = require('../lib/game/constants');
const { TeamJoin } = require('../lib/teams/server/message-actions/team-join');
const { TeamLeave } = require('../lib/teams/server/message-actions/team-leave');
const { TeamsConst } = require('../lib/teams/constants');

class TestMessageActionsGuards extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.tradeBuilder = new PlayerTradeBuilder();
    }

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
        return ClanFixturesBuilder.createTeamsPlugin({
            events: {emit: async () => true},
            dataServer: {getEntity: () => ({delete: async () => true, deleteById: async () => true})},
            teams,
            clans,
            teamPendingInvites: {}
        });
    }

    createTeamWithThreePlayers(sentMessages)
    {
        let owner = this.createPlayer(1, 1);
        let team = ClanFixturesBuilder.createSyncedTeam({owner, ownerClient: this.createClient(sentMessages)});
        let memberA = this.createPlayer(2, 1);
        let memberB = this.createPlayer(3, 1);
        team.join(memberA, this.createClient(sentMessages));
        team.join(memberB, this.createClient(sentMessages));
        return {team, owner, memberA, memberB};
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

    async testEquipOfAMissingItemIsRejected()
    {
        await this.test('the equip of an item key that is not in the inventory is rejected', async () => {
            let playerSchema = {player_id: 1, inventory: {manager: {items: {}}}};
            let messageActions = new InventoryMessageActions();
            let missingResult = await messageActions.executeEquipAction(playerSchema, {'idx': 'missing-item'});
            this.assert.strictEqual(missingResult, false);
            let prototypeResult = await messageActions.executeEquipAction(playerSchema, {'idx': '__proto__'});
            this.assert.strictEqual(prototypeResult, false);
        });
    }

    async testEquipOfANonEquipmentItemIsRejected()
    {
        await this.test('the equip of an item that is not an equipment is rejected and changes nothing', async () => {
            let equippedSword = {group_id: 1, equipped: true, unequip: async () => equippedSword.equipped = false};
            let potion = {group_id: 1, use: async () => true};
            let playerSchema = {player_id: 1, inventory: {manager: {items: {sword: equippedSword, potion}}}};
            let result = await new InventoryMessageActions().executeEquipAction(playerSchema, {'idx': 'potion'});
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(equippedSword.equipped, true);
        });
    }

    async testUseOfANonUsableItemIsRejected()
    {
        await this.test('the use of an item that is not usable is rejected', async () => {
            let playerSchema = {
                player_id: 1,
                inventory: {manager: {items: {sword: {group_id: 1, equipped: false}}}},
                isDeath: () => false,
                isDisabled: () => false
            };
            let data = {act: InventoryConst.ACTIONS.USE, 'idx': 'sword'};
            let result = await new InventoryMessageActions().executeMessageActions({}, data, {}, playerSchema);
            this.assert.strictEqual(result, false);
        });
    }

    createRecordingInventoryManager(calledActions)
    {
        return {
            items: {
                potion: {use: async () => calledActions.push('use')},
                axe: {equip: async () => calledActions.push('equip')}
            },
            removeItem: async () => calledActions.push('remove'),
            toggleEquip: async () => calledActions.push('toggleEquip')
        };
    }

    createInactivePlayer(isDeath, calledActions)
    {
        return {
            player_id: 1,
            sessionId: 'session1',
            inventory: {manager: this.createRecordingInventoryManager(calledActions)},
            isDeath: () => isDeath,
            isDisabled: () => !isDeath
        };
    }

    async testInactivePlayerInventoryActionsAreRefused()
    {
        await this.test('a dead or disabled player can not use, equip, start or accept a trade, it can trash and close a trade', async () => {
            let calledActions = [];
            let sentMessages = [];
            let refusedActions = [
                {act: InventoryConst.ACTIONS.USE, 'idx': 'potion'},
                {act: InventoryConst.ACTIONS.EQUIP, 'idx': 'axe'},
                {act: InventoryConst.ACTIONS.TRADE_START, id: 'session2'},
                {act: InventoryConst.ACTIONS.TRADE_ACCEPTED, value: '1', id: 'session2'}
            ];
            let allowedActions = [
                {act: InventoryConst.ACTIONS.REMOVE, 'idx': 'potion'},
                {act: GameConst.CLOSE_UI_ACTION, id: 'trade-session2'}
            ];
            let results = [];
            let allowedResults = [];
            for(let isDeath of [true, false]){
                let playerSchema = this.createInactivePlayer(isDeath, calledActions);
                let room = this.tradeBuilder.createTradeRoom(this.createPlayer(2, false), sentMessages);
                let client = this.createClient(sentMessages);
                results.push(...await this.runInventoryActions(client, refusedActions, room, playerSchema));
                allowedResults.push(...await this.runInventoryActions(client, allowedActions, room, playerSchema));
            }
            this.assert.deepStrictEqual(results, refusedActions.concat(refusedActions).map(() => false));
            this.assert.deepStrictEqual([calledActions, sentMessages], [['remove', 'remove'], []]);
            this.assert.deepStrictEqual(allowedResults, [true, true, true, true]);
        });
    }

    createActivePlayer(calledActions, isLocked)
    {
        let playerSchema = this.createInactivePlayer(false, calledActions);
        playerSchema.isDisabled = () => false;
        playerSchema.inventory.manager.locked = isLocked;
        return playerSchema;
    }

    async testLockedInventoryRefusesUseAndEquip()
    {
        await this.test('a player with its inventory locked by a trade can not use or equip, it can still trash', async () => {
            let calledActions = [];
            let results = await this.runInventoryActions({}, [
                {act: InventoryConst.ACTIONS.USE, 'idx': 'potion'},
                {act: InventoryConst.ACTIONS.EQUIP, 'idx': 'axe'},
                {act: InventoryConst.ACTIONS.REMOVE, 'idx': 'potion'}
            ], {}, this.createActivePlayer(calledActions, true));
            this.assert.deepStrictEqual([results, calledActions], [[false, false, true], ['remove']]);
        });
    }

    async runInventoryActions(client, actionsData, room, playerSchema)
    {
        let results = [];
        for(let data of actionsData){
            results.push(await new InventoryMessageActions().executeMessageActions(client, data, room, playerSchema));
        }
        return results;
    }

    async testDeclinedInviteIsConsumed()
    {
        await this.test('a declined trade invite is consumed and its exchange cancelled, a decline not invited changes nothing', async () => {
            let cancelledExchanges = [];
            let starter = {
                sessionId: 'session2',
                tradeInvitedSessionId: 'session1',
                tradeInProgress: {cancelExchange: () => cancelledExchanges.push(true)}
            };
            let room = {playerBySessionIdFromState: () => starter};
            let playerSchema = this.createActivePlayer([], false);
            let declineData = {act: InventoryConst.ACTIONS.TRADE_ACCEPTED, value: '2', id: 'session2'};
            await new InventoryMessageActions().executeMessageActions({}, declineData, room, playerSchema);
            await new InventoryMessageActions().executeMessageActions({}, declineData, room, playerSchema);
            this.assert.deepStrictEqual([starter.tradeInvitedSessionId, cancelledExchanges], [false, [true]]);
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

    async testMemberLeaveWithNoRemoveIdRemovesTheMember()
    {
        await this.test('a member leave with no remove ID (disconnect or another team accept) removes only that member', async () => {
            let sentMessages = [];
            let teamData = this.createTeamWithThreePlayers(sentMessages);
            let teamsPlugin = this.createTeamsPlugin({1: teamData.team}, {});
            await TeamLeave.execute({}, teamData.memberA, teamsPlugin);
            this.assert.deepStrictEqual(Object.keys(teamData.team.players).sort(), ['1', '3']);
            this.assert.deepStrictEqual([teamData.memberA.currentTeam, teamData.memberB.currentTeam], [false, 1]);
            this.assert.strictEqual(Object.keys(teamsPlugin.teams).length, 1);
        });
    }

    async testOwnerLeaveWithNoRemoveIdDisbandsTheTeam()
    {
        await this.test('the owner leave with no remove ID disbands the team', async () => {
            let sentMessages = [];
            let teamData = this.createTeamWithThreePlayers(sentMessages);
            let teamsPlugin = this.createTeamsPlugin({1: teamData.team}, {});
            await TeamLeave.execute({}, teamData.owner, teamsPlugin);
            this.assert.deepStrictEqual(Object.keys(teamData.team.players), []);
            this.assert.strictEqual(Object.keys(teamsPlugin.teams).length, 0);
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

}

module.exports.TestMessageActionsGuards = TestMessageActionsGuards;
