/**
 *
 * Reldens - Drops Probe
 *
 * Server side e2e endpoint for the drops specs: the drop objects of a room (the room objects of the pick up type) with
 * their object id, the id of the item they give, their position and their interaction limits, including the drops the
 * clients never received, with the room auto dispose flag; and the drops of a room removed (like the room removes a
 * picked drop, so the clients get the remove and the room enables its auto dispose again).
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { ObjectsConst } = require('../../../lib/objects/constants');
const { Logger, sc } = require('@reldens/utils');

class DropsProbe
{

    static fetchDropObjects(room)
    {
        let roomObjects = sc.get(room.roomWorld?.objectsManager, 'roomObjects', {});
        return Object.keys(roomObjects).filter(
            objectId => ObjectsConst.DROPS.PICK_UP_ACT === roomObjects[objectId].type
        ).map(objectId => ({id: objectId, dropObject: roomObjects[objectId]}));
    }

    static fetchDrops(room)
    {
        return {
            autoDispose: room.autoDispose,
            drops: DropsProbe.fetchDropObjects(room).map(drop => ({
                id: drop.id,
                itemId: drop.dropObject.itemId,
                x: drop.dropObject.x,
                y: drop.dropObject.y,
                interactionLimits: drop.dropObject.interactionLimits
            }))
        };
    }

    static clearDrops(room)
    {
        let drops = DropsProbe.fetchDropObjects(room);
        for(let drop of drops){
            room.removeObject(drop.dropObject);
        }
        return {removed: drops.length, autoDispose: room.autoDispose};
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/drops/clear', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => DropsProbe.clearDrops(room)
            );
        });
        serverManager.app.get('/api/e2e/drops/state', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.query, 'roomName', ''),
                response,
                async (room) => DropsProbe.fetchDrops(room)
            );
        });
        Logger.info('[drops-probe] Drops endpoints registered.');
    }

}

module.exports.DropsProbe = DropsProbe;
