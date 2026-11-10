/**
 *
 * Reldens - Room Change Point Placement
 *
 * Server side e2e endpoint that puts a player on the change point body of its room that leads to the given room (the
 * player body is stopped and placed on the change point center), so the next world step runs the same change point hit
 * as a player walking into it and the player changes scene.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { RoomAggressionPlacement } = require('./room-aggression-placement');
const { Logger, sc } = require('@reldens/utils');

class RoomChangePointPlacement
{

    static placePlayerOnChangePoint(room, sessionId, nextRoomName)
    {
        let playerSchema = RoomObjectsState.findPlayer(room, '', sessionId);
        let changePoint = room.roomWorld.bodies.find(body => nextRoomName === body.changeScenePoint);
        if(!playerSchema || !changePoint){
            return {
                error: 'Player session '+sessionId+' or a change point to '+nextRoomName+' not found in '+room.roomName+'.'
            };
        }
        let position = {x: changePoint.position[0], y: changePoint.position[1]};
        RoomAggressionPlacement.placePlayer(playerSchema, position);
        return {position};
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/room-objects/place-player-on-change-point', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomChangePointPlacement.placePlayerOnChangePoint(
                    room,
                    String(sc.get(request.body, 'sessionId', '')),
                    String(sc.get(request.body, 'nextRoomName', ''))
                )
            );
        });
        Logger.info('[room-change-point-placement] Change point placement endpoint registered.');
    }

}

module.exports.RoomChangePointPlacement = RoomChangePointPlacement;
