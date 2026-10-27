/**
 *
 * Reldens - ScoresConst
 *
 */

let prefix = 'sco';
let snippetsPrefix = 'scores.';

module.exports.ScoresConst = {
    KEY: 'scores',
    PREFIX: prefix,
    FULL_TABLE_PAGE_SIZE: 100,
    ACTIONS: {
        UPDATE: prefix+'Up',
        TOP_SCORES_UPDATE: prefix+'Tops'
    },
    TEMPLATES: {
        SCORES_TABLE: 'scoresTable'
    },
    MESSAGE: {
        DATA_VALUES: {
            NAMESPACE: 'scores'
        }
    },
    SNIPPETS: {
        PREFIX: snippetsPrefix,
        TITLE: snippetsPrefix+'scoresTitle',
        CONTENT: snippetsPrefix+'scoresContent',
        MY_SCORE: snippetsPrefix+'myScore'
    },
    RESET: {
        CONFIG_PATHS: {
            ENABLED: 'server/scores/reset/enabled',
            PERIOD: 'server/scores/reset/period',
            CHECK_INTERVAL_MS: 'server/scores/reset/checkIntervalMs',
            RESET_DETAILS: 'server/scores/reset/resetDetails'
        },
        LAST_PERIOD_KEY: {
            SCOPE: 'server',
            PATH: 'scores/reset/lastPeriodKey'
        },
        PERIODS: {
            DAILY: 'daily',
            WEEKLY: 'weekly',
            MONTHLY: 'monthly'
        },
        DEFAULTS: {
            CHECK_INTERVAL_MS: 60000,
            RESET_SCORE: '0'
        },
        TIME: {
            MS_PER_DAY: 86400000,
            DAYS_PER_WEEK: 7,
            ISO_WEEK_THURSDAY: 4,
            ISO_DATE_LENGTH: 10,
            ISO_MONTH_LENGTH: 7,
            WEEK_DIGITS: 2,
            WEEK_PREFIX: '-W'
        }
    }
};
