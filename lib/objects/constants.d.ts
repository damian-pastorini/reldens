/**
 * Reldens - ObjectsConst
 * Precise literal types generated from the runtime constant object
 * (/tmp/claude-1000/-home-kadajett-Dev-reldensResearch/17fbbf2d-6441-4d7f-8631-7ba0d6609de2/scratchpad/reldens-beta/lib/objects/constants.js) at v4.0.0-beta.39.9. No `any`.
 */
export declare const ObjectsConst: {
    OBJECT_ANIMATION: "oa";
    OBJECT_INTERACTION: "oi";
    TYPE_OBJECT: "obj";
    TYPE_ANIMATION: "anim";
    TYPE_NPC: "npc";
    TYPE_ENEMY: "enemy";
    TYPE_TRADER: "trader";
    TYPE_DROP: "drop";
    DYNAMIC_ANIMATION: "dyn";
    MESSAGE: {
        DATA_VALUES: {
            NAMESPACE: "objects";
        };
    };
    EVENT_PREFIX: {
        BASE: "bo";
        ANIMATION: "ao";
        DROP: "dep";
        ENEMY: "eo";
        NPC: "npc";
        TRADER: "tnpc";
    };
    SNIPPETS: {
        PREFIX: "objects.";
        NPC_INVALID: "objects.npcInvalid";
        TRADER: {
            CONTENT: "objects.trader.content";
            OPTIONS: {
                BUY: "objects.trader.options.buy";
                SELL: "objects.trader.options.sell";
            };
            BUY_CONFIRMED: "objects.trader.buyConfirmed";
            SELL_CONFIRMED: "objects.trader.sellConfirmed";
        };
    };
    DEFAULTS: {
        BASE_OBJECT: {
            CONTENT: "";
            OPTIONS: Record<string, never>;
        };
        TRADER_OBJECT: {
            INVENTORY_MAP: {
                buy: "A";
                sell: "B";
            };
            OPTIONS: {
                BUY: "buy";
                SELL: "sell";
            };
        };
        TARGETS: {
            OBJECT: 0;
            PLAYER: 1;
        };
    };
    TRADE_ACTIONS_FUNCTION_NAME: {
        ADD: "add";
        REMOVE: "remove";
        CONFIRM: "confirm";
        DISCONFIRM: "disconfirm";
        CANCEL: "cancel";
    };
    TRADE_ACTIONS: {
        SUB_ACTION: "sub";
        ADD: "ta";
        REMOVE: "tr";
        CONFIRM: "tc";
        DISCONFIRM: "td";
    };
    DROPS: {
        KEY: "drp";
        REMOVE: "drmv";
        PARAMS: "drpp";
        ASSET_KEY: "dk";
        PICK_UP_ACT: "rpu";
        ASSETS_PATH: "/assets/custom/sprites/";
        FILE: "df";
        TYPE: "dt";
    };
};
