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
        OBJECT: Math.pow(2, 1),
        WALL: Math.pow(2, 2),
        BULLET_PLAYER: Math.pow(2, 3),
        BULLET_OBJECT: Math.pow(2, 4),
        BULLET_OTHER: Math.pow(2, 5),
        DROP: Math.pow(2, 6),
    },
    FROM_TYPES: {
        PLAYER: 'PLAYER',
        OBJECT: 'OBJECT',
        OTHER: 'OTHER'
    }
};
