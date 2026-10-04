/**
 *
 * Reldens - Room Objects State
 *
 * Server side e2e endpoints for the objects of a live scene room: the snapshot of every body with state (position,
 * velocity, bodies in contact, tile, original tile, the destination and steps of the path it follows, state, players
 * in battle and the random movement tiles and max delay),
 * so the specs read the exact server data instead of guessing from the sprites; the switch that disables the enemies
 * of a room (or only the aggressive ones) until the next players reset, so the specs that are not about those enemies
 * are never interrupted by an attack;
 * the random movement stop and the attack position next to a player used by the enemy placement (RoomEnemyPlacement);
 * the player placement next to another player, out of contact with its body and inside the short attack range, so a player versus player hit never pushes the target; and the player affected
 * property (hp) set on the live player and sent to its client, so the specs that need a death set the exact life the
 * next hit removes instead of depending on the enemies damage rate.
 *
 */

const { ObjectsConst } = require('../../../lib/objects/constants');
const { GameConst } = require('../../../lib/game/constants');
const { Logger, sc } = require('@reldens/utils');

class RoomObjectsState
{

    static ATTACK_DISTANCE = 40;
    static ATTACK_OFFSETS = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}];

    static findRoom(serverManager, roomName)
    {
        let createdInstances = sc.get(serverManager.roomsManager, 'createdInstances', {});
        for(let instanceId of Object.keys(createdInstances)){
            if(roomName === createdInstances[instanceId].roomName){
                return createdInstances[instanceId];
            }
        }
        return false;
    }

    static fetchObjectsWithState(room)
    {
        let roomObjects = sc.get(room.objectsManager, 'roomObjects', {});
        return Object.keys(roomObjects).map(objectIndex => roomObjects[objectIndex]).filter(
            roomObject => roomObject.objectBody && roomObject.objectBody.bodyState
        );
    }

    static findObjectByKey(roomObjects, objectKey)
    {
        let assetKeyMatch = false;
        for(let roomObject of roomObjects){
            if(objectKey === roomObject.key){
                return roomObject;
            }
            if(!assetKeyMatch && objectKey === sc.get(roomObject.clientParams, 'asset_key', '')){
                assetKeyMatch = roomObject;
            }
        }
        return assetKeyMatch;
    }

    static fetchEnemies(room)
    {
        return RoomObjectsState.fetchObjectsWithState(room).filter(
            roomObject => ObjectsConst.TYPE_ENEMY === roomObject.type
        );
    }

    static mapPathDestination(autoMoving)
    {
        if(!sc.isArray(autoMoving) || 0 === autoMoving.length){
            return false;
        }
        return {
            currentCol: autoMoving[autoMoving.length - 1][0],
            currentRow: autoMoving[autoMoving.length - 1][1]
        };
    }

    static describeBody(body)
    {
        if(body.playerId){
            return 'player:'+body.playerId;
        }
        if(body.isWall){
            return 'wall';
        }
        return sc.get(body.bodyState, 'key', 'body:'+body.id);
    }

    static fetchContactKeys(room, objectBody)
    {
        let contactKeys = [];
        for(let contactEquation of room.roomWorld.narrowphase.contactEquations){
            if(objectBody === contactEquation.bodyA){
                contactKeys.push(RoomObjectsState.describeBody(contactEquation.bodyB));
            }
            if(objectBody === contactEquation.bodyB){
                contactKeys.push(RoomObjectsState.describeBody(contactEquation.bodyA));
            }
        }
        return contactKeys;
    }

    static mapObjectSnapshot(roomObject, room)
    {
        let objectBody = roomObject.objectBody;
        return {
            key: roomObject.key,
            assetKey: sc.get(roomObject.clientParams, 'asset_key', roomObject.key),
            type: roomObject.type,
            x: Math.round(objectBody.position[0]),
            y: Math.round(objectBody.position[1]),
            velocityX: Math.round(objectBody.velocity[0]),
            velocityY: Math.round(objectBody.velocity[1]),
            contacts: RoomObjectsState.fetchContactKeys(room, objectBody),
            ...objectBody.positionToTiles(objectBody.position[0], objectBody.position[1]),
            originalCol: objectBody.originalCol,
            originalRow: objectBody.originalRow,
            destination: RoomObjectsState.mapPathDestination(objectBody.autoMoving),
            pathSteps: sc.isArray(objectBody.autoMoving) ? objectBody.autoMoving.length : 0,
            inState: objectBody.bodyState.inState,
            inBattle: Object.keys(sc.get(sc.get(roomObject, 'battle', {}), 'inBattleWithPlayers', {})).length,
            isAggressive: true === roomObject.isAggressive,
            maxTiles: sc.get(sc.get(roomObject, 'randomMovementBehavior', {}), 'maxTiles', 0),
            maxDelay: sc.get(sc.get(roomObject, 'randomMovementBehavior', {}), 'maxDelay', 0)
        };
    }

    static disableEnemy(enemyObject, affectedProperty)
    {
        clearTimeout(enemyObject.respawnTimer);
        clearTimeout(enemyObject.respawnStateTimer);
        clearTimeout(enemyObject.objectBody.moveToOriginalPointTimer);
        enemyObject.battle.inBattleWithPlayers = {};
        enemyObject.objectBody.resetAuto();
        enemyObject.objectBody.stopFull();
        enemyObject.objectBody.collisionResponse = false;
        enemyObject.stats[affectedProperty] = 0;
        enemyObject.objectBody.bodyState.inState = GameConst.STATUS.DISABLED;
    }

    static disableEnemies(room, onlyAggressive)
    {
        let enemies = RoomObjectsState.fetchEnemies(room).filter(
            enemyObject => !onlyAggressive || true === enemyObject.isAggressive
        );
        let affectedProperty = room.config.get('client/actions/skills/affectedProperty');
        for(let enemyObject of enemies){
            RoomObjectsState.disableEnemy(enemyObject, affectedProperty);
        }
        Logger.info('[room-objects-state] Disabled '+enemies.length+' enemies in room '+room.roomName+'.');
        return enemies.length;
    }

    static findPlayer(room, playerName, sessionId)
    {
        if('' !== sessionId){
            return room.state.players.get(sessionId) || false;
        }
        return RoomObjectsState.findPlayerByName(room, playerName);
    }

    static findPlayerByName(room, playerName)
    {
        for(let sessionId of room.state.players.keys()){
            let playerSchema = room.state.players.get(sessionId);
            if(playerName === playerSchema.playerName){
                return playerSchema;
            }
        }
        return false;
    }

    static findAttackPosition(room, playerBody)
    {
        let grid = room.roomWorld.pathFinder.grid;
        for(let offset of RoomObjectsState.ATTACK_OFFSETS){
            let x = playerBody.position[0] + offset.x * RoomObjectsState.ATTACK_DISTANCE;
            let y = playerBody.position[1] + offset.y * RoomObjectsState.ATTACK_DISTANCE;
            let tilePosition = playerBody.positionToTiles(x, y);
            if(grid.isWalkableAt(tilePosition.currentCol, tilePosition.currentRow)){
                return {x, y};
            }
        }
        return false;
    }

    static placeObjectBody(objectBody, position)
    {
        objectBody.position = [position.x, position.y];
        objectBody.aabbNeedsUpdate = true;
        objectBody.bodyState.x = position.x;
        objectBody.bodyState.y = position.y;
        let tilePosition = objectBody.positionToTiles(position.x, position.y);
        objectBody.originalCol = tilePosition.currentCol;
        objectBody.originalRow = tilePosition.currentRow;
    }

    static stopRandomMovement(roomObject)
    {
        let randomMovement = sc.get(roomObject, 'randomMovementBehavior', false);
        if(!randomMovement){
            return false;
        }
        randomMovement.stop();
        roomObject.objectBody.resetAuto();
        roomObject.objectBody.stopFull();
        return true;
    }

    static placePlayerNearPlayer(room, playerName, nearPlayerName)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        if(!playerSchema){
            return {error: 'Player '+playerName+' not found in room '+room.roomName+'.'};
        }
        let nearPlayerSchema = RoomObjectsState.findPlayerByName(room, nearPlayerName);
        if(!nearPlayerSchema){
            return {error: 'Player '+nearPlayerName+' not found in room '+room.roomName+'.'};
        }
        let position = RoomObjectsState.findAttackPosition(room, nearPlayerSchema.physicalBody);
        if(!position){
            return {error: 'No walkable tile next to the player '+nearPlayerName+'.'};
        }
        playerSchema.physicalBody.resetAuto();
        playerSchema.physicalBody.stopFull();
        RoomObjectsState.placeObjectBody(playerSchema.physicalBody, position);
        return {position};
    }

    static async setPlayerAffectedProperty(room, playerName, value)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        if(!playerSchema){
            return {error: 'Player '+playerName+' not found in room '+room.roomName+'.'};
        }
        let affectedProperty = room.config.get('client/actions/skills/affectedProperty');
        playerSchema.stats[affectedProperty] = value;
        await room.savePlayerStats(playerSchema, room.getClientById(playerSchema.sessionId));
        return {affectedProperty, value: playerSchema.stats[affectedProperty]};
    }

    static async respondForRoom(serverManager, roomName, response, roomAction)
    {
        let room = RoomObjectsState.findRoom(serverManager, roomName);
        if(!room){
            response.json({error: 'Room '+roomName+' not found.'});
            return;
        }
        response.json(await roomAction(room));
    }

    static registerEndpoints(serverManager)
    {
        let app = serverManager.app;
        app.get('/api/e2e/room-objects', (request, response) => {
            let room = RoomObjectsState.findRoom(serverManager, sc.get(request.query, 'roomName', ''));
            if(!room){
                response.json({objects: []});
                return;
            }
            response.json({
                objects: RoomObjectsState.fetchObjectsWithState(room).map(
                    roomObject => RoomObjectsState.mapObjectSnapshot(roomObject, room)
                )
            });
        });
        app.post('/api/e2e/room-objects/disable-enemies', (request, response) => {
            let room = RoomObjectsState.findRoom(serverManager, sc.get(request.body, 'roomName', ''));
            let onlyAggressive = true === sc.get(request.body, 'onlyAggressive', false);
            response.json({disabled: room ? RoomObjectsState.disableEnemies(room, onlyAggressive) : 0});
        });
        app.post('/api/e2e/room-objects/place-player', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomObjectsState.placePlayerNearPlayer(
                    room,
                    sc.get(request.body, 'playerName', ''),
                    sc.get(request.body, 'nearPlayerName', '')
                )
            );
        });
        app.post('/api/e2e/room-objects/player-affected-property', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomObjectsState.setPlayerAffectedProperty(
                    room,
                    sc.get(request.body, 'playerName', ''),
                    Number(sc.get(request.body, 'value', 0))
                )
            );
        });
        Logger.info('[room-objects-state] Room objects endpoints registered.');
    }

}

module.exports.RoomObjectsState = RoomObjectsState;
