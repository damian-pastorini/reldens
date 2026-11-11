/**
 *
 * Reldens - Room Line Placement
 *
 * Server side e2e endpoints that put bodies on a straight line, so a physical skill bullet meets them in a known order:
 * the enemies line moves the player to the closest free walkable tile (closest distance first, then the lowest row and
 * column, so the same room always gives the same tile, the player tile when it already fits) with a clear straight line
 * to the given direction (RoomPlayerPlacement.findClearLineTile with the bullet start bounds, no other body crosses
 * it), and places the given enemies (their random movement stopped) on that line, one every given tiles step, the
 * first one the closest to the player, and returns the player and the enemies positions; the player placement on the
 * line of an object moves the object (its random movement stopped) the same way to the closest free tile with a clear
 * line along the right, left, down and up directions at the given distances, and the player on that line; the wall
 * line places the player and a target player on the two free walkable tiles at both sides of a wall tile
 * (RoomTileKindsClassifier wall tiles), the closest to the player, so a bullet shot at the target ends on that wall.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { RoomPlayerPlacement } = require('./room-player-placement');
const { RoomMovementState } = require('./room-movement-state');
const { RoomAggressionPlacement } = require('./room-aggression-placement');
const { RoomTileKindsClassifier } = require('./room-tile-kinds-classifier');
const { CombatE2eState } = require('./combat-e2e-state');
const { Logger, sc } = require('@reldens/utils');

class RoomLinePlacement
{

    static LINE_DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    static MAX_START_TILES_RADIUS = 8;

    static fetchTile(body)
    {
        return [body.positionToTiles(body.position[0], body.position[1])].map(
            tile => [tile.currentCol, tile.currentRow]
        ).shift();
    }

    static tileCenter(room, tile)
    {
        let tileBounds = RoomPlayerPlacement.tileBounds(room, tile);
        return {x: (tileBounds.left + tileBounds.right) / 2, y: (tileBounds.top + tileBounds.bottom) / 2};
    }

    static appendStartTiles(startTiles, fromTile, column)
    {
        let radius = RoomLinePlacement.MAX_START_TILES_RADIUS;
        for(let row = fromTile[1] - radius; row <= fromTile[1] + radius; row++){
            startTiles.push({tile: [column, row], distance: Math.hypot(column - fromTile[0], row - fromTile[1])});
        }
    }

    static findLineStart(room, line, ignoredBodies)
    {
        let bodiesBounds = room.roomWorld.bodies.filter(
            body => !ignoredBodies.includes(body) && !body.isWall && false !== body.collisionResponse
        ).map(body => body.getAABB());
        let radius = RoomLinePlacement.MAX_START_TILES_RADIUS;
        let startTiles = [];
        for(let column = line.fromTile[0] - radius; column <= line.fromTile[0] + radius; column++){
            RoomLinePlacement.appendStartTiles(startTiles, line.fromTile, column);
        }
        return [...startTiles.sort(
            (startA, startB) => startA.distance - startB.distance
                || startA.tile[1] - startB.tile[1]
                || startA.tile[0] - startB.tile[0]
        ).filter(
            start => RoomAggressionPlacement.isFreeTile(room, start.tile[0], start.tile[1], bodiesBounds)
        ).map(start => ({
            fromTile: start.tile,
            tile: RoomPlayerPlacement.findClearLineTile(
                room,
                start.tile,
                RoomPlayerPlacement.shotStartBounds(room, start.tile),
                line.distances,
                ignoredBodies,
                line.directions
            )
        })).filter(start => start.tile), false].shift();
    }

    static placePlayerInLineOfObject(room, playerName, objectKey, sessionId, distances)
    {
        let subjects = RoomPlayerPlacement.fetchPlacementSubjects(room, playerName, objectKey, sessionId);
        if(subjects.error){
            return subjects;
        }
        let objectBody = subjects.roomObject.objectBody;
        let lineStart = RoomLinePlacement.findLineStart(
            room,
            {
                fromTile: RoomLinePlacement.fetchTile(objectBody),
                distances,
                directions: RoomLinePlacement.LINE_DIRECTIONS
            },
            [objectBody, subjects.playerSchema.physicalBody]
        );
        if(!lineStart){
            return {error: 'No free tile with a clear line around the object '+objectKey+' in '+room.roomName+'.'};
        }
        RoomMovementState.placeObjectOnTile(room, objectKey, lineStart.fromTile[0], lineStart.fromTile[1]);
        return RoomPlayerPlacement.placePlayerOnPosition(
            subjects.playerSchema,
            subjects.roomObject,
            RoomLinePlacement.tileCenter(room, lineStart.tile)
        );
    }

    static placeEnemiesOnLine(room, sessionId, bodyKeys, tilesStep, direction)
    {
        let playerSchema = RoomObjectsState.findPlayer(room, '', sessionId);
        let enemies = bodyKeys.map(bodyKey => CombatE2eState.findEnemy(room, bodyKey).enemyObject);
        if(!playerSchema || enemies.some(enemyObject => !enemyObject)){
            return {error: 'Player session '+sessionId+' or one of the enemies not found in '+room.roomName+'.'};
        }
        let lineStart = RoomLinePlacement.findLineStart(
            room,
            {
                fromTile: RoomLinePlacement.fetchTile(playerSchema.physicalBody),
                distances: [tilesStep * enemies.length],
                directions: [direction]
            },
            [playerSchema.physicalBody, ...enemies.map(enemyObject => enemyObject.objectBody)]
        );
        if(!lineStart){
            return {error: 'No free tile with a clear line of tiles to '+String(direction)+' in '+room.roomName+'.'};
        }
        let startTile = lineStart.fromTile;
        let playerPosition = RoomLinePlacement.tileCenter(room, startTile);
        RoomAggressionPlacement.placePlayer(playerSchema, playerPosition);
        return {playerPosition, positions: enemies.map((enemyObject, enemyIndex) => {
            let position = RoomLinePlacement.tileCenter(room, [
                startTile[0] + direction[0] * tilesStep * (enemyIndex + 1),
                startTile[1] + direction[1] * tilesStep * (enemyIndex + 1)
            ]);
            RoomObjectsState.stopRandomMovement(enemyObject);
            RoomObjectsState.placeObjectBody(enemyObject.objectBody, position);
            return position;
        })};
    }

    static findWallLine(room, playerTile, bodiesBounds)
    {
        return [...[...RoomTileKindsClassifier.fetchWallTileIndexes(room.roomWorld)].map(tileIndex => [
            tileIndex % room.roomWorld.mapJson.width,
            Math.floor(tileIndex / room.roomWorld.mapJson.width)
        ]).flatMap(
            wallTile => RoomLinePlacement.LINE_DIRECTIONS.map(direction => ({
                fromTile: [wallTile[0] - direction[0], wallTile[1] - direction[1]],
                toTile: [wallTile[0] + direction[0], wallTile[1] + direction[1]]
            }))
        ).filter(
            wallLine => RoomAggressionPlacement.isFreeTile(room, ...wallLine.fromTile, bodiesBounds)
                && RoomAggressionPlacement.isFreeTile(room, ...wallLine.toTile, bodiesBounds)
        ).sort(
            (lineA, lineB) => Math.hypot(lineA.fromTile[0] - playerTile[0], lineA.fromTile[1] - playerTile[1])
                - Math.hypot(lineB.fromTile[0] - playerTile[0], lineB.fromTile[1] - playerTile[1])
        )].shift();
    }

    static placePlayersAcrossWall(room, sessionId, targetSessionId)
    {
        let playerSchema = RoomObjectsState.findPlayer(room, '', sessionId);
        let targetSchema = RoomObjectsState.findPlayer(room, '', targetSessionId);
        if(!playerSchema || !targetSchema){
            return {error: 'Player session '+sessionId+' or '+targetSessionId+' not found in '+room.roomName+'.'};
        }
        let wallLine = RoomLinePlacement.findWallLine(
            room,
            RoomLinePlacement.fetchTile(playerSchema.physicalBody),
            room.roomWorld.bodies.filter(
                body => playerSchema.physicalBody !== body
                    && targetSchema.physicalBody !== body
                    && !body.isWall
                    && false !== body.collisionResponse
            ).map(body => body.getAABB())
        );
        if(!wallLine){
            return {error: 'No wall with free tiles at both sides in '+room.roomName+'.'};
        }
        let placement = {
            position: RoomLinePlacement.tileCenter(room, wallLine.fromTile),
            targetPosition: RoomLinePlacement.tileCenter(room, wallLine.toTile)
        };
        RoomAggressionPlacement.placePlayer(playerSchema, placement.position);
        RoomAggressionPlacement.placePlayer(targetSchema, placement.targetPosition);
        return placement;
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/room-objects/place-enemies-on-line', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomLinePlacement.placeEnemiesOnLine(
                    room,
                    String(sc.get(request.body, 'sessionId', '')),
                    sc.get(request.body, 'bodyKeys', []),
                    Number(sc.get(request.body, 'tilesStep', 1)),
                    sc.get(request.body, 'direction', RoomLinePlacement.LINE_DIRECTIONS[0]).map(Number)
                )
            );
        });
        serverManager.app.post('/api/e2e/room-objects/place-players-across-wall', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomLinePlacement.placePlayersAcrossWall(
                    room,
                    String(sc.get(request.body, 'sessionId', '')),
                    String(sc.get(request.body, 'targetSessionId', ''))
                )
            );
        });
        RoomMovementState.registerActionEndpoint(
            serverManager,
            '/api/e2e/room-objects/place-player-in-line-of-object',
            (room, body) => RoomLinePlacement.placePlayerInLineOfObject(
                room,
                sc.get(body, 'playerName', ''),
                sc.get(body, 'objectKey', ''),
                String(sc.get(body, 'sessionId', '')),
                String(sc.get(body, 'distances', '')).split(',').map(Number)
            )
        );
        Logger.info('[room-line-placement] Line placement endpoints registered.');
    }

}

module.exports.RoomLinePlacement = RoomLinePlacement;
