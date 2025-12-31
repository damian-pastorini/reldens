/**
 *
 * Reldens - Rewards Entities Config
 *
 */

const { DropsAnimationsEntityOverride } = require('./entities/drops-animations-entity-override');
const { RewardsEntityOverride } = require('./entities/rewards-entity-override');
const { RewardsEventsEntityOverride } = require('./entities/rewards-events-entity-override');
const { RewardsModifiersEntityOverride } = require('./entities/rewards-modifiers-entity-override');

module.exports.entitiesConfig = {
    dropsAnimations: DropsAnimationsEntityOverride,
    rewards: RewardsEntityOverride,
    rewardsEvents: RewardsEventsEntityOverride,
    rewardsModifiers: RewardsModifiersEntityOverride
};
