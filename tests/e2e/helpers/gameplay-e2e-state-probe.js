/**
 *
 * Reldens - Gameplay E2E State Probe
 *
 * Server side e2e endpoints for the gameplay features: the live player snapshot (avatar key, life, base life, stats,
 * base stats, state, scene, position, whether its body is in the room physics world, whether it got the PvP action,
 * experience and level, the body movement speed and the player speed the room world creates the bodies with), the player
 * state set with the room activate and deactivate methods
 * (dead, disabled or active, so a spec reaches the dead or disabled player paths where no enemy can kill it), the life
 * of an active enemy out of battle of a live room (set, then read by its body state key, so the auto recovery spec
 * watches the exact body it changed), the life of an exact enemy body (in battle or not), the live rooms with an auto
 * recovery interval (and the count of every interval kept) and the scores period reset check run on a given date,
 * after the stored last period key was set to the given value (the spec preserves that config row and the scores rows
 * before); the check interval of the scores plugin is stopped and any running check awaited first, so the interval
 * never runs a check of its own in the middle, and it is started again after the check.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { GameConst } = require('../../../lib/game/constants');
const { Logger, sc } = require('@reldens/utils');
const timersPromises = require('timers/promises');

class GameplayE2eStateProbe
{

    static LAST_PERIOD_KEY_PATH = 'scores/reset/lastPeriodKey';
    static LAST_PERIOD_KEY_SCOPE = 'server';
    static IDLE_CHECKS = 50;
    static IDLE_CHECK_MS = 100;

    static fetchPlayerSnapshot(room, playerName)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        if(!playerSchema){
            return {error: 'Player '+playerName+' not found in room '+room.roomName+'.'};
        }
        let affectedProperty = room.config.get('client/actions/skills/affectedProperty');
        let classPath = sc.get(sc.get(playerSchema, 'skillsServer', {}), 'classPath', {});
        return {
            avatarKey: playerSchema.avatarKey,
            life: playerSchema.stats[affectedProperty],
            totalLife: playerSchema.statsBase[affectedProperty],
            stats: Object.assign({}, playerSchema.stats),
            statsBase: Object.assign({}, playerSchema.statsBase),
            inState: playerSchema.state.inState,
            scene: playerSchema.state.scene,
            x: playerSchema.state.x,
            y: playerSchema.state.y,
            bodyInWorld: Boolean(playerSchema.physicalBody?.world),
            hasPvpAction: Boolean(playerSchema.actions?.pvp),
            experience: Number(sc.get(classPath, 'currentExp', 0)),
            level: Number(sc.get(classPath, 'currentLevel', 0)),
            nextLevelExperience: sc.isFunction(classPath.getNextLevelExperience) ? classPath.getNextLevelExperience() : 0,
            classPathLabel: sc.get(classPath, 'currentLabel', ''),
            skillsKeys: Object.keys(sc.get(classPath, 'currentSkills', {})),
            movementSpeed: Number(sc.get(sc.get(playerSchema, 'physicalBody', {}), 'movementSpeed', 0)),
            worldPlayerSpeed: Number(sc.get(room.roomWorld, 'playerMovementSpeed', 0))
        };
    }

    static fetchRecoveryTicks(serverManager)
    {
        let roomsIntervals = serverManager.featuresManager.featuresList.actions.package.roomAutoRecovery.roomsIntervals;
        return {
            roomsNames: RoomObjectsState.fetchRooms(serverManager.roomsManager, false).filter(
                room => sc.hasOwn(roomsIntervals, room.roomId)
            ).map(room => room.roomName),
            ticksCount: Object.keys(roomsIntervals).length
        };
    }

    static setPlayerState(room, playerName, inState)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        if(!playerSchema){
            return {error: 'Player '+playerName+' not found in room '+room.roomName+'.'};
        }
        if(GameConst.STATUS.ACTIVE === inState){
            room.activatePlayer(playerSchema, inState);
            return GameplayE2eStateProbe.fetchPlayerSnapshot(room, playerName);
        }
        room.deactivatePlayer(playerSchema, inState);
        return GameplayE2eStateProbe.fetchPlayerSnapshot(room, playerName);
    }

    static async setEnemyLifeByBody(serverManager, room, bodyKey, life)
    {
        let enemyObject = RoomObjectsState.fetchEnemies(room).find(
            roomObject => bodyKey === roomObject.objectBody.bodyState.key
        );
        if(!enemyObject){
            return {error: 'Enemy body '+bodyKey+' not found in room '+room.roomName+'.'};
        }
        return await GameplayE2eStateProbe.applyEnemyLife(serverManager, room, enemyObject, life);
    }

    static async applyEnemyLife(serverManager, room, enemyObject, life)
    {
        let affectedProperty = room.config.get('client/actions/skills/affectedProperty');
        enemyObject.stats[affectedProperty] = life;
        await serverManager.featuresManager.featuresList.users.package.broadcastObjectUpdate(room, enemyObject);
        return GameplayE2eStateProbe.mapEnemyLife(enemyObject, affectedProperty);
    }

    static isIdleEnemy(roomObject, enemyKey)
    {
        if(enemyKey !== roomObject.key && enemyKey !== sc.get(roomObject.clientParams, 'asset_key', '')){
            return false;
        }
        if(GameConst.STATUS.ACTIVE !== roomObject.objectBody.bodyState.inState){
            return false;
        }
        return 0 === Object.keys(sc.get(sc.get(roomObject, 'battle', {}), 'inBattleWithPlayers', {})).length;
    }

    static async setEnemyLife(serverManager, room, enemyKey, life)
    {
        let enemyObject = RoomObjectsState.fetchEnemies(room).find(
            roomObject => GameplayE2eStateProbe.isIdleEnemy(roomObject, enemyKey)
        );
        if(!enemyObject){
            return {error: 'Active enemy '+enemyKey+' out of battle not found in room '+room.roomName+'.'};
        }
        return await GameplayE2eStateProbe.applyEnemyLife(serverManager, room, enemyObject, life);
    }

    static fetchEnemyLife(room, bodyKey)
    {
        let enemyObject = RoomObjectsState.fetchEnemies(room).find(
            roomObject => bodyKey === roomObject.objectBody.bodyState.key
        );
        if(!enemyObject){
            return {error: 'Enemy body '+bodyKey+' not found in room '+room.roomName+'.'};
        }
        return GameplayE2eStateProbe.mapEnemyLife(enemyObject, room.config.get('client/actions/skills/affectedProperty'));
    }

    static mapEnemyLife(enemyObject, affectedProperty)
    {
        return {
            bodyKey: enemyObject.objectBody.bodyState.key,
            life: enemyObject.stats[affectedProperty],
            totalLife: enemyObject.initialStats[affectedProperty]
        };
    }

    static async waitForIdleScoresReset(scoresPeriodReset)
    {
        for(let check = 0; check < GameplayE2eStateProbe.IDLE_CHECKS && scoresPeriodReset.isRunning; check++){
            await timersPromises.setTimeout(GameplayE2eStateProbe.IDLE_CHECK_MS);
        }
        return !scoresPeriodReset.isRunning;
    }

    static async runScoresResetCheck(serverManager, isoDate, previousPeriodKey)
    {
        let scoresPeriodReset = serverManager.featuresManager?.featuresList?.scores?.package?.scoresPeriodReset;
        if(!scoresPeriodReset){
            return {error: 'The scores period reset is not running.'};
        }
        scoresPeriodReset.stop();
        if(!await GameplayE2eStateProbe.waitForIdleScoresReset(scoresPeriodReset)){
            scoresPeriodReset.start();
            return {error: 'The scores period reset check is still running.'};
        }
        if(sc.isString(previousPeriodKey)){
            await serverManager.dataServer.getEntity('config').update(
                {scope: GameplayE2eStateProbe.LAST_PERIOD_KEY_SCOPE, path: GameplayE2eStateProbe.LAST_PERIOD_KEY_PATH},
                {value: previousPeriodKey}
            );
        }
        let checkResult = await scoresPeriodReset.check(new Date(isoDate));
        scoresPeriodReset.start();
        return {checkResult};
    }

    static registerEndpoints(serverManager)
    {
        let app = serverManager.app;
        app.get('/api/e2e/gameplay/player', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.query, 'roomName', ''),
                response,
                async (room) => GameplayE2eStateProbe.fetchPlayerSnapshot(room, sc.get(request.query, 'playerName', ''))
            );
        });
        app.get('/api/e2e/gameplay/enemy-life', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.query, 'roomName', ''),
                response,
                async (room) => GameplayE2eStateProbe.fetchEnemyLife(room, sc.get(request.query, 'bodyKey', ''))
            );
        });
        app.post('/api/e2e/gameplay/enemy-life', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => await GameplayE2eStateProbe.setEnemyLife(
                    serverManager,
                    room,
                    sc.get(request.body, 'enemyKey', ''),
                    Number(sc.get(request.body, 'life', 0))
                )
            );
        });
        app.post('/api/e2e/gameplay/player-state', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => GameplayE2eStateProbe.setPlayerState(
                    room,
                    sc.get(request.body, 'playerName', ''),
                    Number(sc.get(request.body, 'inState', GameConst.STATUS.ACTIVE))
                )
            );
        });
        app.post('/api/e2e/gameplay/enemy-body-life', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => await GameplayE2eStateProbe.setEnemyLifeByBody(
                    serverManager,
                    room,
                    sc.get(request.body, 'bodyKey', ''),
                    Number(sc.get(request.body, 'life', 0))
                )
            );
        });
        app.post('/api/e2e/gameplay/restart-recovery-ticks', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => ({
                    restarted: serverManager.featuresManager.featuresList.actions.package.roomAutoRecovery
                        .startRoomTicks(room)
                })
            );
        });
        app.get('/api/e2e/gameplay/recovery-ticks', async (request, response) => {
            response.json(GameplayE2eStateProbe.fetchRecoveryTicks(serverManager));
        });
        app.post('/api/e2e/gameplay/scores-reset-check', async (request, response) => {
            response.json(await GameplayE2eStateProbe.runScoresResetCheck(
                serverManager,
                sc.get(request.body, 'isoDate', ''),
                sc.get(request.body, 'previousPeriodKey', false)
            ));
        });
        Logger.info('[gameplay-e2e-state-probe] Gameplay features endpoints registered.');
    }

}

module.exports.GameplayE2eStateProbe = GameplayE2eStateProbe;
