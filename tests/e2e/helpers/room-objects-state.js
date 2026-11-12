/**
 *
 * Reldens - Room Objects State
 *
 * Server side e2e endpoints for the objects of a live scene room: the snapshot of every body with state (position,
 * velocity, bodies in contact, tile, original tile, the destination and steps of the path it follows, state, the count
 * and the ids of the players in battle and the random movement tiles and max delay),
 * so the specs read the exact server data instead of guessing from the sprites; the switch that disables the enemies
 * of a room (or only the aggressive ones) until the next players reset, so the specs that are not about those enemies
 * are never interrupted by an attack;
 * the random movement stop and the body placement used by the placement helpers (RoomAnchoredPlacement,
 * RoomEnemyPlacement), the rectangle over bodies check; and the player
 * affected property (hp) set on the live player and sent to its client, so the specs that need a death set the exact
 * life the next hit removes instead of depending on the enemies damage rate (the answer holds the value set, read
 * before the stats save, since an enemy hit can land while the save runs).
 *
 */

const { ObjectsConst } = require('../../../lib/objects/constants');
const { GameConst } = require('../../../lib/game/constants');
const { Logger, sc } = require('@reldens/utils');

class RoomObjectsState
{

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

    static fetchRooms(roomsManager, roomsNames)
    {
        let createdInstances = sc.get(roomsManager, 'createdInstances', {});
        return Object.keys(createdInstances).map(instanceId => createdInstances[instanceId]).filter(
            room => false === roomsNames || roomsNames.includes(room.roomName)
        );
    }

    static fetchRoomObjects(room)
    {
        let roomObjects = sc.get(room.objectsManager, 'roomObjects', {});
        return Object.keys(roomObjects).map(objectIndex => roomObjects[objectIndex]);
    }

    static fetchObjectsWithState(room)
    {
        return RoomObjectsState.fetchRoomObjects(room).filter(
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
        let snapshot = {
            key: roomObject.key,
            bodyKey: sc.get(objectBody.bodyState, 'key', roomObject.key),
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
            inBattlePlayers: Object.keys(sc.get(sc.get(roomObject, 'battle', {}), 'inBattleWithPlayers', {})),
            isAggressive: true === roomObject.isAggressive,
            maxTiles: sc.get(sc.get(roomObject, 'randomMovementBehavior', {}), 'maxTiles', 0),
            maxDelay: sc.get(sc.get(roomObject, 'randomMovementBehavior', {}), 'maxDelay', 0),
            movesCount: sc.get(sc.get(roomObject, 'randomMovementBehavior', {}), 'movesCount', 0),
            openDialogs: Object.keys(sc.get(sc.get(roomObject, 'randomMovementBehavior', {}), 'openDialogs', {})).sort()
        };
        snapshot.inBattle = snapshot.inBattlePlayers.length;
        return snapshot;
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

    static disableEnemies(room, onlyAggressive, exceptBodyKey)
    {
        let enemies = RoomObjectsState.fetchEnemies(room).filter(
            enemyObject => (!onlyAggressive || true === enemyObject.isAggressive)
                && exceptBodyKey !== enemyObject.objectBody.bodyState.key
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

    static isRectOverBodies(rect, bodiesBounds)
    {
        return bodiesBounds.some(
            bodyBounds => rect.left < bodyBounds.upperBound[0]
                && rect.right > bodyBounds.lowerBound[0]
                && rect.top < bodyBounds.upperBound[1]
                && rect.bottom > bodyBounds.lowerBound[1]
        );
    }

    static placeObjectBody(objectBody, position)
    {
        objectBody.position = [position.x, position.y];
        objectBody.aabbNeedsUpdate = true;
        objectBody.bodyState.x = position.x;
        objectBody.bodyState.y = position.y;
        let tilePosition = objectBody.positionToTiles(position.x, position.y);
        Object.assign(objectBody, tilePosition, {originalCol: tilePosition.currentCol, originalRow: tilePosition.currentRow});
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

    static async setPlayerAffectedProperty(room, playerName, value)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        if(!playerSchema){
            return {error: 'Player '+playerName+' not found in room '+room.roomName+'.'};
        }
        let affectedProperty = room.config.get('client/actions/skills/affectedProperty');
        playerSchema.stats[affectedProperty] = value;
        let changed = {affectedProperty, value: playerSchema.stats[affectedProperty]};
        await room.savePlayerStats(playerSchema, room.getClientById(playerSchema.sessionId));
        return changed;
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
            let exceptBodyKey = String(sc.get(request.body, 'exceptBodyKey', ''));
            response.json({disabled: room ? RoomObjectsState.disableEnemies(room, onlyAggressive, exceptBodyKey) : 0});
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
