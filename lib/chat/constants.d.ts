/**
 * Reldens - ChatConst
 * Precise literal types generated from the runtime constant object
 * (/tmp/claude-1000/-home-kadajett-Dev-reldensResearch/17fbbf2d-6441-4d7f-8631-7ba0d6609de2/scratchpad/reldens-beta/lib/chat/constants.js) at v4.0.0-beta.39.9. No `any`.
 */
export declare const ChatConst: {
    ROOM_TYPE_CHAT: "chat";
    CHAT_ACTION: "c";
    TYPES: {
        KEY: "ctk";
        MESSAGE: 1;
        JOINED: 2;
        SYSTEM: 3;
        PRIVATE: 4;
        DAMAGE: 5;
        REWARD: 6;
        SKILL: 7;
        TEAMS: 8;
        GLOBAL: 9;
        ERROR: 10;
    };
    CHAT_FROM: "f";
    CHAT_TO: "t";
    CHAT_UI: "chat-ui";
    CHAT_FORM: "chat-form";
    CHAT_INPUT: "chat-input";
    CHAT_SEND_BUTTON: "chat-send";
    CHAT_CLOSE_BUTTON: "chat-close";
    CHAT_OPEN_BUTTON: "chat-open";
    CHAT_BALLOON: "notification-balloon";
    CHAT_GLOBAL: "chat";
    MESSAGE: {
        KEY: "m";
        FROM: "f";
        TO: "t";
        DATA: {
            KEY: "md";
            SNIPPET: "sp";
            PLAYER_NAME: "pn";
            ROOM_NAME: "rn";
            DAMAGE: "d";
            TARGET_LABEL: "tL";
            SKILL_LABEL: "sk";
            MODIFIERS: "mfs";
            SECONDS: "sec";
        };
        DATA_VALUES: {
            NAMESPACE: "chat";
            pn: "playerName";
            rn: "roomName";
            d: "damage";
            tL: "targetLabel";
            sk: "skillLabel";
            mfs: "modifiers";
            sec: "seconds";
        };
    };
    SNIPPETS: {
        PREFIX: "chat.";
        PLAYER_PREFIX: "player.";
        TAB_PREFIX: "tabs.";
        NPC_DAMAGE: "chat.npcDamage";
        NPC_DODGED_SKILL: "chat.dodgedSkill";
        MODIFIERS_APPLY: "chat.modifiersApply";
        JOINED_ROOM: "chat.joinedRoom";
        LEFT_ROOM: "chat.leftRoom";
        PRIVATE_MESSAGE_PLAYER_NOT_FOUND: "chat.playerNotFound";
        GLOBAL_MESSAGE_NOT_ALLOWED: "chat.globalMessageNotAllowed";
        GLOBAL_MESSAGE_PERMISSION_DENIED: "chat.globalMessagePermissionDenied";
        PLAYER: {
            DAMAGE: "chat.player.damage";
            DODGED_SKILL: "chat.player.dodgedSkill";
        };
        GUEST_INVALID_CHANGE_POINT: "chat.guestInvalidChangePoint";
        ROOM_CLOSING: "chat.roomClosing";
        WAITING: "...";
    };
    SELECTORS: {
        CONTENTS: "#chat-contents";
        CHAT_MESSAGES: "#chat-messages";
        TAB_CONTENT_PREFIX: ".tab-content-";
        TAB_CONTENT_ACTIVE: ".tab-content.active";
    };
    TYPE_COLOR: {
        "1": "#ffffff";
        "3": "#2ecc71";
        "4": "#f39c12";
        "5": "#ff0000";
        "6": "#2ecc71";
        "8": "#2ecc71";
        "9": "#ffff00";
        "10": "#ff0000";
        "4.to": "#00afff";
        "3.modifiers": "#0feeff";
    };
};
