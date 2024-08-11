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
    ACTIONS: {
        INITIALIZE: prefix+'Ini',
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
        MY_SCORE: snippetsPrefix+'myScore'
    }
};
