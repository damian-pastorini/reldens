/**
 *
 * Reldens - world/constants
 *
 */

module.exports.WorldConst = {
    WORLD_TYPES: {
        NO_GRAVITY_2D: 'NO_GRAVITY_2D',
        TOP_DOWN_WITH_GRAVITY: 'TOP_DOWN_WITH_GRAVITY'
    },
    COLLISIONS: {
        PLAYER: Math.pow(2, 0),
        ENEMY: Math.pow(2, 1),
        WALL: Math.pow(2, 2),
        BULLET_PLAYER: Math.pow(2, 3),
        BULLET_ENEMY: Math.pow(2, 4)
    },
    FROM_TYPES: {
        PLAYER: 'PLAYER',
        OBJECT: 'OBJECT',
        OTHER: 'OTHER'
    }
};
