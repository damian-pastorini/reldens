/**
 *
 * Reldens - UserEntities
 *
 */

const { UsersModel } = require('./model');
const { StatsModel } = require('./stats-model');
const { PlayersModel } = require('./players-model');
const { PlayersStatsModel } = require('./players-stats-model');
const { PlayersStateModel } = require('./players-state-model');

let rawRegisteredEntities = {
    users: UsersModel,
    players: PlayersModel,
    playerStats: PlayersStatsModel,
    playerState: PlayersStateModel,
    stats: StatsModel
};

let parentItemLabel = 'Users';
let icon = 'User';

let entitiesConfig = {
    users: {
        parentItemLabel,
        icon,
        listProperties: ['id', 'email', 'username', 'status', 'updated_at'],
        showProperties: ['id', 'email', 'username', 'status', 'updated_at'],
        filterProperties: ['id', 'email', 'username', 'status', 'role_id', 'updated_at'],
        editProperties: ['email', 'username', 'password', 'status', 'role_id'],
        properties: {
            id: {},
            email: {},
            username: {},
            password: {
                type: 'password'
            },
            role_id: {},
            status: {},
            created_at: {
                type: 'date'
            },
            updated_at: {
                type: 'date'
            }
        }
    },
    players: {
        parentItemLabel,
        listProperties: ['id', 'name', 'user_id', 'created_at'],
        showProperties: ['id', 'name', 'user_id', 'created_at'],
        filterProperties: ['id', 'name', 'user_id', 'created_at'],
        editProperties: ['name', 'user_id'],
        properties: {
            id: {},
            name: {},
            user_id: {
                type: 'reference',
                reference: 'users'
            },
            created_at: {
                type: 'date'
            }
        }
    },
    playerStats: {
        parentItemLabel,
        listProperties: ['id', 'player_id', 'stat_id', 'base_value', 'value'],
        showProperties: ['id', 'player_id', 'stat_id', 'base_value', 'value'],
        filterProperties: ['id', 'player_id', 'stat_id', 'base_value', 'value'],
        editProperties: ['base_value', 'value'],
        properties: {
            id: {},
            player_id: {
                label: 'Player',
                type: 'reference',
                reference: 'players'
            },
            stat_id: {
                type: 'reference',
                reference: 'stats'
            },
            base_value: {},
            value: {},
        }
    },
    playerState: {
        parentItemLabel,
        listProperties: ['id', 'player_id', 'room_id', 'x', 'y', 'dir'],
        showProperties: ['id', 'player_id', 'room_id', 'x', 'y', 'dir'],
        filterProperties: ['id', 'player_id', 'room_id', 'x', 'y', 'dir'],
        editProperties: ['room_id', 'x', 'y', 'dir'],
        properties: {
            id: {},
            player_id: {
                label: 'Player',
                type: 'reference',
                reference: 'players'
            },
            room_id: {},
            x: {},
            y: {},
            dir: {}
        }
    },
    stats: {
        parentItemLabel,
        listProperties: ['id', 'key', 'label', 'description', 'base_value'],
        showProperties: ['id', 'key', 'label', 'description', 'base_value', 'customData'],
        filterProperties: ['id', 'key', 'label', 'description', 'base_value'],
        editProperties: ['key', 'label', 'description', 'base_value', 'customData'],
        properties: {
            id: {},
            key: {},
            label: {
                isTitle: true
            },
            description: {},
            base_value: {},
            customData: {},
        }
    }
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;
