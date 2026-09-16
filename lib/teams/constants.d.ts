/**
 * Reldens - TeamsConst
 * Precise literal types generated from the runtime constant object
 * (/tmp/claude-1000/-home-kadajett-Dev-reldensResearch/17fbbf2d-6441-4d7f-8631-7ba0d6609de2/scratchpad/reldens-beta/lib/teams/constants.js) at v4.0.0-beta.39.9. No `any`.
 */
export declare const TeamsConst: {
    KEY: "teams";
    CLAN_KEY: "clan";
    TEAM_PREF: "tm.";
    CLAN_PREF: "cln.";
    NAME_LIMIT: 50;
    CLAN_STARTING_POINTS: 1;
    VALIDATION: {
        SUCCESS: 1;
        NAME_EXISTS: 2;
        LEVEL_ISSUE: 3;
        CREATE_ERROR: 4;
        CREATE_OWNER_ERROR: 5;
    };
    ACTIONS: {
        TEAM_INVITE: "tm.inv";
        TEAM_ACCEPTED: "tm.acp";
        TEAM_LEAVE: "tm.lev";
        TEAM_UPDATE: "tm.upd";
        TEAM_LEFT: "tm.lef";
        TEAM_REMOVE: "tm.rem";
        CLAN_INITIALIZE: "cln.ini";
        CLAN_CREATE: "cln.new";
        CLAN_INVITE: "cln.inv";
        CLAN_ACCEPTED: "cln.acp";
        CLAN_LEAVE: "cln.lev";
        CLAN_UPDATE: "cln.upd";
        CLAN_LEFT: "cln.lef";
        CLAN_REMOVE: "cln.rem";
        CLAN_REMOVED: "cln.remd";
        CLAN_NAME: "cln.nam";
    };
    LABELS: {
        TEAM: {
            INVITE_BUTTON_LABEL: "Team - Invite";
            REQUEST_FROM: "Accept team request from:";
            LEADER_NAME_TITLE: "Team leader: %leaderName";
            DISBAND: "Disband Team";
            LEAVE: "Leave Team";
            PROPERTY_MAX_VALUE: "/ %propertyMaxValue";
        };
        CLAN: {
            CREATE_CLAN_TITLE: "Clan - Creation";
            INVITE_BUTTON_LABEL: "Clan - Invite";
            REQUEST_FROM: "Accept clan request from:";
            CLAN_TITLE: "Clan: %clanName - Leader: %leaderName";
            NAME_PLACEHOLDER: "Choose a clan name...";
            CREATE: "Create";
            DISBAND: "Disband Clan";
            LEAVE: "Leave Clan";
            PROPERTY_MAX_VALUE: "/ %propertyMaxValue";
            PLAYERS_TITLE: "Connected Players:";
            MEMBERS_TITLE: "Clan Members:";
            NONE_CONNECTED: "None";
        };
    };
    CHAT: {
        MESSAGE: {
            INVITE_ACCEPTED: "%playerName has accepted your invitation.";
            INVITE_REJECTED: "%playerName has rejected your invitation.";
            DISBANDED: "%playerName has disbanded the %groupName.";
            LEFT: "You left the %groupName.";
            LEAVE: "%playerName has left the %groupName.";
            REMOVED: "%playerName has been removed from the %groupName.";
            ENTER: "%playerName has enter the %groupName.";
            NOT_ENOUGH_PLAYERS: "The team was disbanded due to a lack of players.";
        };
    };
};
