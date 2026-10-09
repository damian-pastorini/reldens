/**
 *
 * Reldens - Test Clan Level Modifiers
 *
 */

const { BaseTest } = require('./base-test');
const { Clan } = require('../lib/teams/server/clan');
const { ClanFactory } = require('../lib/teams/server/clan-factory');
const { OfflineMemberModifiersReverter } = require('../lib/teams/server/offline-member-modifiers-reverter');
const { ClanLeave } = require('../lib/teams/server/message-actions/clan-leave');
const { ClanJoin } = require('../lib/teams/server/message-actions/clan-join');
const { ChatMessageActions } = require('../lib/teams/server/message-actions/chat-message-actions');
const { Modifier } = require('@reldens/modifiers');
const { EventsManager } = require('@reldens/utils');

class TestClanLevelModifiers extends BaseTest
{

    createLevelModel()
    {
        return {
            id: 1,
            key: 1,
            label: '1',
            related_clan_levels_modifiers: [
                {id: 1, level_id: 1, key: 'clan_atk', property_key: 'stats/atk', operation: 1, value: '10'}
            ]
        };
    }

    createClan()
    {
        return new Clan({
            id: 10,
            owner: {player_id: '1', playerName: 'ImRoot'},
            modifiers: ClanFactory.mapModifiersFromLevelModel(this.createLevelModel())
        });
    }

    createPlayerSchema()
    {
        return {player_id: '1', stats: {atk: 100}, statsBase: {atk: 100}, privateData: {clan: 10}};
    }

    createDeletionsRecorder(entityKey, deletedRows)
    {
        return {
            delete: async (filters) => deletedRows.push({entityKey, filters}),
            deleteById: async (id) => deletedRows.push({entityKey, id})
        };
    }

    createClanJoinDataServer(recordedCalls)
    {
        return {
            getEntity: (entityKey) => Object.assign(this.createDeletionsRecorder(entityKey, recordedCalls), {
                create: async (row) => recordedCalls.push({entityKey, created: row}),
                loadOneWithRelations: async (filters) => Object.assign({related_players: {name: 'ImRoot'}}, filters)
            })
        };
    }

    createOwnerSchema()
    {
        let ownerSchema = this.createPlayerSchema();
        ownerSchema.playerName = 'ImRoot';
        ownerSchema.state = {room_id: 1};
        ownerSchema.persistData = async () => true;
        ownerSchema.getPrivate = (key) => ownerSchema.privateData[key];
        ownerSchema.setPrivate = (key, value) => {
            ownerSchema.privateData[key] = value;
        };
        return ownerSchema;
    }

    createOwnedClanWithOfflineMember(ownerSchema)
    {
        let clan = new Clan({
            id: 10,
            owner: {player_id: '1', playerName: 'ImRoot'},
            members: {1: {player_id: 1}, 2: {player_id: 2}}
        });
        clan.join(ownerSchema, {send: () => true}, {player_id: 1});
        return clan;
    }

    createOfflineMemberReverter(statsRows, playerStatsRows, updatedStats)
    {
        return new OfflineMemberModifiersReverter({
            getEntity: (entityKey) => 'stats' === entityKey
                ? {loadAll: async () => statsRows}
                : {
                    loadBy: async () => playerStatsRows,
                    updateById: async (id, patch) => updatedStats.push({id, patch})
                }
        });
    }

    async testTheLevelModifiersAreMappedFromTheLevelModel()
    {
        await this.test('the clan level modifiers are created from the level model', async () => {
            let modifiers = ClanFactory.mapModifiersFromLevelModel(this.createLevelModel());
            this.assert.deepStrictEqual(Object.keys(modifiers), ['1']);
            this.assert.strictEqual(modifiers[1] instanceof Modifier, true);
            this.assert.strictEqual(modifiers[1].propertyKey, 'stats/atk');
        });
    }

    async testALevelWithoutModifiersMapsNone()
    {
        await this.test('a clan level without modifiers maps an empty modifiers set', async () => {
            this.assert.deepStrictEqual(ClanFactory.mapModifiersFromLevelModel({id: 1, key: 1}), {});
        });
    }

    async testTheNewMemberGetsTheLevelModifiers()
    {
        await this.test('a new clan member gets the clan level modifiers applied', async () => {
            let playerSchema = this.createPlayerSchema();
            this.createClan().addMember(playerSchema, {}, {player_id: 1, clan_id: 10});
            this.assert.strictEqual(playerSchema.stats.atk, 110);
        });
    }

    async testTheSessionJoinDoesNotApplyTheModifiersAgain()
    {
        await this.test('the login and scene change join does not apply the saved modifiers again', async () => {
            let playerSchema = this.createPlayerSchema();
            let clan = this.createClan();
            clan.addMember(playerSchema, {}, {player_id: 1, clan_id: 10});
            clan.disconnect(playerSchema);
            clan.join(playerSchema, {}, {player_id: 1, clan_id: 10});
            this.assert.strictEqual(playerSchema.stats.atk, 110);
        });
    }

