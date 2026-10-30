/**
 *
 * Reldens - Forest Enemy Kill
 *
 * Places the configured forest enemy (e2eEnemyKey) next to the player with one hit point and targets that exact body,
 * so the specs that need a kill get it with the next attack instead of depending on the enemies life and damage rate.
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { Phaser } = require('./phaser');
const { RoomObjectsApi } = require('./room-objects-api');
const { sc } = require('@reldens/utils');

class ForestEnemyKill
{

    static ONE_HIT_LIFE = 1;
    static ATTACK_SKILL_KEY = 'attackShort';

    static async placeOneHitEnemy(page, gameConfig, timeout)
    {
        await Phaser.waitForObjectByAssetKey(page, gameConfig.e2eEnemyKey, timeout);
        let placement = await RoomObjectsApi.placeAndTargetEnemy(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2eEnemyKey,
            ForestEnemyKill.ONE_HIT_LIFE,
            timeout
        );
        expect(placement.targeted, 'The placed enemy must be targeted: '+sc.toJsonString(placement)).toBe(true);
        return placement;
    }

}

module.exports.ForestEnemyKill = ForestEnemyKill;
