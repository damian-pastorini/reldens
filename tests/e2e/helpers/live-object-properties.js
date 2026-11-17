/**
 *
 * Reldens - Live Object Properties
 *
 * Server side e2e endpoint that changes one property of a live room object found by its key, with or without a body
 * state (like the NPC flags read on every interaction: "sendInvalidOptionMessage" or "closeInteractionOnOutOfReach", or
 * the "roomVisible" and "playerVisible" flags of a door animation), kept per parallel spec group
 * by LiveObjectsOverrides, so the group reset restores the original value.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { LiveObjectsOverrides } = require('./live-objects-overrides');
const { Logger, sc } = require('@reldens/utils');

class LiveObjectProperties
{

    static changeObjectProperty(room, groupKey, objectKey, propertyKey, value)
    {
        let roomObject = RoomObjectsState.findObjectByKey(RoomObjectsState.fetchRoomObjects(room), objectKey);
        if(!roomObject){
            return {error: 'Object '+objectKey+' not found in room '+room.roomName+'.'};
        }
        LiveObjectsOverrides.changeProperty(groupKey, roomObject, propertyKey, value, false);
        return {objectId: roomObject.id, propertyKey, value: roomObject[propertyKey]};
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/live-objects/object-property', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => LiveObjectProperties.changeObjectProperty(
                    room,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'objectKey', ''),
                    String(sc.get(request.body, 'propertyKey', '')),
                    sc.get(request.body, 'value', null)
                )
            );
        });
        Logger.info('[live-object-properties] Object property endpoint registered.');
    }

}

module.exports.LiveObjectProperties = LiveObjectProperties;
