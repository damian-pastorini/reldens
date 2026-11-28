/**
 *
 * Reldens - Room Side Step Tiles
 *
 * Server side e2e endpoint that lists the tiles next to a player (up, right, down and left of its tile) it can step on:
 * inside the room path finder grid, walkable and with no colliding body of the room other than the player. The room
 * bodies decide it, so a hidden object with no collision response (a disabled enemy) never blocks the step and a
 * colliding one always does, whatever the sprites the client still keeps.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { RoomAggressionPlacement } = require('./room-aggression-placement');
const { Logger, sc } = require('@reldens/utils');

class RoomSideStepTiles
{

    static OFFSETS = [{column: 0, row: -1}, {column: 1, row: 0}, {column: 0, row: 1}, {column: -1, row: 0}];

    static fetchFreeOffsets(room, sessionId)
    {
        let playerSchema = RoomObjectsState.findPlayer(room, '', sessionId);
        if(!playerSchema){
            return {error: 'Player session '+sessionId+' not found in '+room.roomName+'.'};
        }
        let bodiesBounds = room.roomWorld.bodies.filter(
            body => playerSchema.physicalBody !== body && !body.isWall && false !== body.collisionResponse
        ).map(body => body.getAABB());
        let mapJson = room.roomWorld.mapJson;
        let column = Math.floor(playerSchema.physicalBody.position[0] / mapJson.tilewidth);
        let row = Math.floor(playerSchema.physicalBody.position[1] / mapJson.tileheight);
        return {
            freeOffsets: RoomSideStepTiles.OFFSETS.filter(
                offset => RoomAggressionPlacement.isFreeTile(room, column + offset.column, row + offset.row, bodiesBounds)
            )
        };
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/room-objects/side-step-offsets', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomSideStepTiles.fetchFreeOffsets(room, String(sc.get(request.body, 'sessionId', '')))
            );
        });
        Logger.info('[room-side-step-tiles] Side step tiles endpoint registered.');
    }

}

module.exports.RoomSideStepTiles = RoomSideStepTiles;
