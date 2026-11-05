/**
 *
 * Reldens - Room Enemy Placement
 *
 * Server side e2e endpoints that put one enemy of a live scene room next to a player: the enemy is restored to its
 * full stats (or to the given life, so a single hit kills it), its random movement is stopped and its body is placed on
 * the first walkable attack position around the player, so the combat specs attack the same enemy body on the same position instead of chasing it across the room;
 * the enemy attack places the enemy the same way and starts its battle with the player, so the specs that need a hit
 * get it at the exact moment they need it. Both return the enemy key, the body state key, the exact position and the
 * experience its stored rewards give on its death.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { RoomEnemiesReset } = require('./room-enemies-reset');
const { Logger, sc } = require('@reldens/utils');

class RoomEnemyPlacement
{

    static async placeEnemyNextToPlayer(room, playerName, enemyKey, enemyLife = 0, sessionId = '')
    {
        let playerSchema = RoomObjectsState.findPlayer(room, playerName, sessionId);
        if(!playerSchema){
            return {error: 'Player '+playerName+' not found in room '+room.roomName+'.'};
        }
        let enemyObject = RoomObjectsState.fetchEnemies(room).find(
            roomObject => enemyKey === roomObject.key || enemyKey === sc.get(roomObject.clientParams, 'asset_key', '')
        );
        if(!enemyObject){
            return {error: 'Enemy '+enemyKey+' not found in room '+room.roomName+'.'};
        }
        let attackPosition = RoomObjectsState.findAttackPosition(
            room,
            playerSchema.physicalBody,
            enemyObject.objectBody
        );
        if(!attackPosition){
            return {error: 'No walkable tile next to the player '+playerName+'.'};
        }
        await RoomEnemiesReset.restoreInstance(enemyObject, room);
        RoomObjectsState.stopRandomMovement(enemyObject);
        RoomObjectsState.placeObjectBody(enemyObject.objectBody, attackPosition);
        if(0 < enemyLife){
            enemyObject.stats[room.config.get('client/actions/skills/affectedProperty')] = enemyLife;
        }
        let rewards = await enemyObject.dataServer.getEntity('rewards').loadBy('object_id', enemyObject.id);
        let experience = (rewards || []).reduce((total, reward) => total + Number(reward.experience || 0), 0);
        return {playerSchema, enemyObject, position: attackPosition, experience};
    }

    static async startEnemyAttack(room, playerName, assetKey)
    {
        let placement = await RoomEnemyPlacement.placeEnemyNextToPlayer(room, playerName, assetKey);
        if(placement.error){
            return placement;
        }
        await placement.enemyObject.startBattleWithPlayer({bodyA: placement.playerSchema.physicalBody, room});
        return RoomEnemyPlacement.mapPlacement(placement);
    }

    static mapPlacement(placement)
    {
        if(placement.error){
            return placement;
        }
        return {
            enemyKey: placement.enemyObject.key,
            bodyKey: placement.enemyObject.objectBody.bodyState.key,
            position: placement.position,
            experience: placement.experience
        };
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/room-objects/enemy-attack', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomEnemyPlacement.startEnemyAttack(
                    room,
                    sc.get(request.body, 'playerName', ''),
                    sc.get(request.body, 'assetKey', '')
                )
            );
        });
        serverManager.app.post('/api/e2e/room-objects/place-enemy', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomEnemyPlacement.mapPlacement(await RoomEnemyPlacement.placeEnemyNextToPlayer(
                    room,
                    sc.get(request.body, 'playerName', ''),
                    sc.get(request.body, 'enemyKey', ''),
                    Number(sc.get(request.body, 'enemyLife', 0)),
                    String(sc.get(request.body, 'sessionId', ''))
                ))
            );
        });
        Logger.info('[room-enemy-placement] Enemy placement endpoints registered.');
    }

}

module.exports.RoomEnemyPlacement = RoomEnemyPlacement;
