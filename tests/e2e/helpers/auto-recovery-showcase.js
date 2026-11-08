/**
 *
 * Reldens - Auto Recovery Showcase
 *
 * The steps of the auto recovery spec that run only in the long run, so its videos show the recovery with the real
 * values. The start delay and the tick time are shortened (the tick time reaches the live room by restarting its
 * interval). The life bars change only on the recording page, its client keeps them in one config object, because a
 * server config override would reach the parallel specs: the current player one is shown bigger and an object bar takes
 * the width of its sprite, the only width that draws it centered. The escape from a chasing enemy is a walk
 * with the server path finder to the tile of the farthest enemy whose path is long enough, so the player keeps walking
 * until the chase time out passed and the camera shows the enemy chasing it (players and enemies walk at the same
 * speed, and after its last hit the enemy stays about 5 tiles behind). ESCAPE_PATH_TILES covers the 4 seconds of chase
 * plus a margin at the default rooms/world/movementSpeed physics world speed. The first steps can pass next to
 * the enemy, the player starts next to it, the next ones stay away from it and from the objects that are not enemies
 * (the path finder grid does not know those bodies, the disabled enemies do not collide). Once the battle ended the
 * walk stops on the closest tile with no tree drawn over the player, so the recovery is never hidden by a tree. The
 * normal run skips everything.
 *
 */

const { expect } = require('@playwright/test');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { ForestEnemyKill } = require('./forest-enemy-kill');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { LongRunShowcase } = require('./long-run-showcase');
const { Navigation } = require('./navigation');
const { RoomMovementApi } = require('./room-movement-api');
const { RoomObjectsApi } = require('./room-objects-api');
const { SecurityApi } = require('./security-api');
const { WalkableTileLocator } = require('./walkable-tile-locator');
const { ActionsConst } = require('../../../lib/actions/constants');
const { ObjectsConst } = require('../../../lib/objects/constants');

class AutoRecoveryShowcase
{

    static START_DELAY_MS = 2000;
    static TICK_MS = 1000;
    static CHASE_TIME_OUT_MS = 4000;
    static LIFE_BAR_CONFIG_PATH = 'client/ui/lifeBar';
    static LIFE_BAR_HEIGHT = 10;
    static PLAYER_LIFE_BAR = {showCurrentPlayer: true, width: 96, height: 10};
    static CHASE_LIFE_BAR = {showCurrentPlayer: true, height: 10};
    static ESCAPE_PATH_TILES = 28;
    static ESCAPE_PATH_START_TILES = 2;
    static STOP_TILES_RADIUS = 8;
    static STOP_CLEAR_TILES_RADIUS = 2;

