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
    TYPE_OBJECT: 'o1',
    TYPE_ANIMATION: 'o2',
    TYPE_NPC: 'o3',
    TYPE_ENEMY: 'o4',
    TYPE_TRADER: 'o5',
    DYNAMIC_ANIMATION: 'dyn',
    DEFAULTS: {
        BASE_OBJECT: {
            CONTENT: '',
            OPTIONS: {},
        },
        NPC_OBJECT: {
            INVALID_MESSAGE: 'I do not understand.'
        },
        TRADER_OBJECT: {
            CONTENT: 'Hi there! What would you like to do?',
            OPTIONS: {
                buy: {label: 'Buy', value: 'buy'},
                sell: {label: 'Sell', value: 'sell'},
                trade: {label: 'Trade', value: 'trade'}
            }
        }
    },
    TRADE_ACTIONS: {
        SUB_ACTION: 'sub',
        BUY_ADD: 'tba',
        BUY_REMOVE: 'tbr',
        BUY_CONFIRM: 'tbc',
        SELL_ADD: 'tsa',
        SELL_REMOVE: 'tsr',
        SELL_CONFIRM: 'tsc',
        TRADE_ADD: 'tta',
        TRADE_REMOVE: 'ttr',
        TRADE_CONFIRM: 'ttc'
    }
};
