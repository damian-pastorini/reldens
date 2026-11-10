/**
 *
 * Reldens - Room Line Placement
 *
 * Server side e2e endpoints that put bodies on a straight line, so a physical skill bullet meets them in a known order:
 * the enemies line places the given enemies (their random movement stopped) on the tiles of a clear straight line from
 * the player tile to the given direction (RoomPlayerPlacement.findClearLineTile, no other body crosses it), one every
 * given tiles step, the first one the closest to the player; the wall line places the player and a target player on the two free walkable
 * tiles at both sides of a wall tile (RoomTileKindsClassifier wall tiles), the closest to the player, so a bullet shot
 * at the target ends on that wall.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { RoomPlayerPlacement } = require('./room-player-placement');
const { RoomAggressionPlacement } = require('./room-aggression-placement');
const { RoomTileKindsClassifier } = require('./room-tile-kinds-classifier');
const { CombatE2eState } = require('./combat-e2e-state');
const { Logger, sc } = require('@reldens/utils');

class RoomLinePlacement
{

    static LINE_DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

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

    static placeEnemiesOnLine(room, sessionId, bodyKeys, tilesStep, direction)
    {
        let playerSchema = RoomObjectsState.findPlayer(room, '', sessionId);
        let enemies = bodyKeys.map(bodyKey => CombatE2eState.findEnemy(room, bodyKey).enemyObject);
        if(!playerSchema || enemies.some(enemyObject => !enemyObject)){
            return {error: 'Player session '+sessionId+' or one of the enemies not found in '+room.roomName+'.'};
        }
        let playerBody = playerSchema.physicalBody;
        let line = {
            fromTile: RoomLinePlacement.fetchTile(playerBody),
            bounds: playerBody.getAABB(),
            length: tilesStep * enemies.length
        };
        let isClearLine = RoomPlayerPlacement.findClearLineTile(
            room,
            line.fromTile,
            {
                left: line.bounds.lowerBound[0],
                right: line.bounds.upperBound[0],
                top: line.bounds.lowerBound[1],
                bottom: line.bounds.upperBound[1]
            },
            [line.length],
            [playerBody, ...enemies.map(enemyObject => enemyObject.objectBody)],
            [direction]
        );
        if(!isClearLine){
            return {error: 'No clear line of tiles from the player in '+room.roomName+' to '+String(direction)+'.'};
        }
        return {positions: enemies.map((enemyObject, enemyIndex) => {
            let position = RoomLinePlacement.tileCenter(room, [
                line.fromTile[0] + direction[0] * tilesStep * (enemyIndex + 1),
                line.fromTile[1] + direction[1] * tilesStep * (enemyIndex + 1)
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
        Logger.info('[room-line-placement] Line placement endpoints registered.');
    }

}

module.exports.RoomLinePlacement = RoomLinePlacement;
