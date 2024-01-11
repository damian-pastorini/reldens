/**
 *
 * Reldens - ObjectsConst
 *
 */

let snippetsPrefix = 'objects.';

module.exports.ObjectsConst = {
    OBJECT_ANIMATION: 'oa',
    OBJECT_INTERACTION: 'oi',
    TYPE_OBJECT: 'obj',
    TYPE_ANIMATION: 'anim',
    TYPE_NPC: 'npc',
    TYPE_ENEMY: 'enemy',
    TYPE_TRADER: 'trader',
    TYPE_DROP: 'drop',
    DYNAMIC_ANIMATION: 'dyn',
    MESSAGE: {
        DATA_VALUES: {
            NAMESPACE: 'objects'
        }
    },
    EVENT_PREFIX: {
        BASE: 'bo',
        ANIMATION: 'ao',
        DROP: 'dep',
        ENEMY: 'eo',
        NPC: 'npc',
        TRADER: 'tnpc'
    },
    SNIPPETS: {
        PREFIX: snippetsPrefix,
        NPC_INVALID: snippetsPrefix+'npcInvalid',
        TRADER: {
            CONTENT: snippetsPrefix+'trader.content',
            OPTIONS: {
                BUY: snippetsPrefix+'trader.options.buy',
                SELL: snippetsPrefix+'trader.options.sell'
            },
            BUY_CONFIRMED: snippetsPrefix+'trader.buyConfirmed',
            SELL_CONFIRMED: snippetsPrefix+'trader.sellConfirmed'
        }
    },
    DEFAULTS: {
        BASE_OBJECT: {
            CONTENT: '',
            OPTIONS: {},
        },
        TRADER_OBJECT: {
            INVENTORY_MAP: {
                buy: 'A',
                sell: 'B'
            },
            OPTIONS: {
                BUY: 'buy',
                SELL: 'sell'
            }
        },
        TARGETS: {
            OBJECT: 0,
            PLAYER: 1
        }
    },
    TRADE_ACTIONS_FUNCTION_NAME: {
        ADD: 'add',
        REMOVE: 'remove',
        CONFIRM: 'confirm',
        DISCONFIRM: 'disconfirm',
        CANCEL: 'cancel'
    },
    TRADE_ACTIONS: {
        SUB_ACTION: 'sub',
        ADD: 'ta',
        REMOVE: 'tr',
        CONFIRM: 'tc',
        DISCONFIRM: 'td'
    }
};
