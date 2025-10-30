/**
 *
 * Reldens - Entities Config
 *
 */

const { ScoresEntity } = require('./entities/scores-entity');
const { ScoresDetailEntity } = require('./entities/scores-detail-entity');

let propertiesConfig = {parentItemLabel: 'Users'};

let entitiesConfig = {
    scores: ScoresEntity.propertiesConfig(propertiesConfig),
    scoresDetail: ScoresDetailEntity.propertiesConfig(propertiesConfig)
};

module.exports.entitiesConfig = entitiesConfig;