    static async overrideConfig(gameConfig, e2eGroup, recoveryConfigPath, recoveredLife, longRun)
    {
        if(!longRun){
            return false;
        }
        let overrides = {
            [recoveryConfigPath+'/properties/hp']: recoveredLife,
            [recoveryConfigPath+'/startDelayMs']: AutoRecoveryShowcase.START_DELAY_MS,
            [ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.TICK_MS]: AutoRecoveryShowcase.TICK_MS
        };
        for(let configPath of Object.keys(overrides)){
            await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, configPath, overrides[configPath]);
        }
        return true;
    }

    static async restartRecoveryTicks(gameConfig, roomName, longRun)
    {
        if(!longRun){
            return false;
        }
        let ticks = await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/gameplay/restart-recovery-ticks',
            {roomName}
        );
        expect(ticks.restarted, 'The room recovery ticks must restart with the overridden tick time').toBe(true);
        return true;
    }

    static async setPageLifeBar(page, lifeBarValues, longRun)
    {
        if(!longRun){
            return false;
        }
        await page.evaluate(
            (lifeBar) => Object.assign(window.reldens.config.get(lifeBar.configPath), lifeBar.values),
            {configPath: AutoRecoveryShowcase.LIFE_BAR_CONFIG_PATH, values: lifeBarValues}
        );
        return true;
    }

    static async fillPlayerLife(page, gameConfig, roomName, longRun)
    {
        if(!longRun){
            return false;
        }
        await AutoRecoveryShowcase.setPageLifeBar(page, AutoRecoveryShowcase.PLAYER_LIFE_BAR, longRun);
        let player = await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, gameConfig.e2ePlayerName);
        await ForestEnemyKill.lowerPlayerLife(page, gameConfig, player.totalLife);
        return true;
    }

    static async showFullEnemyLife(page, gameConfig, roomName, enemyKey, longRun)
    {
        if(!longRun){
            return false;
        }
        let bodyKey = (await RoomObjectsApi.fetchRoomObjects(gameConfig, roomName)).find(
            roomObject => enemyKey === roomObject.key
        ).bodyKey;
        await AutoRecoveryShowcase.setPageLifeBar(page, {
            height: AutoRecoveryShowcase.LIFE_BAR_HEIGHT,
            width: await page.evaluate(
                (objectBodyKey) => window.reldens.getActiveScene().objectsAnimations[objectBodyKey].sceneSprite.width,
                bodyKey
            )
        }, longRun);
        return await GameplayE2eStateApi.setEnemyBodyLife(
            gameConfig,
            roomName,
            bodyKey,
            (await GameplayE2eStateApi.fetchEnemyLife(gameConfig, roomName, bodyKey)).totalLife
        );
    }

    static async startEscapeWalk(page, gameConfig, roomName, chasingEnemyKey)
    {
        let playerName = gameConfig.e2ePlayerName;
        let walkTile = await AutoRecoveryShowcase.findEscapeTile(
            gameConfig,
            roomName,
            await RoomMovementApi.fetchPlayer(gameConfig, roomName, playerName),
            chasingEnemyKey
        );
        expect(walkTile, 'The room must have a clear path for the player to escape').toBeTruthy();
        let walkPoint = WalkableTileLocator.worldPoint(walkTile);
        await Navigation.moveToWorldPoint(page, walkPoint.x, walkPoint.y);
        await expect.poll(
            async () => (await RoomMovementApi.fetchPlayer(gameConfig, roomName, playerName)).pathSteps,
            {message: 'The player must start walking away from the enemy'}
        ).toBeGreaterThan(0);
        return walkTile;
    }

    static async findEscapeTile(gameConfig, roomName, playerBody, chasingEnemyKey)
    {
        let roomObjects = await RoomObjectsApi.fetchRoomObjects(gameConfig, roomName);
        let avoidTiles = roomObjects.filter(
            roomObject => chasingEnemyKey === roomObject.key || ObjectsConst.TYPE_ENEMY !== roomObject.type
        ).map(roomObject => [roomObject.currentCol, roomObject.currentRow]);
        let farEnemies = roomObjects.filter(
            roomObject => chasingEnemyKey !== roomObject.key && ObjectsConst.TYPE_ENEMY === roomObject.type
        ).sort(
            (enemyA, enemyB) => Math.hypot(enemyB.x - playerBody.x, enemyB.y - playerBody.y)
                - Math.hypot(enemyA.x - playerBody.x, enemyA.y - playerBody.y)
        );
        for(let farEnemy of farEnemies){
            let farEnemyTile = [farEnemy.currentCol, farEnemy.currentRow];
            let path = await RoomMovementApi.fetchPath(
                gameConfig,
                roomName,
                [playerBody.currentCol, playerBody.currentRow],
                farEnemyTile
            );
            if(
                AutoRecoveryShowcase.ESCAPE_PATH_TILES <= path.length
                && WalkableTileLocator.isPathClearOfTiles(
                    path.slice(AutoRecoveryShowcase.ESCAPE_PATH_START_TILES),
                    avoidTiles
                )
            ){
                return farEnemyTile;
            }
        }
        return false;
    }

    static async stopEscapeWalk(page, gameConfig, roomName, longRun)
    {
        if(!longRun){
            return false;
        }
        let playerBody = await RoomMovementApi.fetchPlayer(gameConfig, roomName, gameConfig.e2ePlayerName);
        let playerTile = [playerBody.currentCol, playerBody.currentRow];
        let walkableTiles = (await RoomMovementApi.fetchTiles(
            gameConfig,
            roomName,
            playerTile,
            AutoRecoveryShowcase.STOP_TILES_RADIUS
        )).walkable;
        let uncoveredKeys = await LongRunShowcase.fetchUncoveredKeys(
            page,
            walkableTiles.map(tile => ({key: tile.join(','), ...WalkableTileLocator.worldPoint(tile)})),
            AutoRecoveryShowcase.STOP_CLEAR_TILES_RADIUS
        );
        let stopTile = [...WalkableTileLocator.findClosestTiles(
            walkableTiles.filter(tile => uncoveredKeys.includes(tile.join(','))),
            playerTile,
            1
        )].shift();
        let stopPoint = WalkableTileLocator.worldPoint(stopTile || playerTile);
        await Navigation.moveToWorldPoint(page, stopPoint.x, stopPoint.y);
        return true;
    }

}

module.exports.AutoRecoveryShowcase = AutoRecoveryShowcase;
