/**
 *
 * Reldens - ClanFixturesBuilder
 *
 */

const { Clan } = require('../../lib/teams/server/clan');
const { ClanFactory } = require('../../lib/teams/server/clan-factory');

class ClanFixturesBuilder
{

    static createLevelModel()
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

    static createClanModel()
    {
        return {
            id: 10,
            owner_id: 1,
            name: 'Test Clan',
            points: 0,
            related_players: {id: 1, name: 'ImRoot'},
            related_clan_members: [{player_id: 1}, {player_id: 2}],
            related_clan_levels: this.createLevelModel()
        };
    }

    static createClan()
    {
        return new Clan({
            id: 10,
            owner: {player_id: '1', playerName: 'ImRoot'},
            members: {1: {player_id: 1}, 2: {player_id: 2}},
            modifiers: ClanFactory.mapModifiersFromLevelModel(this.createLevelModel())
        });
    }

    static createPlayerSchema(playerId = '1', atk = 100)
    {
        return {player_id: playerId, stats: {atk}, statsBase: {atk: 100}, privateData: {clan: 10}};
    }

    static createOwnerSchema()
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

    static createDeletionsRecorder(entityKey, deletedRows)
    {
        return {
            delete: async (filters) => deletedRows.push({entityKey, filters}),
            deleteById: async (id) => deletedRows.push({entityKey, id})
        };
    }

    static createClanJoinDataServer(recordedCalls)
    {
        return {
            getEntity: (entityKey) => Object.assign(this.createDeletionsRecorder(entityKey, recordedCalls), {
                create: async (row) => recordedCalls.push({entityKey, created: row}),
                loadOneWithRelations: async (filters) => Object.assign({related_players: {name: 'ImRoot'}}, filters),
                loadOneByWithRelations: async () => false
            })
        };
    }

}

module.exports.ClanFixturesBuilder = ClanFixturesBuilder;
