/**
 *
 * Reldens - RewardsConst
 *
 */

let prefix = 'rwd';
let snippetsPrefix = 'rewards.';

module.exports.RewardsConst = {
    KEY: 'rewards',
    PREFIX: prefix,
    ACTIONS: {
        INITIALIZE: prefix+'Ini',
        UPDATE: prefix+'Up',
        ACCEPT_REWARD: prefix+'Acpt',
        ACCEPTED_REWARD: prefix+'Acpted'
    },
    SPLIT_EXPERIENCE: {
        ALL: 0,
        PROPORTIONAL_BY_LEVEL: 1
    },
    SPLIT_MODIFIER: {
        ALL: 0,
        RANDOM: 1
    },
    SPLIT_ITEMS: {
        DROP_KEEPS: 0,
        RANDOM: 1
    },
    MESSAGE: {
        DATA: {
            LABEL: 'rlbl',
            DESCRIPTION: 'rdes',
            POSITION: 'rpos',
            SHOW_REWARD_IMAGE: 'srimg',
            REWARD_IMAGE: 'rimg',
            REWARD_IMAGE_PATH: 'rimgp',
            EVENT_DATA: 'redt',
            STATE_DATA: 'resd',
            ITEMS_DATA: 'rmid',
            ITEM_KEY: 'rikey',
            ITEM_LABEL: 'rilbl',
            ITEM_DESCRIPTION: 'rides',
            ITEM_QUANTITY: 'riqty'
        },
        DATA_VALUES: {
            NAMESPACE: 'rewards'
        }
    },
    TEMPLATES: {
        REWARDS_LIST: 'rewardsList'
    },
    SNIPPETS: {
        PREFIX: snippetsPrefix,
        TITLE: snippetsPrefix+'title'
    }
};
