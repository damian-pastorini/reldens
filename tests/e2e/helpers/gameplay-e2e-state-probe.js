/**
 *
 * Reldens - Gameplay E2E State Probe
 *
 * Server side e2e endpoints for the gameplay features: the live player snapshot (avatar key, life, base life, stats,
 * state and scene), the life of an active enemy out of battle of a live room (set, then read by its body state key, so
 * the auto recovery spec watches the exact body it changed) and the scores period reset check run on a given date,
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
        return {
            avatarKey: playerSchema.avatarKey,
            life: playerSchema.stats[affectedProperty],
            totalLife: playerSchema.statsBase[affectedProperty],
            stats: Object.assign({}, playerSchema.stats),
            inState: playerSchema.state.inState,
            scene: playerSchema.state.scene
        };
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

    static setEnemyLife(room, enemyKey, life)
    {
        let enemyObject = RoomObjectsState.fetchEnemies(room).find(
            roomObject => GameplayE2eStateProbe.isIdleEnemy(roomObject, enemyKey)
        );
        if(!enemyObject){
            return {error: 'Active enemy '+enemyKey+' out of battle not found in room '+room.roomName+'.'};
        }
        let affectedProperty = room.config.get('client/actions/skills/affectedProperty');
        enemyObject.stats[affectedProperty] = life;
        return GameplayE2eStateProbe.mapEnemyLife(enemyObject, affectedProperty);
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
                async (room) => GameplayE2eStateProbe.setEnemyLife(
                    room,
                    sc.get(request.body, 'enemyKey', ''),
                    Number(sc.get(request.body, 'life', 0))
                )
            );
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
