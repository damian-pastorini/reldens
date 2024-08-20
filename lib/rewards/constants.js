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
        ACCEPTED_REWARD: prefix+'Acp'
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
