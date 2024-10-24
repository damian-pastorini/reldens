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
    }
};
