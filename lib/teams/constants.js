/**
 *
 * Reldens - teams/constants
 *
 */

let pref = 'tm.'
let clanPref = 'cl.';

module.exports.TeamsConst = {
    KEY: 'teams',
    CLAN_KEY: 'clan',
    TEAM_PREF: pref,
    CLAN_PREF: clanPref,
    ACTIONS: {
        // @TODO - BETA - Standardize generic actions and use dots to split, like UPDATE = '.up', REMOVE = '.rm', etc.
        TEAM_INVITE: pref+'inv',
        TEAM_ACCEPTED: pref+'acp',
        TEAM_LEAVE: pref+'lev',
        TEAM_UPDATE: pref+'upd',
        TEAM_LEFT: pref+'lef',
        TEAM_REMOVE: pref+'rem',
        CLAN_INVITE: clanPref+'inv',
        CLAN_ACCEPTED: clanPref+'acp',
        CLAN_LEAVE: clanPref+'lev',
        CLAN_UPDATE: clanPref+'upd',
    },
    LABELS: {
        INVITE_BUTTON_LABEL: 'Team - Invite',
        TEAM_REQUEST_FROM: 'Accept team request from:',
        LEADER_NAME_TITLE: 'Team leader: %leaderName',
        DISBAND: 'Disband Team',
        LEAVE: 'Leave Team',
        PROPERTY_MAX_VALUE: '/ %propertyMaxValue'
    }
};
