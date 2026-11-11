/**
 *
 * Reldens - Timing Objects Probe
 *
 * Server side e2e endpoints for the timing objects specs of a live scene room: a cancel rule of a timing object
 * ("cancelOnMove", "cancelOnHit", "cancelOnOutOfRange", or its duration in the client params) changed for the group,
 * the object interaction messages the room hands to an object counted from now on (every "oi" act, whatever its id),
 * its stop held for the group (the checks interval finds a player gone and stops nothing, like a player that leaves in
 * the last checks interval before the timer ends, so the completion runs for a player that left the room),
 * the timing state of an object (its position, interaction area and cancel rules, running or not, its body state,
 * whether its shapes still collide and the respawn timer set by its last completion), the respawn of an object pinned
 * for the group to the free respawn tile closest to the place it leaves among the tiles farther than its interaction
 * area plus half a tile from a given player (instead of a random tile, which can be the same tile or one next to it;
 * with no such free tile the respawn stays random and the error is logged), and the next calls of a method of a player
 * inventory manager (the
 * "addItem" a completion runs) delayed, answering false (like a full inventory) or rejected, kept and restored per
 * parallel spec group by LiveObjectsOverrides.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { LiveObjectsOverrides } = require('./live-objects-overrides');
const { ObjectsConst } = require('../../../lib/objects/constants');
const { Logger, sc } = require('@reldens/utils');

class TimingObjectsProbe
{

    static interactionCounters = {};

    static findTimingObject(room, objectKey)
    {
        let roomObjects = sc.get(room.objectsManager, 'roomObjects', {});
        return RoomObjectsState.findObjectByKey(
            Object.keys(roomObjects).map(objectIndex => roomObjects[objectIndex]).filter(roomObject => roomObject.objectBody),
            objectKey
        );
    }

    static changeObjectProperty(room, groupKey, objectKey, propertyKey, value)
    {
        let timingObject = TimingObjectsProbe.findTimingObject(room, objectKey);
        if(!timingObject){
            return {error: 'Object '+objectKey+' not found in room '+room.roomName+'.'};
        }
        LiveObjectsOverrides.changeProperty(groupKey, timingObject, propertyKey, value, false);
        return {objectKey, propertyKey, value: timingObject[propertyKey]};
    }

    static countInteractions(room, groupKey, objectKey)
    {
        let timingObject = TimingObjectsProbe.findTimingObject(room, objectKey);
        if(!timingObject){
            return {error: 'Object '+objectKey+' not found in room '+room.roomName+'.'};
        }
        let counter = {interactions: 0};
        TimingObjectsProbe.interactionCounters[objectKey] = counter;
        let executeMessageActions = timingObject.executeMessageActions;
        LiveObjectsOverrides.changeProperty(groupKey, timingObject, 'executeMessageActions', async (...messageArguments) => {
            let message = sc.get(messageArguments, 1, {});
            if(ObjectsConst.OBJECT_INTERACTION === sc.get(message, 'act', '')){
                counter.interactions++;
            }
            return await executeMessageActions.apply(timingObject, messageArguments);
        }, false);
        return {objectKey, interactions: counter.interactions};
    }

    static holdTimingStop(room, groupKey, objectKey)
    {
        let timingObject = TimingObjectsProbe.findTimingObject(room, objectKey);
        if(!timingObject){
            return {error: 'Object '+objectKey+' not found in room '+room.roomName+'.'};
        }
        LiveObjectsOverrides.changeProperty(groupKey, timingObject, 'stopTiming', () => false, false);
        return {objectKey, isStopHeld: true};
    }

    static fetchTimingState(room, objectKey)
    {
        let timingObject = TimingObjectsProbe.findTimingObject(room, objectKey);
        if(!timingObject){
            return {error: 'Object '+objectKey+' not found in room '+room.roomName+'.'};
        }
        let objectBody = timingObject.objectBody;
        return {
            key: timingObject.key,
            x: Math.round(objectBody.position[0]),
            y: Math.round(objectBody.position[1]),
            interactionArea: Number(timingObject.interactionArea || 0),
            cancelOnMove: true === timingObject.cancelOnMove,
            cancelOnHit: true === timingObject.cancelOnHit,
            cancelOnOutOfRange: true === timingObject.cancelOnOutOfRange,
            isActive: true === timingObject.isActive,
            inState: sc.get(sc.get(objectBody, 'bodyState', {}), 'inState', 0),
            collides: objectBody.shapes.every(shape => objectBody.originalCollisionGroup === shape.collisionGroup),
            respawnTimer: Boolean(timingObject.respawnTimer),
            respawnTimerId: Number(timingObject.respawnTimer || 0),
            timingDuration: Number(sc.get(timingObject.clientParams, 'timingDuration', 0)),
            clientParams: Object.assign({}, timingObject.clientParams),
            rewards: timingObject.rewards || null
        };
    }

    static pickOutOfReachTile(respawnArea, pin, objectIndex)
    {
        let reach = Number(pin.timingObject.interactionArea || 0) + respawnArea.world.mapJson.tilewidth / 2;
        let playerPosition = pin.playerBody.position;
        let oldPosition = pin.timingObject.objectBody.position;
        let tile = sc.get([...respawnArea.respawnTiles.map(index => ({
            index,
            tileData: respawnArea.respawnTilesData[index]
        })).filter(
            candidate => !sc.hasOwn(respawnArea.usedTiles, candidate.index) && reach < Math.max(
                Math.abs(candidate.tileData.x - playerPosition[0]),
                Math.abs(candidate.tileData.y - playerPosition[1])
            )
        ).map(candidate => ({
            index: candidate.index,
            distance: Math.max(
                Math.abs(candidate.tileData.x - oldPosition[0]),
                Math.abs(candidate.tileData.y - oldPosition[1])
            )
        })).sort((tileA, tileB) => tileA.distance - tileB.distance || tileA.index - tileB.index)], 0, false);
        if(!tile){
            Logger.error('[timing-objects-probe] No free respawn tile out of reach, the respawn tile stays random.');
            return pin.fetchRandomTile(objectIndex);
        }
        respawnArea.removeObjectPreviousUsedTile(objectIndex);
        respawnArea.usedTiles[tile.index] = objectIndex;
        return {randomTileIndex: tile.index, tileData: respawnArea.respawnTilesData[tile.index]};
    }

    static pinRespawnOutOfReach(room, groupKey, objectKey, playerName)
    {
        let timingObject = TimingObjectsProbe.findTimingObject(room, objectKey);
        let respawnArea = sc.get(room.roomWorld?.respawnAreas, timingObject?.respawnLayer, false);
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        if(!respawnArea || !playerSchema){
            return {error: 'Respawn area of '+objectKey+' or player '+playerName+' not found in room '+room.roomName+'.'};
        }
        let pin = {
            timingObject,
            playerBody: playerSchema.physicalBody,
            fetchRandomTile: respawnArea.getRandomTile.bind(respawnArea)
        };
        LiveObjectsOverrides.changeProperty(groupKey, respawnArea, 'getRandomTile', (objectIndex) => {
            return TimingObjectsProbe.pickOutOfReachTile(respawnArea, pin, objectIndex);
        }, false);
        return {objectKey, isRespawnPinned: true};
    }

    static overrideInventoryMethod(room, groupKey, playerName, methodKey, behavior)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        if(!playerSchema?.inventory?.manager){
            return {error: 'Inventory of '+playerName+' not found in room '+room.roomName+'.'};
        }
        return LiveObjectsOverrides.overrideMethod(groupKey, playerSchema.inventory.manager, methodKey, behavior);
    }

    static registerEndpoints(serverManager)
    {
        let app = serverManager.app;
        app.post('/api/e2e/timing-objects/object-property', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => TimingObjectsProbe.changeObjectProperty(
                    room,
                    sc.get(request.body, 'group', ''),
                    String(sc.get(request.body, 'objectKey', '')),
                    String(sc.get(request.body, 'propertyKey', '')),
                    sc.get(request.body, 'value', null)
                )
            );
        });
        app.post('/api/e2e/timing-objects/count-interactions', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => TimingObjectsProbe.countInteractions(
                    room,
                    sc.get(request.body, 'group', ''),
                    String(sc.get(request.body, 'objectKey', ''))
                )
            );
        });
        app.get('/api/e2e/timing-objects/interactions', (request, response) => {
            response.json(sc.get(TimingObjectsProbe.interactionCounters, String(sc.get(request.query, 'objectKey', '')), {}));
        });
        app.post('/api/e2e/timing-objects/hold-stop', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => TimingObjectsProbe.holdTimingStop(
                    room,
                    sc.get(request.body, 'group', ''),
                    String(sc.get(request.body, 'objectKey', ''))
                )
            );
        });
        app.post('/api/e2e/timing-objects/pin-respawn-out-of-reach', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => TimingObjectsProbe.pinRespawnOutOfReach(
                    room,
                    sc.get(request.body, 'group', ''),
                    String(sc.get(request.body, 'objectKey', '')),
                    String(sc.get(request.body, 'playerName', ''))
                )
            );
        });
        app.get('/api/e2e/timing-objects/state', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.query, 'roomName', ''),
                response,
                async (room) => TimingObjectsProbe.fetchTimingState(room, String(sc.get(request.query, 'objectKey', '')))
            );
        });
        app.post('/api/e2e/timing-objects/inventory-method-override', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => TimingObjectsProbe.overrideInventoryMethod(
                    room,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'playerName', ''),
                    String(sc.get(request.body, 'methodKey', '')),
                    {
                        callsKey: 'inventory.'+sc.get(request.body, 'playerName', ''),
                        delayMs: Number(sc.get(request.body, 'delayMs', 0)),
                        failuresCount: Number(sc.get(request.body, 'failuresCount', 0)),
                        rejects: true === sc.get(request.body, 'rejects', false)
                    }
                )
            );
        });
        Logger.info('[timing-objects-probe] Timing objects endpoints registered.');
    }

}

module.exports.TimingObjectsProbe = TimingObjectsProbe;
