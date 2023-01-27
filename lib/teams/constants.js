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
        TEAM_DECLINED: pref+'dec',
        TEAM_LEAVE: pref+'lev',
        TEAM_UPDATE: pref+'upd'
    },
    LABELS: {
        INVITE_BUTTON_LABEL: 'Team - Invite',
        TEAM_REQUEST_FROM: 'Team request from:',
        LEADER_NAME_TITLE: 'Team leader: %leaderName',
        DISBAND: 'Disband Team',
        ACCEPT_FROM_PLAYER: 'Accept team invite from player %playerName:'
    }
};
