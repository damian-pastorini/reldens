/**
 *
 * Reldens - teams/constants
 *
 */

let pref = 'tm.'

module.exports.TeamsConst = {
    KEY: 'teams',
    CLAN_KEY: 'clan',
    TEAM_PREF: pref,
    ACTIONS: {
        TEAM_INVITE: pref+'inv',
        TEAM_ACCEPTED: pref+'acp',
        TEAM_LEAVE: pref+'lev',
        TEAM_UPDATE: pref+'upd'
    },
    LABELS: {
        INVITE_BUTTON_LABEL: 'Team - Invite',
        TEAM_REQUEST_FROM: 'Accept team request from:',
        LEADER_NAME_TITLE: 'Team leader: %leaderName',
        DISBAND: 'Disband Team',
        PROPERTY_MAX_VALUE: '/ %propertyMaxValue'
    }
};
