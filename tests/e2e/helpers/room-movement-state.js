/**
 *
 * Reldens - Room Movement State
 *
 * Server side e2e endpoints for the movement, path finding and collisions specs of a live scene room: the snapshot of
 * a player body (position, tile, velocity, the path it follows, the bodies in contact and the scene change flag), the
 * walkable and blocked tiles of the room path finder grid around a tile, and the object body actions the specs need to
 * build each case on the exact tiles they choose: the path set on the body (with or without the random movement area
 * grid), the move to a tile, the move back to the original tile, the placement on a tile that keeps the original tile
 * and the random movement switch, so a scenario is never changed by a random move in the middle of it.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { RoomTileKindsClassifier } = require('./room-tile-kinds-classifier');
const { Logger, sc } = require('@reldens/utils');

class RoomMovementState
{

    static mapPath(path)
    {
        if(!sc.isArray(path)){
            return [];
        }
        return path.map(step => [step[0], step[1]]);
    }

    static mapBodySnapshot(room, body)
    {
        return {
            x: Math.round(body.position[0]),
            y: Math.round(body.position[1]),
            velocityX: Math.round(body.velocity[0]),
            velocityY: Math.round(body.velocity[1]),
            ...body.positionToTiles(body.position[0], body.position[1]),
            path: RoomMovementState.mapPath(body.autoMoving),
            pathSteps: sc.isArray(body.autoMoving) ? body.autoMoving.length : 0,
            contacts: RoomObjectsState.fetchContactKeys(room, body)
        };
    }

    static mapPlayerSnapshot(room, playerSchema)
    {
        return {
            sessionId: playerSchema.sessionId,
            ...RoomMovementState.mapBodySnapshot(room, playerSchema.physicalBody),
            isChangingScene: true === playerSchema.physicalBody.isChangingScene
        };
    }

    static mapObjectSnapshot(room, roomObject)
    {
        let objectBody = roomObject.objectBody;
        return {
            ...RoomObjectsState.mapObjectSnapshot(roomObject, room),
            ...RoomMovementState.mapBodySnapshot(room, objectBody),
            hasAreaGrid: false !== sc.get(objectBody, 'autoMovingGrid', false),
            hasRandomMovement: false !== sc.get(sc.get(roomObject, 'randomMovementBehavior', {}), 'movementTimer', false)
        };
    }

    static fetchPlayer(room, playerName)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        if(!playerSchema){
            return {error: 'Player '+playerName+' not found in room '+room.roomName+'.'};
        }
        return {player: RoomMovementState.mapPlayerSnapshot(room, playerSchema)};
    }

    static fetchObject(room, objectKey)
    {
        let roomObject = RoomObjectsState.findObjectByKey(RoomObjectsState.fetchObjectsWithState(room), objectKey);
        if(!roomObject){
            return {error: 'Object '+objectKey+' not found in room '+room.roomName+'.'};
        }
        return {object: RoomMovementState.mapObjectSnapshot(room, roomObject)};
    }

    static fetchAreaGrid(roomObject, useAreaGrid)
    {
        if(!useAreaGrid){
            return false;
        }
        let randomMovement = sc.get(roomObject, 'randomMovementBehavior', false);
        if(!randomMovement){
            return false;
        }
        return randomMovement.createMovementAreaGrid(roomObject.objectBody.getPathFinder().grid);
    }

    static withObject(room, objectKey, objectAction)
    {
        let roomObject = RoomObjectsState.findObjectByKey(RoomObjectsState.fetchObjectsWithState(room), objectKey);
        if(!roomObject){
            return {error: 'Object '+objectKey+' not found in room '+room.roomName+'.'};
        }
        objectAction(roomObject);
        return {object: RoomMovementState.mapObjectSnapshot(room, roomObject)};
    }

    static setObjectPath(room, objectKey, path, useAreaGrid)
    {
        return RoomMovementState.withObject(room, objectKey, (roomObject) => {
            let objectBody = roomObject.objectBody;
            objectBody.resetAuto();
            objectBody.autoMoving = path.map(step => [Number(step[0]), Number(step[1])]);
            objectBody.autoMovingGrid = RoomMovementState.fetchAreaGrid(roomObject, useAreaGrid);
        });
    }

    static moveObjectToTile(room, objectKey, column, row, useAreaGrid)
    {
        return RoomMovementState.withObject(room, objectKey, (roomObject) => {
            roomObject.objectBody.moveToPoint({column, row}, RoomMovementState.fetchAreaGrid(roomObject, useAreaGrid));
        });
    }

    static moveObjectToOriginalTile(room, objectKey, useAreaGrid)
    {
        return RoomMovementState.withObject(room, objectKey, (roomObject) => {
            roomObject.objectBody.moveToOriginalPoint(RoomMovementState.fetchAreaGrid(roomObject, useAreaGrid));
        });
    }

    static placeObjectOnTile(room, objectKey, column, row)
    {
        return RoomMovementState.withObject(room, objectKey, (roomObject) => {
            let objectBody = roomObject.objectBody;
            let tileWidth = objectBody.worldTileWidth;
            let tileHeight = objectBody.worldTileHeight;
            objectBody.resetAuto();
            objectBody.stopFull();
            objectBody.position = [column * tileWidth + tileWidth / 2, row * tileHeight + tileHeight / 2];
            objectBody.aabbNeedsUpdate = true;
            objectBody.bodyState.x = objectBody.position[0];
            objectBody.bodyState.y = objectBody.position[1];
            objectBody.updateCurrentPoints();
        });
    }

    static switchRandomMovement(room, objectKey, enabled)
    {
        return RoomMovementState.withObject(room, objectKey, (roomObject) => {
            let randomMovement = sc.get(roomObject, 'randomMovementBehavior', false);
            if(!randomMovement){
                return;
            }
            if(enabled){
                randomMovement.scheduleNextMove();
                return;
            }
            RoomObjectsState.stopRandomMovement(roomObject);
        });
    }

    static restoreRandomMovement(roomsManager, roomsNames = false)
    {
        let restoredCount = 0;
        for(let room of RoomObjectsState.fetchRooms(roomsManager, roomsNames)){
            restoredCount += RoomMovementState.restoreRoomRandomMovement(room);
        }
        return restoredCount;
    }

    static restoreRoomRandomMovement(room)
    {
        let restoredCount = 0;
        for(let roomObject of RoomObjectsState.fetchObjectsWithState(room)){
            let randomMovement = sc.get(roomObject, 'randomMovementBehavior', false);
            if(!randomMovement || false !== randomMovement.movementTimer){
                continue;
            }
            randomMovement.scheduleNextMove();
            restoredCount++;
        }
        return restoredCount;
    }

    static registerQueryEndpoint(serverManager, path, roomAction)
    {
        serverManager.app.get(path, async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.query, 'roomName', ''),
                response,
                async (room) => roomAction(room, request.query)
            );
        });
    }

    static registerActionEndpoint(serverManager, path, roomAction)
    {
        serverManager.app.post(path, async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => roomAction(room, request.body)
            );
        });
    }

    static registerEndpoints(serverManager)
    {
        RoomMovementState.registerQueryEndpoint(serverManager, '/api/e2e/movement/player', (room, query) => {
            return RoomMovementState.fetchPlayer(room, sc.get(query, 'playerName', ''));
        });
        RoomMovementState.registerQueryEndpoint(serverManager, '/api/e2e/movement/object', (room, query) => {
            return RoomMovementState.fetchObject(room, sc.get(query, 'objectKey', ''));
        });
        RoomMovementState.registerQueryEndpoint(serverManager, '/api/e2e/movement/path', (room, query) => {
            return {
                path: RoomMovementState.mapPath(room.roomWorld.pathFinder.findPath(
                    String(sc.get(query, 'from', '')).split(',').map(Number),
                    String(sc.get(query, 'to', '')).split(',').map(Number)
                ))
            };
        });
        RoomMovementState.registerQueryEndpoint(serverManager, '/api/e2e/movement/tiles', (room, query) => {
            return RoomTileKindsClassifier.classifyTiles(
                room,
                Number(sc.get(query, 'column', 0)),
                Number(sc.get(query, 'row', 0)),
                Number(sc.get(query, 'radius', 1))
            );
        });
        RoomMovementState.registerActionEndpoint(serverManager, '/api/e2e/movement/object-path', (room, body) => {
            return RoomMovementState.setObjectPath(
                room,
                sc.get(body, 'objectKey', ''),
                sc.get(body, 'path', []),
                true === sc.get(body, 'useAreaGrid', false)
            );
        });
        RoomMovementState.registerActionEndpoint(serverManager, '/api/e2e/movement/object-move', (room, body) => {
            return RoomMovementState.moveObjectToTile(
                room,
                sc.get(body, 'objectKey', ''),
                Number(sc.get(body, 'column', 0)),
                Number(sc.get(body, 'row', 0)),
                true === sc.get(body, 'useAreaGrid', false)
            );
        });
        RoomMovementState.registerActionEndpoint(
            serverManager,
            '/api/e2e/movement/object-original-tile',
            (room, body) => RoomMovementState.moveObjectToOriginalTile(
                room,
                sc.get(body, 'objectKey', ''),
                true === sc.get(body, 'useAreaGrid', false)
            )
        );
        RoomMovementState.registerActionEndpoint(serverManager, '/api/e2e/movement/object-place', (room, body) => {
            return RoomMovementState.placeObjectOnTile(
                room,
                sc.get(body, 'objectKey', ''),
                Number(sc.get(body, 'column', 0)),
                Number(sc.get(body, 'row', 0))
            );
        });
        RoomMovementState.registerActionEndpoint(
            serverManager,
            '/api/e2e/movement/object-random-movement',
            (room, body) => RoomMovementState.switchRandomMovement(
                room,
                sc.get(body, 'objectKey', ''),
                true === sc.get(body, 'enabled', false)
            )
        );
        Logger.info('[room-movement-state] Room movement endpoints registered.');
    }

}

module.exports.RoomMovementState = RoomMovementState;
