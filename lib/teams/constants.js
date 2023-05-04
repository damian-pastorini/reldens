/**
 *
 * Reldens - teams/constants
 *
 */

let pref = 'tm.'
let clanPref = 'cln.';

module.exports.TeamsConst = {
    KEY: 'teams',
    CLAN_KEY: 'clan',
    TEAM_PREF: pref,
    CLAN_PREF: clanPref,
    NAME_LIMIT: 50,
    CLAN_STARTING_POINTS: 1,
    VALIDATION: {
        SUCCESS: 1,
        NAME_EXISTS: 2,
        LEVEL_ISSUE: 3,
        CREATE_ERROR: 4,
        CREATE_OWNER_ERROR: 5
    },
    ACTIONS: {
        // @TODO - BETA - Standardize generic actions and use dots to split, like UPDATE = '.up', REMOVE = '.rm', etc.
        TEAM_INVITE: pref+'inv',
        TEAM_ACCEPTED: pref+'acp',
        TEAM_LEAVE: pref+'lev',
        TEAM_UPDATE: pref+'upd',
        TEAM_LEFT: pref+'lef',
        TEAM_REMOVE: pref+'rem',
        CLAN_INITIALIZE: clanPref+'ini',
        CLAN_CREATE: clanPref+'new',
        CLAN_INVITE: clanPref+'inv',
        CLAN_ACCEPTED: clanPref+'acp',
        CLAN_LEAVE: clanPref+'lev',
        CLAN_UPDATE: clanPref+'upd',
        CLAN_LEFT: clanPref+'lef',
        CLAN_REMOVE: clanPref+'rem',
        CLAN_REMOVED: clanPref+'remd',
        CLAN_NAME: clanPref+'nam'
    },
    LABELS: {
        TEAM: {
            INVITE_BUTTON_LABEL: 'Team - Invite',
            REQUEST_FROM: 'Accept team request from:',
            LEADER_NAME_TITLE: 'Team leader: %leaderName',
            DISBAND: 'Disband Team',
            LEAVE: 'Leave Team',
            PROPERTY_MAX_VALUE: '/ %propertyMaxValue'
        },
        CLAN: {
            CREATE_CLAN_TITLE: 'Clan - Creation',
            INVITE_BUTTON_LABEL: 'Clan - Invite',
            REQUEST_FROM: 'Accept clan request from:',
            CLAN_TITLE: 'Clan: %clanName - Leader: %leaderName',
            NAME_PLACEHOLDER: 'Choose a clan name...',
            CREATE: 'Create',
            DISBAND: 'Disband Clan',
            LEAVE: 'Leave Clan',
            PROPERTY_MAX_VALUE: '/ %propertyMaxValue',
            PLAYERS_TITLE: 'Connected Players:',
            MEMBERS_TITLE: 'Clan Members:',
            NONE_CONNECTED: 'None'
        }
    },
    CHAT: {
        MESSAGE: {
            INVITE_ACCEPTED: '%playerName has accepted your invitation.',
            INVITE_REJECTED: '%playerName has rejected your invitation.',
            DISBANDED: '%playerName has disbanded the %groupName.',
            LEFT: 'You left the %groupName.',
            LEAVE: '%playerName has left the %groupName.',
            ENTER: '%playerName has enter the %groupName.',
            NOT_ENOUGH_PLAYERS: 'The team was disbanded due to a lack of players.'
        }
    }
};
