/**
 *
 * Reldens - Room Player Placement
 *
 * Server side e2e endpoint that puts a player next to one object of a live scene room: the object random movement is
 * stopped (until the next players reset restores it) and the player body is placed on the center of the closest
 * walkable tile around the object tile that does not overlap any colliding body of the room (the object itself, the
 * other objects next to it, like a cluster of mining rocks, and the other players; the closest distance first, then the
 * lowest row and column, so the same room always gives the same tile), so the NPC, trader and interactive object specs interact with the object from a
 * known position instead of chasing it across the room. It returns the object key, its body state key and position
 * and the exact player position.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { Logger, sc } = require('@reldens/utils');

class RoomPlayerPlacement
{

    static MAX_TILES_RADIUS = 3;

    static isTileOverBody(tileRect, bodyBounds)
    {
        return tileRect.left < bodyBounds.upperBound[0]
            && tileRect.right > bodyBounds.lowerBound[0]
            && tileRect.top < bodyBounds.upperBound[1]
            && tileRect.bottom > bodyBounds.lowerBound[1];
    }

    static mapCandidate(area, column, row)
    {
        let tileRect = {
            left: column * area.tileWidth,
            right: (column + 1) * area.tileWidth,
            top: row * area.tileHeight,
            bottom: (row + 1) * area.tileHeight
        };
        if(area.bodiesBounds.some(bodyBounds => RoomPlayerPlacement.isTileOverBody(tileRect, bodyBounds))){
            return false;
        }
        return {
            column,
            row,
            distance: Math.hypot(column - area.column, row - area.row),
            position: {x: tileRect.left + area.tileWidth / 2, y: tileRect.top + area.tileHeight / 2}
        };
    }

    static appendRowCandidates(candidates, area, column)
    {
        let radius = RoomPlayerPlacement.MAX_TILES_RADIUS;
        for(let row = area.row - radius; row <= area.row + radius; row++){
            if(!area.grid.isInside(column, row)){
                continue;
            }
            if(!area.grid.isWalkableAt(column, row)){
                continue;
            }
            let candidate = RoomPlayerPlacement.mapCandidate(area, column, row);
            if(candidate){
                candidates.push(candidate);
            }
        }
    }

    static findClosestFreePosition(room, objectBody, playerBody)
    {
        let mapJson = room.roomWorld.mapJson;
        let area = {
            grid: room.roomWorld.pathFinder.grid,
            bodiesBounds: room.roomWorld.bodies.filter(
                body => playerBody !== body && !body.isWall && false !== body.collisionResponse
            ).map(body => body.getAABB()),
            tileWidth: mapJson.tilewidth,
            tileHeight: mapJson.tileheight,
            column: Math.floor(objectBody.position[0] / mapJson.tilewidth),
            row: Math.floor(objectBody.position[1] / mapJson.tileheight)
        };
        let radius = RoomPlayerPlacement.MAX_TILES_RADIUS;
        let candidates = [];
        for(let column = area.column - radius; column <= area.column + radius; column++){
            RoomPlayerPlacement.appendRowCandidates(candidates, area, column);
        }
        candidates.sort(
            (candidateA, candidateB) => candidateA.distance - candidateB.distance
                || candidateA.row - candidateB.row
                || candidateA.column - candidateB.column
        );
        let closest = [...candidates].shift();
        if(!closest){
            return false;
        }
        return closest.position;
    }

    static placePlayerNextToObject(room, playerName, objectKey, sessionId)
    {
        let playerSchema = RoomObjectsState.findPlayer(room, playerName, sessionId);
        if(!playerSchema){
            return {error: 'Player '+playerName+' not found in room '+room.roomName+'.'};
        }
        let roomObject = RoomPlayerPlacement.findObjectWithBody(room, objectKey);
        if(!roomObject){
            return {error: 'Object '+objectKey+' not found in room '+room.roomName+'.'};
        }
        RoomObjectsState.stopRandomMovement(roomObject);
        let position = RoomPlayerPlacement.findClosestFreePosition(
            room,
            roomObject.objectBody,
            playerSchema.physicalBody
        );
        if(!position){
            return {error: 'No walkable tile next to the object '+objectKey+'.'};
        }
        playerSchema.physicalBody.resetAuto();
        playerSchema.physicalBody.stopFull();
        RoomObjectsState.placeObjectBody(playerSchema.physicalBody, position);
        return {
            objectKey: roomObject.key,
            bodyKey: sc.get(roomObject.objectBody.bodyState, 'key', roomObject.key),
            objectPosition: {x: roomObject.objectBody.position[0], y: roomObject.objectBody.position[1]},
            position
        };
    }

    static findObjectWithBody(room, objectKey)
    {
        let roomObjects = sc.get(room.objectsManager, 'roomObjects', {});
        return RoomObjectsState.findObjectByKey(
            Object.keys(roomObjects).map(objectIndex => roomObjects[objectIndex]).filter(
                roomObject => roomObject.objectBody
            ),
            objectKey
        );
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/room-objects/place-player-next-to-object', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomPlayerPlacement.placePlayerNextToObject(
                    room,
                    sc.get(request.body, 'playerName', ''),
                    sc.get(request.body, 'objectKey', ''),
                    String(sc.get(request.body, 'sessionId', ''))
                )
            );
        });
        Logger.info('[room-player-placement] Player placement endpoints registered.');
    }

}

module.exports.RoomPlayerPlacement = RoomPlayerPlacement;
