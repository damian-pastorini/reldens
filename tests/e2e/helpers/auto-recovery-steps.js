/**
 *
 * Reldens - Auto Recovery Steps
 *
 * The steps of the auto recovery spec shared by its cases: the recovery enabled for the group with the values the case
 * waits for (the stored tick time is only the upper bound of the timeouts, the long run start delay is its own), the
 * player life set on the live player, the enemy the case uses (the configured one, a central passive one in the long
 * run), the enemy placed next to the player with every other enemy disabled for the chase case, and the escape: the
 * normal run places the player next to the object farthest from the enemy, the long run walks away
 * (AutoRecoveryShowcase).
 *
 */

const { expect, test } = require('@playwright/test');
const { AutoRecoveryShowcase } = require('./auto-recovery-showcase');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { ForestEnemyKill } = require('./forest-enemy-kill');
const { Login } = require('./login');
const { LongRunShowcase } = require('./long-run-showcase');
const { RoomObjectsApi } = require('./room-objects-api');
const { TimeConstants } = require('./time-constants');
const { ActionsConst } = require('../../../lib/actions/constants');
const { sc } = require('@reldens/utils');

class AutoRecoverySteps
{

    static RECOVERY_TICKS = 3;
    static DELAY_CHECK_MARGIN_MS = 1000;

    static async prepareRecovery(gameConfig, e2eGroup, recoveryConfigPath, longRunRecoveredLife, longRun)
    {
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, recoveryConfigPath+'/enabled', true);
        await AutoRecoveryShowcase.overrideConfig(
            gameConfig,
            e2eGroup,
            recoveryConfigPath,
            longRunRecoveredLife,
            longRun
        );
        let tickMs = Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.TICK_MS)
        );
        expect(tickMs, 'The recovery tick time must be stored').toBeGreaterThan(0);
        expect(
            Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, recoveryConfigPath+'/properties/hp')),
            'The configured recovered life must be positive'
        ).toBeGreaterThan(0);
        let storedStartDelayMs = Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, recoveryConfigPath+'/startDelayMs')
        );
        expect(storedStartDelayMs, 'The recovery start delay must be stored').toBeGreaterThan(
            AutoRecoverySteps.DELAY_CHECK_MARGIN_MS
        );
        let startDelayMs = longRun ? AutoRecoveryShowcase.START_DELAY_MS : storedStartDelayMs;
        let recoveryTimeout = startDelayMs + tickMs * AutoRecoverySteps.RECOVERY_TICKS;
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun) + recoveryTimeout * 2
        );
        return {startDelayMs, recoveryTimeout};
    }

    static async preparePlayersRecovery(gameConfig, e2eGroup, longRunRecoveredLife, longRun)
    {
        return await AutoRecoverySteps.prepareRecovery(
            gameConfig,
            e2eGroup,
            ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS,
            longRunRecoveredLife,
            longRun
        );
    }

    static async lowerPlayerLife(gameConfig, playerName, life)
    {
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            playerName,
            life
        );
        expect(lowered.value, 'The player life must be lowered: '+sc.get(lowered, 'error', '')).toBe(life);
        return Date.now();
    }

    static async findEnemyKey(page, gameConfig, longRun)
    {
        return await LongRunShowcase.findCentralPassiveEnemyKey(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2eEnemyKey,
            longRun
        );
    }

    static async fetchFightingEnemy(gameConfig, enemyKey)
    {
        return (await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.FOREST_ROOM_NAME)).find(
            roomObject => enemyKey === roomObject.key
        );
    }

    static async escapeFromEnemy(page, gameConfig, enemyKey, timeout, longRun)
    {
        if(longRun){
            return await AutoRecoveryShowcase.startEscapeWalk(page, gameConfig, Login.FOREST_ROOM_NAME, enemyKey);
        }
        let roomObjects = await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.FOREST_ROOM_NAME);
        let fightingEnemy = roomObjects.find(roomObject => enemyKey === roomObject.key);
        let escapeObjects = await LongRunShowcase.filterCenteredObjects(
            page,
            roomObjects.filter(roomObject => enemyKey !== roomObject.key)
        );
        let farObject = [...escapeObjects.sort(
            (objectA, objectB) => Math.hypot(objectB.x - fightingEnemy.x, objectB.y - fightingEnemy.y)
                - Math.hypot(objectA.x - fightingEnemy.x, objectA.y - fightingEnemy.y)
        )].shift();
        expect(farObject, 'The forest must have an object far from the fighting enemy').toBeTruthy();
        let escape = await RoomObjectsApi.placePlayerNextToObject(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            farObject.key,
            timeout
        );
        expect(escape.reached, 'The player must escape far from the enemy: '+sc.toJsonString(escape)).toBe(true);
        return escape;
    }

    static async placeChasingEnemy(page, gameConfig, timeout, longRun)
    {
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, true);
        await LongRunShowcase.moveToCentralArea(page, gameConfig, Login.FOREST_ROOM_NAME, timeout, longRun);
        let placement = await ForestEnemyKill.placeAndTargetForestEnemy(
            page,
            gameConfig,
            await AutoRecoverySteps.findEnemyKey(page, gameConfig, longRun),
            ForestEnemyKill.FULL_LIFE,
            timeout,
            true
        );
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, false, placement.bodyKey);
        return placement;
    }

}

module.exports.AutoRecoverySteps = AutoRecoverySteps;
