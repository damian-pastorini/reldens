/**
 *
 * Reldens - Room Aggression Placement
 *
 * Server side e2e endpoints that put a player where an enemy aggression check runs: the respawn area placement puts
 * the player on the free walkable tile of the enemy respawn layer with the most tiles of that layer inside the given
 * radius (the forest players start away from the enemies respawn areas, so the placed enemy needs to be placed again
 * next to the player there), and the aggression placement puts the player on the closest free walkable tile around a
 * placed enemy inside a pixels distance range from the enemy body (the aggression measures that distance against its
 * "interactionRadio"), on a tile of the enemy respawn layer, outside it or on any of them (null), and releases the held
 * aggression, so the next world step runs the enemy aggression check on that exact position. The free tiles never
 * overlap a colliding body of the room other than the placed player.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { RoomPlayerPlacement } = require('./room-player-placement');
const { CombatE2eState } = require('./combat-e2e-state');
const { Logger, sc } = require('@reldens/utils');

class RoomAggressionPlacement
{

    static fetchRespawnTilesData(room, enemyObject)
    {
        return sc.get(sc.get(room.roomWorld.respawnAreas, enemyObject.respawnLayer, {}), 'respawnTilesData', {});
    }

    static isFreeTile(room, column, row, bodiesBounds)
    {
        return room.roomWorld.pathFinder.grid.isInside(column, row)
            && room.roomWorld.pathFinder.grid.isWalkableAt(column, row)
            && !RoomObjectsState.isRectOverBodies(RoomPlayerPlacement.tileBounds(room, [column, row]), bodiesBounds);
    }

    static fetchSubjects(room, sessionId, bodyKey)
    {
        let subjects = CombatE2eState.findEnemy(room, bodyKey);
        subjects.playerSchema = RoomObjectsState.findPlayer(room, '', sessionId);
        if(!subjects.playerSchema){
            subjects.error = 'Player session '+sessionId+' not found in '+room.roomName+'.';
        }
        if(subjects.error){
            return subjects;
        }
        subjects.bodiesBounds = room.roomWorld.bodies.filter(
            body => subjects.playerSchema.physicalBody !== body && !body.isWall && false !== body.collisionResponse
        ).map(body => body.getAABB());
        return subjects;
    }

    static placePlayer(playerSchema, position)
    {
        playerSchema.physicalBody.resetAuto();
        playerSchema.physicalBody.stopFull();
        RoomObjectsState.placeObjectBody(playerSchema.physicalBody, position);
    }

    static fetchTilesAround(room, enemyObject, maximumDistance)
    {
        let mapJson = room.roomWorld.mapJson;
        let area = {
            mapJson,
            respawnTilesData: RoomAggressionPlacement.fetchRespawnTilesData(room, enemyObject),
            enemyPosition: enemyObject.objectBody.position,
            tilesRadius: Math.ceil(maximumDistance / mapJson.tilewidth),
            enemyRow: Math.floor(enemyObject.objectBody.position[1] / mapJson.tileheight)
        };
        let enemyColumn = Math.floor(area.enemyPosition[0] / mapJson.tilewidth);
        let tiles = [];
        for(let column = enemyColumn - area.tilesRadius; column <= enemyColumn + area.tilesRadius; column++){
            RoomAggressionPlacement.appendColumnTiles(tiles, area, column);
        }
        return tiles;
    }

    static appendColumnTiles(tiles, area, column)
    {
        for(let row = area.enemyRow - area.tilesRadius; row <= area.enemyRow + area.tilesRadius; row++){
            let position = {
                x: column * area.mapJson.tilewidth + area.mapJson.tilewidth / 2,
                y: row * area.mapJson.tileheight + area.mapJson.tileheight / 2
            };
            tiles.push({
                column,
                row,
                position,
                distance: Math.hypot(position.x - area.enemyPosition[0], position.y - area.enemyPosition[1]),
                isRespawnTile: sc.hasOwn(area.respawnTilesData, row * area.mapJson.width + column)
            });
        }
    }

    static findAggressionTile(room, subjects, placement)
    {
        return [...RoomAggressionPlacement.fetchTilesAround(room, subjects.enemyObject, placement.maximumDistance).filter(
            tile => (null === placement.isRespawnTile || placement.isRespawnTile === tile.isRespawnTile)
                && placement.minimumDistance <= tile.distance
                && placement.maximumDistance >= tile.distance
                && RoomAggressionPlacement.isFreeTile(room, tile.column, tile.row, subjects.bodiesBounds)
        ).sort(
            (tileA, tileB) => tileA.distance - tileB.distance || tileA.row - tileB.row || tileA.column - tileB.column
        )].shift();
    }

    static placePlayerForAggression(room, sessionId, bodyKey, placement)
    {
        let subjects = RoomAggressionPlacement.fetchSubjects(room, sessionId, bodyKey);
        if(subjects.error){
            return subjects;
        }
        let tile = RoomAggressionPlacement.findAggressionTile(room, subjects, placement);
        if(!tile){
            return {error: 'No free tile for the enemy '+bodyKey+' aggression placement.'};
        }
        RoomAggressionPlacement.placePlayer(subjects.playerSchema, tile.position);
        subjects.enemyObject.battle.inBattleWithPlayers = {};
        return {position: tile.position, distance: tile.distance, isRespawnTile: tile.isRespawnTile};
    }

    static findDensestRespawnTile(room, subjects, radius)
    {
        return [...subjects.respawnTiles.filter(
            tileData => RoomAggressionPlacement.isFreeTile(room, tileData.column, tileData.row, subjects.bodiesBounds)
        ).map(tileData => ({
            position: {x: tileData.x, y: tileData.y},
            areaTiles: subjects.respawnTiles.filter(
                areaTile => radius >= Math.hypot(areaTile.x - tileData.x, areaTile.y - tileData.y)
            ).length
        })).sort((tileA, tileB) => tileB.areaTiles - tileA.areaTiles)].shift();
    }

    static placePlayerInRespawnArea(room, sessionId, bodyKey, radius)
    {
        let subjects = RoomAggressionPlacement.fetchSubjects(room, sessionId, bodyKey);
        if(subjects.error){
            return subjects;
        }
        let respawnTilesData = RoomAggressionPlacement.fetchRespawnTilesData(room, subjects.enemyObject);
        subjects.respawnTiles = Object.keys(respawnTilesData).map(tileIndex => respawnTilesData[tileIndex]);
        let tile = RoomAggressionPlacement.findDensestRespawnTile(room, subjects, radius);
        if(!tile){
            return {error: 'No free tile on the enemy '+bodyKey+' respawn area.'};
        }
        RoomAggressionPlacement.placePlayer(subjects.playerSchema, tile.position);
        return {position: tile.position, areaTiles: tile.areaTiles};
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/room-objects/place-player-for-aggression', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomAggressionPlacement.placePlayerForAggression(
                    room,
                    String(sc.get(request.body, 'sessionId', '')),
                    String(sc.get(request.body, 'bodyKey', '')),
                    {
                        minimumDistance: Number(sc.get(request.body, 'minimumDistance', 0)),
                        maximumDistance: Number(sc.get(request.body, 'maximumDistance', 0)),
                        isRespawnTile: sc.get(request.body, 'isRespawnTile', null)
                    }
                )
            );
        });
        serverManager.app.post('/api/e2e/room-objects/place-player-in-respawn-area', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomAggressionPlacement.placePlayerInRespawnArea(
                    room,
                    String(sc.get(request.body, 'sessionId', '')),
                    String(sc.get(request.body, 'bodyKey', '')),
                    Number(sc.get(request.body, 'radius', 0))
                )
            );
        });
        Logger.info('[room-aggression-placement] Aggression placement endpoints registered.');
    }

}

module.exports.RoomAggressionPlacement = RoomAggressionPlacement;
