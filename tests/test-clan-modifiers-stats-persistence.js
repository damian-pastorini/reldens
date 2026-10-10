/**
 *
 * Reldens - Test Clan Modifiers Stats Persistence
 *
 */

const { BaseTest } = require('./base-test');
const { ClanFixturesBuilder } = require('./fixtures/clan-fixtures-builder');
const { ClanLeave } = require('../lib/teams/server/message-actions/clan-leave');
const { TeamsPlugin } = require('../lib/teams/server/plugin');
const { RoomScene } = require('../lib/rooms/server/scene');
const { EventsManager } = require('@reldens/utils');

class TestClanModifiersStatsPersistence extends BaseTest
{

    createRoom(events, savedStats)
    {
        let room = Object.create(RoomScene.prototype);
        room.events = events;
        room.config = {client: {players: {initialStats: {atk: {id: 3}}}}};
        room.loginManager = {usersManager: {
            updatePlayerStatByIds: async (playerId, statId, statPatch) => savedStats.push({playerId, statId, statPatch})
        }};
        return room;
    }

    async createSavingSetup()
    {
        let events = new EventsManager();
        let clan = ClanFixturesBuilder.createClan();
        let savedStats = [];
        let teamsPlugin = new TeamsPlugin();
        await teamsPlugin.setup({
            events,
            clans: {10: clan},
            dataServer: ClanFixturesBuilder.createClanJoinDataServer([]),
            config: {get: () => ({})},
            featuresManager: {featuresList: {}}
        });
        return {clan, savedStats, teamsPlugin, room: this.createRoom(events, savedStats)};
    }

    async saveAndLoadStats(savingSetup, playerSchema)
    {
        await savingSetup.room.savePlayerStats(playerSchema);
        return ClanFixturesBuilder.createPlayerSchema(
            playerSchema.player_id,
            savingSetup.savedStats.pop().statPatch.value
        );
    }

    async testTheSavedStatsDoNotKeepTheClanModifiers()
    {
        await this.test('the stats of a clan member are saved without the clan modifiers', async () => {
            let savingSetup = await this.createSavingSetup();
            let playerSchema = ClanFixturesBuilder.createPlayerSchema();
            savingSetup.clan.join(playerSchema, {}, {player_id: 1, clan_id: 10});
            await savingSetup.room.savePlayerStats(playerSchema);
            this.assert.deepStrictEqual(savingSetup.savedStats, [
                {playerId: '1', statId: 3, statPatch: {value: 100, base_value: 100}}
            ]);
            this.assert.strictEqual(playerSchema.stats.atk, 110);
        });
    }

    async testTheStatsOutsideTheClanAreSavedAsTheyAre()
    {
        await this.test('the stats of a player not joined to the clan players are saved as they are', async () => {
            let savingSetup = await this.createSavingSetup();
            await savingSetup.room.savePlayerStats(ClanFixturesBuilder.createPlayerSchema('1', 120));
            this.assert.strictEqual(savingSetup.savedStats.pop().statPatch.value, 120);
        });
    }

    async testEveryLoginAppliesTheModifiersOnce()
    {
        await this.test('every login applies the clan modifiers once over the saved stats', async () => {
            let savingSetup = await this.createSavingSetup();
            let playerSchema = ClanFixturesBuilder.createPlayerSchema();
            let loginsStats = [];
            for(let login of [1, 2, 3]){
                savingSetup.clan.join(playerSchema, {}, {player_id: login, clan_id: 10});
                loginsStats.push(playerSchema.stats.atk);
                let loggedOutSchema = playerSchema;
                playerSchema = await this.saveAndLoadStats(savingSetup, loggedOutSchema);
                savingSetup.clan.disconnect(loggedOutSchema);
            }
            this.assert.deepStrictEqual(loginsStats, [110, 110, 110]);
            this.assert.strictEqual(playerSchema.stats.atk, 100);
        });
    }

    async testTheSceneChangeAppliesTheModifiersOnce()
    {
        await this.test('the scene changes keep the clan modifiers applied once when the new room joins first', async () => {
            let savingSetup = await this.createSavingSetup();
            let previousSceneSchema = ClanFixturesBuilder.createPlayerSchema();
            savingSetup.clan.join(previousSceneSchema, {}, {player_id: 1, clan_id: 10});
            let scenesStats = [];
            let storedAtk = 100;
            for(let sceneChange of [1, 2, 3]){
                let nextSceneSchema = ClanFixturesBuilder.createPlayerSchema('1', storedAtk);
                savingSetup.clan.join(nextSceneSchema, {}, {player_id: sceneChange, clan_id: 10});
                await savingSetup.room.savePlayerStats(previousSceneSchema);
                storedAtk = savingSetup.savedStats.pop().statPatch.value;
                scenesStats.push([nextSceneSchema.stats.atk, storedAtk]);
                previousSceneSchema = nextSceneSchema;
            }
            this.assert.deepStrictEqual(scenesStats, [[110, 100], [110, 100], [110, 100]]);
        });
    }

    async testTheClanDisbandedWhileOfflineLeavesNoModifiers()
    {
        await this.test('a member offline while the clan is disbanded logs in without the clan modifiers', async () => {
            let savingSetup = await this.createSavingSetup();
            let memberSchema = ClanFixturesBuilder.createPlayerSchema('2');
            savingSetup.clan.join(memberSchema, {}, {player_id: 2, clan_id: 10});
            let loginSchema = await this.saveAndLoadStats(savingSetup, memberSchema);
            savingSetup.clan.disconnect(memberSchema);
            let ownerSchema = ClanFixturesBuilder.createOwnerSchema();
            savingSetup.clan.join(ownerSchema, {send: () => true}, {player_id: 1});
            await ClanLeave.execute(ownerSchema, savingSetup.teamsPlugin, '1');
            await savingSetup.teamsPlugin.createPlayerClanHandler.enrichPlayerWithClan(
                {send: () => true},
                loginSchema,
                {},
                savingSetup.teamsPlugin
            );
            this.assert.deepStrictEqual(savingSetup.teamsPlugin.clans, {});
            this.assert.strictEqual(loginSchema.stats.atk, 100);
        });
    }

    async testTheOnlineMemberRemovedSavesTheStatsWithoutTheModifiers()
    {
        await this.test('a member online while the clan is disbanded gets the clan modifiers reverted and saved', async () => {
            let savingSetup = await this.createSavingSetup();
            let memberSchema = ClanFixturesBuilder.createPlayerSchema('2');
            memberSchema.persistData = async () => await savingSetup.room.savePlayerStats(memberSchema);
            savingSetup.clan.join(memberSchema, {send: () => true}, {player_id: 2, clan_id: 10});
            let ownerSchema = ClanFixturesBuilder.createOwnerSchema();
            savingSetup.clan.join(ownerSchema, {send: () => true}, {player_id: 1});
            await ClanLeave.execute(ownerSchema, savingSetup.teamsPlugin, '1');
            this.assert.strictEqual(memberSchema.stats.atk, 100);
            this.assert.strictEqual(memberSchema.privateData.clan, false);
            this.assert.strictEqual(savingSetup.savedStats.pop().statPatch.value, 100);
        });
    }

}

module.exports.TestClanModifiersStatsPersistence = TestClanModifiersStatsPersistence;
