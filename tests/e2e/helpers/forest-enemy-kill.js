/**
 *
 * Reldens - Forest Enemy Kill
 *
 * Places a forest enemy next to the player and targets that exact body, so the specs that need a fight get it from the
 * attacks on that body instead of depending on where the enemies wander; its aggression is held, so it only fights
 * once the player attacks it. The specs place it before the long run recording starts, so the video starts with the
 * enemy already targeted next to the player and no teleport or vanishing enemy is recorded. To kill it
 * (placeEnemyToKill) the configured forest enemy (e2eEnemyKey) is placed with one hit point in the normal run, so the
 * next attack kills it; the long run first moves the player to the center of the map and disables every enemy (the
 * placement restores the placed one), then places it with its full life, so its video shows the whole fight. To be
 * killed by it (placeEnemyToKillPlayer, long run only) a passive enemy of the center is placed with its full life and
 * the player life is set to the given points, then the server starts its battle in place, a single attack loop that
 * keeps hitting until the player dies (fightUntilPlayerDeath; the player attacks would start more loops that chase and
 * push the player until the enemy leaves the battle), the passive enemy never attacks the revived player.
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { Phaser } = require('./phaser');
const { RoomObjectsApi } = require('./room-objects-api');
const { LongRunShowcase } = require('./long-run-showcase');
const { sc } = require('@reldens/utils');

class ForestEnemyKill
{

    static ONE_HIT_LIFE = 1;
    static FULL_LIFE = 0;
    static ATTACK_SKILL_KEY = 'attackShort';

    static async placeEnemyToKill(page, gameConfig, timeout, longRun)
    {
        return await ForestEnemyKill.placeTargetedEnemy(
            page,
            gameConfig,
            gameConfig.e2eEnemyKey,
            longRun ? ForestEnemyKill.FULL_LIFE : ForestEnemyKill.ONE_HIT_LIFE,
            timeout,
            longRun
        );
    }

    static async placeEnemyToKillPlayer(page, gameConfig, playerLife, timeout)
    {
        let placement = await ForestEnemyKill.placeTargetedEnemy(
            page,
            gameConfig,
            await LongRunShowcase.findCentralPassiveEnemyKey(
                page,
                gameConfig,
                Login.FOREST_ROOM_NAME,
                gameConfig.e2eEnemyKey,
                true
            ),
            ForestEnemyKill.FULL_LIFE,
            timeout,
            true
        );
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName,
            playerLife
        );
        expect(lowered.value, 'The player life must be set: '+sc.get(lowered, 'error', '')).toBe(playerLife);
        return placement;
    }

    static async fightUntilPlayerDeath(page, gameConfig, enemyKey, timeout)
    {
        let battle = await RoomObjectsApi.startEnemyBattle(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName,
            enemyKey
        );
        expect(battle.enemyKey, 'The placed enemy battle must start: '+sc.get(battle, 'error', '')).toBe(enemyKey);
        await expect.poll(async () => await page.evaluate(() => Number(window.reldens.playerData.stats.hp)), {
            message: 'The placed enemy must keep attacking until the player dies',
            timeout
        }).toBeLessThanOrEqual(0);
    }

    static async placeTargetedEnemy(page, gameConfig, enemyKey, enemyLife, timeout, longRun)
    {
        await Phaser.waitForObjectByAssetKey(page, gameConfig.e2eEnemyKey, timeout);
        await LongRunShowcase.moveToCentralArea(page, gameConfig, Login.FOREST_ROOM_NAME, timeout, longRun);
        if(longRun){
            await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME);
        }
        let placement = await RoomObjectsApi.placeAndTargetEnemy(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            enemyKey,
            enemyLife,
            timeout,
            true
        );
        expect(placement.targeted, 'The placed enemy must be targeted: '+sc.toJsonString(placement)).toBe(true);
        return placement;
    }

}

module.exports.ForestEnemyKill = ForestEnemyKill;