    async testLeavingTheClanRevertsTheModifiers()
    {
        await this.test('leaving the clan reverts the clan level modifiers and removes the membership', async () => {
            let playerSchema = this.createPlayerSchema();
            let clan = this.createClan();
            clan.addMember(playerSchema, {}, {player_id: 1, clan_id: 10});
            clan.leave(playerSchema);
            this.assert.strictEqual(playerSchema.stats.atk, 100);
            this.assert.deepStrictEqual(clan.members, {});
            this.assert.strictEqual(playerSchema.privateData.clan, false);
        });
    }

    async testTheOfflineMemberStoredStatsAreReverted()
    {
        await this.test('the stored stats of a member removed while offline get the modifiers reverted', async () => {
            let updatedStats = [];
            let reverter = this.createOfflineMemberReverter(
                [{id: 1, key: 'hp'}, {id: 3, key: 'atk'}],
                [
                    {id: 21, player_id: 2, stat_id: 1, base_value: 100, value: 80},
                    {id: 23, player_id: 2, stat_id: 3, base_value: 100, value: 110}
                ],
                updatedStats
            );
            let result = await reverter.revert('2', this.createClan().modifiers);
            this.assert.strictEqual(result, true);
            this.assert.deepStrictEqual(updatedStats, [
                {id: 21, patch: {value: 80, base_value: 100}},
                {id: 23, patch: {value: 100, base_value: 100}}
            ]);
        });
    }

    async testTheOfflineMemberStoredBaseStatsAreReverted()
    {
        await this.test('the stored base stats of a member removed while offline get the modifiers reverted', async () => {
            let updatedStats = [];
            let reverter = this.createOfflineMemberReverter(
                [{id: 3, key: 'atk'}],
                [{id: 23, player_id: 2, stat_id: 3, base_value: 110, value: 110}],
                updatedStats
            );
            let levelModel = this.createLevelModel();
            levelModel.related_clan_levels_modifiers[0].property_key = 'statsBase/atk';
            let result = await reverter.revert('2', ClanFactory.mapModifiersFromLevelModel(levelModel));
            this.assert.strictEqual(result, true);
            this.assert.deepStrictEqual(updatedStats, [{id: 23, patch: {value: 110, base_value: 100}}]);
        });
    }

    async testTheOwnerDisbandRemovesTheOfflineMembers()
    {
        await this.test('the owner disband removes the online and the offline members and deletes the clan', async () => {
            let events = new EventsManager();
            let savedChatMessages = [];
            new ChatMessageActions({
                events,
                chatPlugin: {chatManager: {saveMessage: async (message) => savedChatMessages.push(message)}}
            }).clanMemberLeavingEventListener();
            let deletedRows = [];
            let teamsPlugin = {
                events,
                clans: {},
                dataServer: {getEntity: (entityKey) => this.createDeletionsRecorder(entityKey, deletedRows)}
            };
            let ownerSchema = this.createOwnerSchema();
            teamsPlugin.clans[10] = this.createOwnedClanWithOfflineMember(ownerSchema);
            this.assert.strictEqual(await ClanLeave.execute(ownerSchema, teamsPlugin, '1'), true);
            this.assert.deepStrictEqual(deletedRows, [
                {entityKey: 'clanMembers', filters: {player_id: 1, clan_id: 10}},
                {entityKey: 'clanMembers', filters: {player_id: 2, clan_id: 10}},
                {entityKey: 'clan', id: 10}
            ]);
            this.assert.deepStrictEqual(teamsPlugin.clans, {});
            this.assert.deepStrictEqual(savedChatMessages, ['ImRoot has disbanded the clan.']);
        });
    }

    async testTheOwnerJoiningAnotherClanDisbandsTheOwnedClan()
    {
        await this.test('the owner accepting another clan invite disbands the owned clan and joins the new one', async () => {
            let recordedCalls = [];
            let ownerSchema = this.createOwnerSchema();
            let newClan = new Clan({id: 20, owner: {player_id: '3', playerName: 'ImRoot3'}, pendingInvites: {1: true}});
            let teamsPlugin = {
                events: new EventsManager(),
                clans: {10: this.createOwnedClanWithOfflineMember(ownerSchema), 20: newClan},
                dataServer: this.createClanJoinDataServer(recordedCalls)
            };
            await ClanJoin.execute({send: () => true}, {id: 20}, {}, ownerSchema, teamsPlugin);
            this.assert.deepStrictEqual(recordedCalls, [
                {entityKey: 'clanMembers', filters: {player_id: 1, clan_id: 10}},
                {entityKey: 'clanMembers', filters: {player_id: 2, clan_id: 10}},
                {entityKey: 'clan', id: 10},
                {entityKey: 'clanMembers', created: {player_id: '1', clan_id: 20}}
            ]);
            this.assert.deepStrictEqual(Object.keys(teamsPlugin.clans), ['20']);
            this.assert.strictEqual(ownerSchema.privateData.clan, 20);
            this.assert.deepStrictEqual(Object.keys(newClan.members), ['1']);
        });
    }

}

module.exports.TestClanLevelModifiers = TestClanLevelModifiers;
