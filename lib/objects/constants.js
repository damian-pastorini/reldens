/**
 *
 * Reldens - objects/constants
 *
 * Objects constants.
 *
 */

// constants:
module.exports.ObjectsConst = {
    OBJECT_ANIMATION: 'oa',
    OBJECT_INTERACTION: 'oi',
    TYPE_OBJECT: 'obj',
    TYPE_ANIMATION: 'anim',
    TYPE_NPC: 'npc',
    TYPE_ENEMY: 'enemy',
    TYPE_TRADER: 'trader',
    DYNAMIC_ANIMATION: 'dyn',
    DEFAULTS: {
        BASE_OBJECT: {
            CONTENT: '',
            OPTIONS: {},
        },
        NPC_OBJECT: {
            INVALID_MESSAGE: 'I do not understand.',
        },
        TRADER_OBJECT: {
            CONTENT: 'Hi there! What would you like to do?',
            OPTIONS: {
                buy: {label: 'Buy', value: 'buy'},
                sell: {label: 'Sell', value: 'sell'}
            },
            BUY_CONFIRMED_MESSAGE: 'Thanks for buying!',
            SELL_CONFIRMED_MESSAGE: 'Thanks for your products!',
        }
    },
    TRADE_ACTIONS_FUNCTION_NAME: {
        ADD: 'add',
        REMOVE: 'remove',
        CONFIRM: 'confirm'
    },
    TRADE_ACTIONS: {
        SUB_ACTION: 'sub',
        ADD: 'ta',
        REMOVE: 'tr',
        CONFIRM: 'tc'
    }
};
