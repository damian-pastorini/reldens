/**
 *
 * Reldens - Room Border Placement
 *
 * Server side e2e endpoint that places a player on the free walkable tile closest to one border of the room map (top,
 * bottom, left or right; on that border line the tile closest to the map middle), read from the room path finder grid
 * only inside the map (the grid has an extra column and row outside the map, ISSUE #343), so a spec can push the player
 * against that border from there. The free tiles never overlap a colliding body of the room other than the placed
 * player. The answer holds the placed tile, its position and the map size in pixels.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { RoomAggressionPlacement } = require('./room-aggression-placement');
const { Logger, sc } = require('@reldens/utils');

class RoomBorderPlacement
{

    static BORDERS = {
        top: {axis: 1, sign: -1},
        bottom: {axis: 1, sign: 1},
        left: {axis: 0, sign: -1},
        right: {axis: 0, sign: 1}
    };

    static fetchFreeTiles(room, playerSchema)
    {
        let mapJson = room.roomWorld.mapJson;
        let bodiesBounds = room.roomWorld.bodies.filter(
            body => playerSchema.physicalBody !== body && !body.isWall && false !== body.collisionResponse
        ).map(body => body.getAABB());
        let tiles = [];
        for(let row = 0; row < mapJson.height; row++){
            for(let column = 0; column < mapJson.width; column++){
                if(RoomAggressionPlacement.isFreeTile(room, column, row, bodiesBounds)){
                    tiles.push([column, row]);
                }
            }
        }
        return tiles;
    }

    static findBorderTile(room, playerSchema, border)
    {
        let mapJson = room.roomWorld.mapJson;
        let middle = [mapJson.width / 2, mapJson.height / 2];
        let otherAxis = 0 === border.axis ? 1 : 0;
        return RoomBorderPlacement.fetchFreeTiles(room, playerSchema).sort(
            (tileA, tileB) => border.sign * (tileB[border.axis] - tileA[border.axis])
                || Math.abs(tileA[otherAxis] - middle[otherAxis]) - Math.abs(tileB[otherAxis] - middle[otherAxis])
        ).shift();
    }

    static placePlayerOnBorder(room, playerName, borderName)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        let border = sc.get(RoomBorderPlacement.BORDERS, borderName, false);
        if(!playerSchema || !border){
            return {error: 'Player '+playerName+' or border '+borderName+' not found in '+room.roomName+'.'};
        }
        let tile = RoomBorderPlacement.findBorderTile(room, playerSchema, border);
        if(!tile){
            return {error: 'No free tile on the '+borderName+' border of '+room.roomName+'.'};
        }
        let mapJson = room.roomWorld.mapJson;
        let position = {
            x: tile[0] * mapJson.tilewidth + mapJson.tilewidth / 2,
            y: tile[1] * mapJson.tileheight + mapJson.tileheight / 2
        };
        RoomAggressionPlacement.placePlayer(playerSchema, position);
        return {
            tile,
            position,
            mapSize: {width: mapJson.width * mapJson.tilewidth, height: mapJson.height * mapJson.tileheight}
        };
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/room-borders/place-player', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomBorderPlacement.placePlayerOnBorder(
                    room,
                    String(sc.get(request.body, 'playerName', '')),
                    String(sc.get(request.body, 'border', ''))
                )
            );
        });
        Logger.info('[room-border-placement] Border placement endpoint registered.');
    }

}

module.exports.RoomBorderPlacement = RoomBorderPlacement;
