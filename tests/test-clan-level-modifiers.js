/**
 *
 * Reldens - Test Clan Level Modifiers
 *
 */

const { BaseTest } = require('./base-test');
const { ClanFixturesBuilder } = require('./fixtures/clan-fixtures-builder');
const { Clan } = require('../lib/teams/server/clan');
const { ClanFactory } = require('../lib/teams/server/clan-factory');
const { ClanLeave } = require('../lib/teams/server/message-actions/clan-leave');
const { ClanJoin } = require('../lib/teams/server/message-actions/clan-join');
const { ChatMessageActions } = require('../lib/teams/server/message-actions/chat-message-actions');
const { TeamsConst } = require('../lib/teams/constants');
const { Modifier } = require('@reldens/modifiers');
const { EventsManager } = require('@reldens/utils');

class TestClanLevelModifiers extends BaseTest
{

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

    async testTheLevelModifiersAreMappedFromTheLevelModel()
    {
        await this.test('the clan level modifiers are created from the level model', async () => {
            let modifiers = ClanFactory.mapModifiersFromLevelModel(ClanFixturesBuilder.createLevelModel());
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

    async testTheJoinAppliesTheLevelModifiers()
    {
        await this.test('joining the clan applies the clan level modifiers', async () => {
            let playerSchema = ClanFixturesBuilder.createPlayerSchema();
            ClanFixturesBuilder.createClan().join(playerSchema, {}, {player_id: 1, clan_id: 10});
            this.assert.strictEqual(playerSchema.stats.atk, 110);
        });
    }

    async testTheDisconnectRevertsTheModifiers()
    {
        await this.test('the clan disconnection reverts the clan level modifiers', async () => {
            let playerSchema = ClanFixturesBuilder.createPlayerSchema();
            let clan = ClanFixturesBuilder.createClan();
            clan.join(playerSchema, {}, {player_id: 1, clan_id: 10});
            clan.disconnect(playerSchema);
            this.assert.strictEqual(playerSchema.stats.atk, 100);
            this.assert.strictEqual(playerSchema.privateData.clan, false);
            this.assert.deepStrictEqual(clan.players, {});
        });
    }

    async testLeavingTheClanRevertsTheModifiers()
    {
        await this.test('leaving the clan reverts the clan level modifiers and removes the membership', async () => {
            let playerSchema = ClanFixturesBuilder.createPlayerSchema();
            let clan = ClanFixturesBuilder.createClan();
            clan.join(playerSchema, {}, {player_id: 1, clan_id: 10});
            clan.leave(playerSchema);
            this.assert.strictEqual(playerSchema.stats.atk, 100);
            this.assert.deepStrictEqual(Object.keys(clan.members), ['2']);
            this.assert.strictEqual(playerSchema.privateData.clan, false);
        });
    }

    async testTheClanFactoryDoesNotJoinThePlayer()
    {
        await this.test('loading a clan does not join the player so the modifiers are applied by the join only', async () => {
            let playerSchema = ClanFixturesBuilder.createPlayerSchema();
            let teamsPlugin = {
                clans: {},
                dataServer: {
                    getEntity: () => ({loadByIdWithRelations: async () => ClanFixturesBuilder.createClanModel()})
                }
            };
            let clan = await ClanFactory.create(10, playerSchema, {}, {}, teamsPlugin);
            this.assert.deepStrictEqual(clan.players, {});
            this.assert.strictEqual(playerSchema.stats.atk, 100);
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
            let teamsPlugin = ClanFixturesBuilder.createTeamsPlugin({
                events,
                dataServer: {
                    getEntity: (entityKey) => ClanFixturesBuilder.createDeletionsRecorder(entityKey, deletedRows)
                }
            });
            let ownerSchema = ClanFixturesBuilder.createOwnerSchema();
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

    createClanWithOnlineMembers(chatLines)
    {
        let events = new EventsManager();
        new ChatMessageActions({
            events,
            chatPlugin: {chatManager: {saveMessage: async () => true}}
        }).clanMemberLeavingEventListener();
        let clan = new Clan({id: 10, owner: {player_id: '1', playerName: 'ImRoot'}});
        let schemas = {};
        for(let playerId of ['1', '2', '3']){
            schemas[playerId] = ClanFixturesBuilder.createOwnerSchema(playerId, 'ImRoot'+('1' === playerId ? '' : playerId));
            chatLines[playerId] = [];
            let client = ClanFixturesBuilder.createChatRecordingClient(chatLines[playerId]);
            clan.join(schemas[playerId], client, {player_id: Number(playerId)});
        }
        return {
            schemas,
            teamsPlugin: ClanFixturesBuilder.createTeamsPlugin({
                events,
                clans: {10: clan},
                dataServer: ClanFixturesBuilder.createClanJoinDataServer([])
            })
        };
    }

    async testEveryMemberGetsTheDisbandedLineOfTheOwner()
    {
        await this.test('the owner disband sends every member the disbanded line with the owner name', async () => {
            let chatLines = {};
            let clanSetup = this.createClanWithOnlineMembers(chatLines);
            this.assert.strictEqual(await ClanLeave.execute(clanSetup.schemas[1], clanSetup.teamsPlugin, '1'), true);
            let disbandedLine = ['ImRoot has disbanded the clan.'];
            this.assert.deepStrictEqual(chatLines, {1: disbandedLine, 2: disbandedLine, 3: disbandedLine});
        });
    }

    async testALeavingMemberGetsTheLeftLineAndARemovedMemberTheRemovedLine()
    {
        await this.test('a member leaving gets the left line and a member removed by the owner the removed line', async () => {
            let chatLines = {};
            let clanSetup = this.createClanWithOnlineMembers(chatLines);
            await ClanLeave.fromMessage({act: TeamsConst.ACTIONS.CLAN_LEAVE, id: 10}, clanSetup.schemas[2], clanSetup.teamsPlugin);
            await ClanLeave.fromMessage(
                {act: TeamsConst.ACTIONS.CLAN_REMOVE, id: 10, remove: '3'},
                clanSetup.schemas[1],
                clanSetup.teamsPlugin
            );
            this.assert.deepStrictEqual(chatLines, {
                1: [],
                2: ['ImRoot2 has left the clan.'],
                3: ['ImRoot3 has been removed from the clan.']
            });
            this.assert.deepStrictEqual(Object.keys(clanSetup.teamsPlugin.clans[10].members), ['1']);
        });
    }

    async testTheOwnerRemoveOfItsOwnNumericIdDisbandsTheClan()
    {
        await this.test('the owner remove of its own id sent as a number disbands the clan', async () => {
            let chatLines = {};
            let clanSetup = this.createClanWithOnlineMembers(chatLines);
            await ClanLeave.fromMessage(
                {act: TeamsConst.ACTIONS.CLAN_REMOVE, id: 10, remove: 1},
                clanSetup.schemas[1],
                clanSetup.teamsPlugin
            );
            this.assert.deepStrictEqual(clanSetup.teamsPlugin.clans, {});
            this.assert.deepStrictEqual(chatLines[2], ['ImRoot has disbanded the clan.']);
            this.assert.strictEqual(clanSetup.schemas[3].privateData.clan, false);
        });
    }

    async testACancelledJoinUpdateSavesNoPlayerData()
    {
        await this.test('a cancelled clan players update stops the join before the player data save', async () => {
            let persistedActs = [];
            let joiningSchema = ClanFixturesBuilder.createOwnerSchema('2', 'ImRoot2');
            joiningSchema.privateData.clan = false;
            joiningSchema.persistData = async (params) => persistedActs.push(params.act);
            let events = new EventsManager();
            events.on('reldens.beforeClanUpdatePlayers', (event) => {
                event.continueBeforeJoinUpdate = false;
            });
            let clan = new Clan({id: 20, owner: {player_id: '3', playerName: 'ImRoot3'}, pendingInvites: {2: true}});
            let teamsPlugin = ClanFixturesBuilder.createTeamsPlugin({
                events,
                clans: {20: clan},
                dataServer: ClanFixturesBuilder.createClanJoinDataServer([])
            });
            this.assert.strictEqual(await ClanJoin.execute({send: () => true}, {id: 20}, {}, joiningSchema, teamsPlugin), false);
            this.assert.deepStrictEqual(persistedActs, []);
            this.assert.deepStrictEqual(Object.keys(clan.members), ['2']);
        });
    }

    async testTheOwnerJoinReplacesTheOwnerClient()
    {
        await this.test('the owner joining the clan becomes the owner client and a member join keeps it', async () => {
            let loaderClient = {send: () => true};
            let clan = new Clan({id: 10, owner: {player_id: 1, playerName: 'ImRoot'}, ownerClient: loaderClient});
            clan.join(ClanFixturesBuilder.createPlayerSchema('2'), loaderClient, {player_id: 2});
            this.assert.strictEqual(clan.ownerClient, loaderClient);
            let ownerClient = {send: () => true};
            clan.join(ClanFixturesBuilder.createPlayerSchema('1'), ownerClient, {player_id: 1});
            this.assert.strictEqual(clan.ownerClient, ownerClient);
            this.assert.strictEqual(clan.clients[1], ownerClient);
        });
    }

    async testTheOwnerJoiningAnotherClanDisbandsTheOwnedClan()
    {
        await this.test('the owner accepting another clan invite disbands the owned clan and joins the new one', async () => {
            let recordedCalls = [];
            let ownerSchema = ClanFixturesBuilder.createOwnerSchema();
            let newClan = new Clan({id: 20, owner: {player_id: '3', playerName: 'ImRoot3'}, pendingInvites: {1: true}});
            let teamsPlugin = ClanFixturesBuilder.createTeamsPlugin({
                events: new EventsManager(),
                clans: {10: this.createOwnedClanWithOfflineMember(ownerSchema), 20: newClan},
                dataServer: ClanFixturesBuilder.createClanJoinDataServer(recordedCalls)
            });
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
