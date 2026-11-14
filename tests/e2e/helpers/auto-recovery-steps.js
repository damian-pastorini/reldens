/**
 *
 * Reldens - Auto Recovery Steps
 *
 * The steps of the auto recovery spec shared by its cases: the recovery enabled for the group with the values the case
 * waits for (the stored tick time is only the upper bound of the timeouts, the long run start delay is its own), the
 * player life set on the live player, the enemy the case uses (the configured one, a central passive one in the long
 * run), the enemy placed next to the player with every other enemy disabled for the chase case, and the escape: the
 * normal run places the player next to the object farthest from the enemy, the long run walks away
 * (AutoRecoveryShowcase). The fast cases override the tick time (1 second) and the start delays (3 seconds) for the
 * group, enter the forest, restart the forest recovery interval with that tick time and disable every enemy, or keep
 * the given number of active passive enemies (of a passive respawn area of the stored room data) and disable the rest.
 *
 */

const { expect, test } = require('@playwright/test');
const { AutoRecoveryShowcase } = require('./auto-recovery-showcase');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { ForestEnemyKill } = require('./forest-enemy-kill');
const { Login } = require('./login');
const { LongRunShowcase } = require('./long-run-showcase');
const { Navigation } = require('./navigation');
const { RoomObjectsApi } = require('./room-objects-api');
const { TimeConstants } = require('./time-constants');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { BaseE2eTest } = require('../base-e2e-test');
const { ActionsConst } = require('../../../lib/actions/constants');
const { GameConst } = require('../../../lib/game/constants');
const { sc } = require('@reldens/utils');

class AutoRecoverySteps
{

    static RECOVERY_TICKS = 3;
    static DELAY_CHECK_MARGIN_MS = 1000;
    static FAST_TICK_MS = 1000;
    static FAST_START_DELAY_MS = 3000;
    static FAST_CASE_TIME_OUT_MS = 60000;

    static async prepareFastRecovery(context, configValues)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + AutoRecoverySteps.FAST_CASE_TIME_OUT_MS
        );
        let overrides = Object.assign(
            {[ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.TICK_MS]: AutoRecoverySteps.FAST_TICK_MS},
            configValues
        );
        for(let configPath of Object.keys(overrides)){
            await E2eSeedAndRestoreApi.overrideConfig(
                context.gameConfig,
                context.e2eGroup,
                configPath,
                overrides[configPath]
            );
        }
        return overrides;
    }

    static fastRecoveryConfig(recoveryConfigPath, enabled = true)
    {
        return {
            [recoveryConfigPath+'/enabled']: enabled,
            [recoveryConfigPath+'/startDelayMs']: AutoRecoverySteps.FAST_START_DELAY_MS
        };
    }

    static async enterForestWithFastTicks(context)
    {
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await AutoRecoverySteps.restartFastTicks(context);
    }

    static async restartFastTicks(context)
    {
        await AutoRecoveryShowcase.requestTicksRestart(context.gameConfig, Login.FOREST_ROOM_NAME);
        await RoomObjectsApi.disableEnemies(context.gameConfig, Login.FOREST_ROOM_NAME);
    }

    static async moveToTown(page, gameConfig)
    {
        let placed = await RoomObjectsApi.placePlayerOnChangePoint(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            Login.TOWN_ROOM_NAME
        );
        expect(placed.error, 'The player must reach the change point to the town room').toBeUndefined();
        await Navigation.waitForRoom(page, Login.TOWN_ROOM_NAME, TimeConstants.ROOM_TRANSITION);
    }

    static loadPassiveEnemyKey()
    {
        let passiveArea = BaseE2eTest.loadRoomEntries(Login.FOREST_ROOM_NAME, ['respawnAreas']).find(
            respawnArea => false === respawnArea.isAggressive && 0 < respawnArea.interactionRadio
        );
        expect(passiveArea, 'The forest must have a passive enemy respawn area').toBeTruthy();
        return passiveArea.assetKey;
    }

    static async keepPassiveEnemies(gameConfig, count)
    {
        await AutoRecoveryShowcase.requestTicksRestart(gameConfig, Login.FOREST_ROOM_NAME);
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, true);
        let passiveKey = AutoRecoverySteps.loadPassiveEnemyKey();
        let roomObjects = await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.FOREST_ROOM_NAME);
        let bodyKeys = roomObjects.filter(
            roomObject => passiveKey === roomObject.assetKey && GameConst.STATUS.ACTIVE === roomObject.inState
        ).slice(0, count).map(roomObject => roomObject.bodyKey);
        expect(bodyKeys, count+' active passive enemies must be in the forest').toHaveLength(count);
        for(let roomObject of roomObjects){
            if(passiveKey === roomObject.assetKey && !bodyKeys.includes(roomObject.bodyKey)){
                await GameplayE2eStateApi.setEnemyStats(
                    gameConfig,
                    Login.FOREST_ROOM_NAME,
                    roomObject.bodyKey,
                    {},
                    GameConst.STATUS.DISABLED
                );
            }
        }
        return bodyKeys;
    }

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
