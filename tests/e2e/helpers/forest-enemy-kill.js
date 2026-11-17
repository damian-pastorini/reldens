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
 * killed by it (placeEnemyToKillPlayer, long run only) a passive enemy of the center is placed with its full life, the
 * player life is lowered before the recording (lowerPlayerLife), then the server starts its battle in place, a single
 * attack loop that keeps hitting until the player dies (fightUntilPlayerDeath, the HUD shows the life; the player
 * attacks would start more loops that chase and push the player until the enemy leaves the battle), the passive enemy
 * never attacks the revived player. The combat rules specs enter the forest with the configured enemy placed next to
 * the player, targeted and with its aggression held, at its full life (enterForestWithPlacedEnemy).
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { Phaser } = require('./phaser');
const { RoomObjectsApi } = require('./room-objects-api');
const { LongRunShowcase } = require('./long-run-showcase');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { sc } = require('@reldens/utils');

class ForestEnemyKill
{

    static ONE_HIT_LIFE = 1;
    static FULL_LIFE = 0;
    static ATTACK_SKILL_KEY = 'attackShort';
    static LIFE_POLL_MS = 200;
    static AFFECTED_PROPERTY_PATH = 'client/actions/skills/affectedProperty';

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

    static async placeEnemyToKillPlayer(page, gameConfig, timeout)
    {
        return await ForestEnemyKill.placeTargetedEnemy(
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
    }

    static async fetchClientLife(page)
    {
        return await page.evaluate(() => ({
            value: Number(window.reldens.playerData.stats.hp),
            text: 'HP '+window.reldens.playerData.stats.hp+' of '+window.reldens.playerData.statsBase.hp
        }));
    }

    static async fetchStoredLife(gameConfig, playerName)
    {
        return Number((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'playersStats', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName}),
            stat_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'stats', {
                key: await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ForestEnemyKill.AFFECTED_PROPERTY_PATH)
            })
        })).shift().value);
    }

    static async lowerPlayerLife(page, gameConfig, playerLife)
    {
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName,
            playerLife
        );
        expect(lowered.value, 'The player life must be set: '+sc.get(lowered, 'error', '')).toBe(playerLife);
        await expect.poll(
            async () => (await ForestEnemyKill.fetchClientLife(page)).value,
            {message: 'The client must receive the lowered player life'}
        ).toBe(playerLife);
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
        await expect.poll(async () => (await ForestEnemyKill.fetchClientLife(page)).value, {
            message: 'The placed enemy must keep attacking until the player dies',
            timeout,
            intervals: [ForestEnemyKill.LIFE_POLL_MS]
        }).toBeLessThanOrEqual(0);
    }

    static async placeTargetedEnemy(page, gameConfig, enemyKey, enemyLife, timeout, longRun)
    {
        await Phaser.waitForObjectByAssetKey(page, gameConfig.e2eEnemyKey, timeout);
        await LongRunShowcase.moveToCentralArea(page, gameConfig, Login.FOREST_ROOM_NAME, timeout, longRun);
        if(longRun){
            await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME);
        }
        return await ForestEnemyKill.placeAndTargetForestEnemy(page, gameConfig, enemyKey, enemyLife, timeout, true);
    }

    static async enterForestWithPlacedEnemy(page, gameConfig, longRun)
    {
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        await Phaser.waitForObjectByAssetKey(page, gameConfig.e2eEnemyKey, forestData.sceneTimeout);
        return {
            placement: await ForestEnemyKill.placeAndTargetForestEnemy(
                page,
                gameConfig,
                gameConfig.e2eEnemyKey,
                ForestEnemyKill.FULL_LIFE,
                forestData.sceneTimeout,
                true
            ),
            timeout: forestData.sceneTimeout
        };
    }

    static async placeAndTargetForestEnemy(page, gameConfig, enemyKey, enemyLife, timeout, holdAggression = false)
    {
        let placement = await RoomObjectsApi.placeAndTargetEnemy(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            enemyKey,
            enemyLife,
            timeout,
            holdAggression
        );
        expect(placement.targeted, 'The placed enemy must be targeted: '+sc.toJsonString(placement)).toBe(true);
        return placement;
    }

}

module.exports.ForestEnemyKill = ForestEnemyKill;
