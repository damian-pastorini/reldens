/**
 *
 * Reldens - Room Change Point Placement
 *
 * Server side e2e endpoint that puts a player on the change point body of its room that leads to the given room (the
 * player body is stopped and placed on the change point center), so the next world step runs the same change point hit
 * as a player walking into it and the player changes scene. With a tile index it uses the change point body created on
 * that tile (it must lead to the given room), without it the first change point body that leads to the given room.
 * The stored change points of a room are listed with their next room, whether the world created their body and whether
 * their tile is walkable on the path finder grid (a stored change point on a blocked tile gets no body; null in a room
 * without path finder, like the gravity rooms).
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { RoomAggressionPlacement } = require('./room-aggression-placement');
const { Logger, sc } = require('@reldens/utils');

class RoomChangePointPlacement
{

    static findChangePoint(room, nextRoomName, tileIndex)
    {
        return [
            '' === tileIndex
                ? room.roomWorld.bodies.find(body => nextRoomName === body.changeScenePoint)
                : sc.get(room.roomWorld.createdChangePoints, tileIndex, false)
        ].find(changePoint => nextRoomName === changePoint?.changeScenePoint) || false;
    }

    static placePlayerOnChangePoint(room, sessionId, nextRoomName, tileIndex)
    {
        let playerSchema = RoomObjectsState.findPlayer(room, '', sessionId);
        let changePoint = RoomChangePointPlacement.findChangePoint(room, nextRoomName, tileIndex);
        if(!playerSchema || !changePoint){
            return {
                error: 'Player session '+sessionId+' or a change point to '+nextRoomName+' (tile "'+tileIndex+'") not found in '
                    +room.roomName+'.'
            };
        }
        let position = {x: changePoint.position[0], y: changePoint.position[1]};
        RoomAggressionPlacement.placePlayer(playerSchema, position);
        return {position};
    }

    static fetchChangePoints(world)
    {
        let changePoints = [];
        for(let tileIndex of Object.keys(sc.get(world, 'changePoints', {}))){
            let tile = world.fetchPositionFromTileIndex(Number(tileIndex));
            changePoints.push({
                tileIndex,
                nextRoomName: world.changePoints[tileIndex],
                created: Boolean(sc.get(world.createdChangePoints, tileIndex, false)),
                walkable: world.pathFinder ? world.pathFinder.grid.isWalkableAt(tile.col, tile.row) : null
            });
        }
        return {changePoints};
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.get('/api/e2e/room-objects/change-points', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.query, 'roomName', ''),
                response,
                async (room) => RoomChangePointPlacement.fetchChangePoints(room.roomWorld)
            );
        });
        serverManager.app.post('/api/e2e/room-objects/place-player-on-change-point', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomChangePointPlacement.placePlayerOnChangePoint(
                    room,
                    String(sc.get(request.body, 'sessionId', '')),
                    String(sc.get(request.body, 'nextRoomName', '')),
                    String(sc.get(request.body, 'tileIndex', ''))
                )
            );
        });
        Logger.info('[room-change-point-placement] Change point placement endpoint registered.');
    }

}

module.exports.RoomChangePointPlacement = RoomChangePointPlacement;
