/**
 *
 * Reldens - Entities Config
 *
 */

const { ScoresDetailEntityOverride } = require('./entities/scores-detail-entity-override');
const { ScoresEntityOverride } = require('./entities/scores-entity-override');

module.exports.entitiesConfig = {
    scoresDetail: ScoresDetailEntityOverride,
    scores: ScoresEntityOverride
};
