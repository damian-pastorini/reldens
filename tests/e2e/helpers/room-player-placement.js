/**
 *
 * Reldens - Room Player Placement
 *
 * Server side e2e endpoint that puts a player next to one object of a live scene room: the object random movement is
 * stopped (until the next players reset restores it) and the player body is placed on the center of the closest
 * walkable tile around the object tile that does not overlap any colliding body of the room (the object itself, the
 * other objects next to it, like a cluster of mining rocks, and the other players; the closest distance first, then the
 * lowest row and column, so the same room always gives the same tile), so the NPC, trader and interactive object specs
 * interact with the object from a known position instead of chasing it across the room. A minimum tiles distance skips
 * the closer tiles, so the player body never touches an enemy that starts a battle on the hit. It returns the object
 * key, its body state key and position and the exact player position.
 * The clear line cases are built on a straight line of tiles no body of the room crosses (the path finder grid only
 * knows the walls and the blocked layers, so an object without state, a disabled enemy or another player can stop a
 * walk or end a bullet on a tile the grid marks walkable): from a start tile, the first line along the right, left,
 * down and up directions (in that order) at the given distances (in that order) whose tiles are all walkable on the
 * grid and whose rectangle (from the start bounds to the end tile) overlaps no body except the ignored ones. It gives
 * the walk target of a player, and the player placement on the line of an object (its random movement stopped and the
 * object placed on the center of its tile), so the same room always gives the same walk and the same shot. The line of
 * a shot also covers the row above and the column on the left of the object tile: P2world.shootBullet starts the bullet
 * half a tile and half a bullet away from the shooter on both axes, a body there removes the bullet before a client
 * can see it.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { RoomMovementState } = require('./room-movement-state');
const { Logger, sc } = require('@reldens/utils');

class RoomPlayerPlacement
{

    static MAX_TILES_RADIUS = 3;
    static LINE_DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    static mapCandidate(area, column, row)
    {
        let tileRect = {
            left: column * area.tileWidth,
            right: (column + 1) * area.tileWidth,
            top: row * area.tileHeight,
            bottom: (row + 1) * area.tileHeight
        };
        if(RoomObjectsState.isRectOverBodies(tileRect, area.bodiesBounds)){
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

    static findClosestFreePosition(room, objectBody, playerBody, minimumTilesDistance)
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
        let closest = [...candidates.filter(candidate => candidate.distance >= minimumTilesDistance).sort(
            (candidateA, candidateB) => candidateA.distance - candidateB.distance
                || candidateA.row - candidateB.row
                || candidateA.column - candidateB.column
        )].shift();
        if(!closest){
            return false;
        }
        return closest.position;
    }

    static fetchPlacementSubjects(room, playerName, objectKey, sessionId)
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
        return {playerSchema, roomObject};
    }

    static placePlayerOnPosition(playerSchema, roomObject, position)
    {
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

    static placePlayerNextToObject(room, playerName, objectKey, sessionId, minimumTilesDistance)
    {
        let subjects = RoomPlayerPlacement.fetchPlacementSubjects(room, playerName, objectKey, sessionId);
        if(subjects.error){
            return subjects;
        }
        let position = RoomPlayerPlacement.findClosestFreePosition(
            room,
            subjects.roomObject.objectBody,
            subjects.playerSchema.physicalBody,
            minimumTilesDistance
        );
        if(!position){
            return {error: 'No walkable tile next to the object '+objectKey+'.'};
        }
        return RoomPlayerPlacement.placePlayerOnPosition(subjects.playerSchema, subjects.roomObject, position);
    }

    static tileBounds(room, tile)
    {
        let mapJson = room.roomWorld.mapJson;
        return {
            left: tile[0] * mapJson.tilewidth,
            right: (tile[0] + 1) * mapJson.tilewidth,
            top: tile[1] * mapJson.tileheight,
            bottom: (tile[1] + 1) * mapJson.tileheight
        };
    }

    static shotStartBounds(room, tile)
    {
        let tileBounds = RoomPlayerPlacement.tileBounds(room, tile);
        return {
            ...tileBounds,
            left: tileBounds.left - room.roomWorld.mapJson.tilewidth,
            top: tileBounds.top - room.roomWorld.mapJson.tileheight
        };
    }

    static isLineWalkable(grid, fromTile, direction, distance)
    {
        for(let step = 1; step <= distance; step++){
            let column = fromTile[0] + direction[0] * step;
            let row = fromTile[1] + direction[1] * step;
            if(!grid.isInside(column, row) || !grid.isWalkableAt(column, row)){
                return false;
            }
        }
        return true;
    }

    static findLineTile(room, line, direction, distance)
    {
        if(!RoomPlayerPlacement.isLineWalkable(room.roomWorld.pathFinder.grid, line.fromTile, direction, distance)){
            return false;
        }
        let tile = [line.fromTile[0] + direction[0] * distance, line.fromTile[1] + direction[1] * distance];
        let tileBounds = RoomPlayerPlacement.tileBounds(room, tile);
        let lineBounds = {
            left: Math.min(line.startBounds.left, tileBounds.left),
            right: Math.max(line.startBounds.right, tileBounds.right),
            top: Math.min(line.startBounds.top, tileBounds.top),
            bottom: Math.max(line.startBounds.bottom, tileBounds.bottom)
        };
        if(RoomObjectsState.isRectOverBodies(lineBounds, line.bodiesBounds)){
            return false;
        }
        return tile;
    }

    static findClearLineTile(room, fromTile, startBounds, distances, ignoredBodies)
    {
        let line = {
            fromTile,
            startBounds,
            bodiesBounds: room.roomWorld.bodies.filter(body => !ignoredBodies.includes(body)).map(body => body.getAABB())
        };
        for(let distance of distances){
            let tile = RoomPlayerPlacement.findDistanceTile(room, line, distance);
            if(tile){
                return tile;
            }
        }
        return false;
    }

    static findDistanceTile(room, line, distance)
    {
        for(let direction of RoomPlayerPlacement.LINE_DIRECTIONS){
            let tile = RoomPlayerPlacement.findLineTile(room, line, direction, distance);
            if(tile){
                return tile;
            }
        }
        return false;
    }

    static fetchPlayerWalkTile(room, playerName, distances)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        if(!playerSchema){
            return {error: 'Player '+playerName+' not found in room '+room.roomName+'.'};
        }
        let playerBody = playerSchema.physicalBody;
        let playerTile = playerBody.positionToTiles(playerBody.position[0], playerBody.position[1]);
        let playerBounds = playerBody.getAABB();
        let tile = RoomPlayerPlacement.findClearLineTile(
            room,
            [playerTile.currentCol, playerTile.currentRow],
            {
                left: playerBounds.lowerBound[0],
                right: playerBounds.upperBound[0],
                top: playerBounds.lowerBound[1],
                bottom: playerBounds.upperBound[1]
            },
            distances,
            [playerBody]
        );
        if(!tile){
            return {error: 'No clear line of tiles from the player '+playerName+' in room '+room.roomName+'.'};
        }
        return {tile};
    }

    static placePlayerInLineOfObject(room, playerName, objectKey, sessionId, distances)
    {
        let subjects = RoomPlayerPlacement.fetchPlacementSubjects(room, playerName, objectKey, sessionId);
        if(subjects.error){
            return subjects;
        }
        let objectBody = subjects.roomObject.objectBody;
        let objectTile = objectBody.positionToTiles(objectBody.position[0], objectBody.position[1]);
        let fromTile = [objectTile.currentCol, objectTile.currentRow];
        RoomMovementState.placeObjectOnTile(room, objectKey, fromTile[0], fromTile[1]);
        let tile = RoomPlayerPlacement.findClearLineTile(
            room,
            fromTile,
            RoomPlayerPlacement.shotStartBounds(room, fromTile),
            distances,
            [objectBody, subjects.playerSchema.physicalBody]
        );
        if(!tile){
            return {error: 'No clear line of tiles from the object '+objectKey+' in room '+room.roomName+'.'};
        }
        let tileBounds = RoomPlayerPlacement.tileBounds(room, tile);
        return RoomPlayerPlacement.placePlayerOnPosition(
            subjects.playerSchema,
            subjects.roomObject,
            {x: (tileBounds.left + tileBounds.right) / 2, y: (tileBounds.top + tileBounds.bottom) / 2}
        );
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
                    String(sc.get(request.body, 'sessionId', '')),
                    Number(sc.get(request.body, 'minimumTilesDistance', 0))
                )
            );
        });
        RoomMovementState.registerQueryEndpoint(serverManager, '/api/e2e/movement/clear-line-tile', (room, query) => {
            return RoomPlayerPlacement.fetchPlayerWalkTile(
                room,
                sc.get(query, 'playerName', ''),
                String(sc.get(query, 'distances', '')).split(',').map(Number)
            );
        });
        RoomMovementState.registerActionEndpoint(
            serverManager,
            '/api/e2e/room-objects/place-player-in-line-of-object',
            (room, body) => RoomPlayerPlacement.placePlayerInLineOfObject(
                room,
                sc.get(body, 'playerName', ''),
                sc.get(body, 'objectKey', ''),
                String(sc.get(body, 'sessionId', '')),
                String(sc.get(body, 'distances', '')).split(',').map(Number)
            )
        );
        Logger.info('[room-player-placement] Player placement endpoints registered.');
    }

}

module.exports.RoomPlayerPlacement = RoomPlayerPlacement;
