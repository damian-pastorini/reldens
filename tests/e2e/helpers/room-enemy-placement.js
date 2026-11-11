/**
 *
 * Reldens - Room Enemy Placement
 *
 * Server side e2e endpoints that put one enemy of a live scene room next to a player: the enemy is restored to its
 * full stats (or to the given life, so a single hit kills it), its random movement is stopped and its body is placed on
 * the first free attack position around the player (RoomAnchoredPlacement, the player itself moved to the closest free
 * tile pair when nothing fits where it stands), so the combat specs attack the same enemy body on the same position
 * instead of chasing it across the room;
 * the placement can hold the enemy aggression (it counts as in battle with that player, so an aggressive enemy does not
 * start the battle and chase the player from its respawn area before the player attacks it, the attack starts it);
 * the enemy attack places the enemy the same way and starts its battle with the player, so the specs that need a hit
 * get it at the exact moment they need it. Both return the enemy key, the body state key, the exact position, the
 * experience its stored rewards give on its death and its "killScore" private param (0 when it has none). The enemy
 * battle starts the battle of an already placed enemy without moving it, a single attack loop, so the enemy keeps
 * hitting the player in place (each player hit starts more loops, which chase and push the player when the skill
 * delay is not over). The player placement next to an object with room for an enemy puts the player on the first free
 * tile around an active object of the given asset (objects by key, fixed offsets order) that is inside the object
 * interaction area and has a free attack position for that enemy, so a later enemy attack never moves the player.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { RoomAnchoredPlacement } = require('./room-anchored-placement');
const { RoomEnemiesReset } = require('./room-enemies-reset');
const { GameConst } = require('../../../lib/game/constants');
const { Logger, sc } = require('@reldens/utils');

class RoomEnemyPlacement
{

    static SPOT_OFFSETS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

    static fetchObjectSpots(room, objectAssetKey)
    {
        let mapJson = room.roomWorld.mapJson;
        return RoomObjectsState.fetchObjectsWithState(room).filter(
            roomObject => objectAssetKey === sc.get(roomObject.clientParams, 'asset_key', '')
                && GameConst.STATUS.ACTIVE === sc.get(roomObject.objectBody.bodyState, 'inState', 0)
        ).sort((objectA, objectB) => String(objectA.key).localeCompare(String(objectB.key))).flatMap(roomObject => {
            let body = roomObject.objectBody;
            let objectTile = body.positionToTiles(body.position[0], body.position[1]);
            return RoomEnemyPlacement.SPOT_OFFSETS.map(offset => ({
                roomObject,
                position: {
                    x: (objectTile.currentCol + offset[0]) * mapJson.tilewidth + mapJson.tilewidth / 2,
                    y: (objectTile.currentRow + offset[1]) * mapJson.tileheight + mapJson.tileheight / 2
                }
            }));
        });
    }

    static placePlayerNextToObjectWithRoom(room, playerName, sessionId, objectAssetKey, enemyKey)
    {
        let found = RoomEnemyPlacement.findPlayerAndEnemy(room, playerName, enemyKey, sessionId);
        if(found.error){
            return found;
        }
        let playerBody = found.playerSchema.physicalBody;
        let enemyBody = found.enemyObject.objectBody;
        let bodiesBounds = RoomAnchoredPlacement.fetchOtherBodiesBounds(room, [playerBody, enemyBody]);
        let spot = [...RoomEnemyPlacement.fetchObjectSpots(room, objectAssetKey).filter(
            candidate => candidate.roomObject.isValidInteraction(candidate.position.x, candidate.position.y)
                && RoomAnchoredPlacement.isFreeAttackTile(
                    room,
                    playerBody,
                    playerBody,
                    candidate.position,
                    bodiesBounds
                )
                && RoomAnchoredPlacement.findAttackPosition(room, playerBody, enemyBody, candidate.position)
        ), false].shift();
        if(!spot){
            return {error: 'No tile next to a '+objectAssetKey+' with room for '+enemyKey+' in '+room.roomName+'.'};
        }
        RoomAnchoredPlacement.placePlayerBody(playerBody, spot.position);
        return {
            bodyKey: sc.get(spot.roomObject.objectBody.bodyState, 'key', spot.roomObject.key),
            position: spot.position
        };
    }

    static findPlayerAndEnemy(room, playerName, enemyKey, sessionId)
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
        return {playerSchema, enemyObject};
    }

    static async placeEnemyNextToPlayer(
        room,
        playerName,
        enemyKey,
        enemyLife = 0,
        sessionId = '',
        holdAggression = false
    )
    {
        let found = RoomEnemyPlacement.findPlayerAndEnemy(room, playerName, enemyKey, sessionId);
        if(found.error){
            return found;
        }
        let playerSchema = found.playerSchema;
        let enemyObject = found.enemyObject;
        let placement = RoomAnchoredPlacement.findAnchoredPlacement(
            room,
            playerSchema.physicalBody,
            enemyObject.objectBody
        );
        if(!placement){
            return {error: 'No free tile pair around the player '+playerName+sessionId+' in '+room.roomName+'.'};
        }
        if(placement.anchorPosition){
            RoomAnchoredPlacement.placePlayerBody(playerSchema.physicalBody, placement.anchorPosition);
        }
        let attackPosition = placement.position;
        await RoomEnemiesReset.restoreInstance(enemyObject, room);
        RoomObjectsState.stopRandomMovement(enemyObject);
        RoomObjectsState.placeObjectBody(enemyObject.objectBody, attackPosition);
        if(holdAggression){
            enemyObject.battle.inBattleWithPlayers[playerSchema.player_id] = true;
        }
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

    static async startPlacedEnemyBattle(room, playerName, enemyKey)
    {
        let found = RoomEnemyPlacement.findPlayerAndEnemy(room, playerName, enemyKey, '');
        if(found.error){
            return found;
        }
        await found.enemyObject.startBattleWithPlayer({bodyA: found.playerSchema.physicalBody, room});
        return {enemyKey: found.enemyObject.key};
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
            experience: placement.experience,
            killScore: Number(sc.get(placement.enemyObject, 'killScore', 0))
        };
    }

    static registerEndpoints(serverManager)
    {
        let withRoomPath = '/api/e2e/room-objects/place-player-next-to-object-with-room';
        serverManager.app.post(withRoomPath, async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomEnemyPlacement.placePlayerNextToObjectWithRoom(
                    room,
                    sc.get(request.body, 'playerName', ''),
                    String(sc.get(request.body, 'sessionId', '')),
                    String(sc.get(request.body, 'objectKey', '')),
                    String(sc.get(request.body, 'enemyKey', ''))
                )
            );
        });
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
        serverManager.app.post('/api/e2e/room-objects/enemy-battle', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomEnemyPlacement.startPlacedEnemyBattle(
                    room,
                    sc.get(request.body, 'playerName', ''),
                    sc.get(request.body, 'enemyKey', '')
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
                    String(sc.get(request.body, 'sessionId', '')),
                    true === sc.get(request.body, 'holdAggression', false)
                ))
            );
        });
        Logger.info('[room-enemy-placement] Enemy placement endpoints registered.');
    }

}

module.exports.RoomEnemyPlacement = RoomEnemyPlacement;
