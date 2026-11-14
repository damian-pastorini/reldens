/**
 *
 * Reldens - Live Objects Overrides
 *
 * Server side e2e endpoints that change a property of the live objects of a scene room (the private params the objects
 * read on every use: the enemies "killScore" and "autoRecovery", or a nested value reached by its path like
 * "rewards/0/hasDropBody", the teleport NPC options and destinations) or of a
 * live body (the movement speed of a player or an object) or of the scene room itself (a flag read when the room was
 * created, like the players last state handler), make the next calls of a method (of a scene room or of another live
 * server object, like the kill score subscriber) fail the way the method fails on a storage error (rejected, like the
 * stats save, or answering false, like the state save, the calls after the given failures run the method, and the calls
 * and failures done are counted per room, or calls key, and method so a spec proves the failure happened), delay every
 * call of that method, hide the client of a player from the room
 * (its schema stays in the state while the room finds no client for it, like a socket gone before the leave) and
 * restore them; and dispose a live room (the stored rooms never dispose when empty), so the next player that enters it
 * creates it again with the stored rows of that moment. The original value of every changed
 * property is kept per parallel spec group the first time it changes, the restore puts back the originals of that
 * group in the reverse order (a property that did not exist is removed again), and the specs that change a property
 * restore their group after every test, so no change reaches the next test.
 *
 */

const timersPromises = require('timers/promises');
const { RoomObjectsState } = require('./room-objects-state');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class LiveObjectsOverrides
{

    static changedProperties = {};
    static methodFailures = {};

    static changeProperty(groupKey, target, propertyKey, value, removeProperty)
    {
        if(!sc.hasOwn(LiveObjectsOverrides.changedProperties, groupKey)){
            LiveObjectsOverrides.changedProperties[groupKey] = [];
        }
        let groupChanges = LiveObjectsOverrides.changedProperties[groupKey];
        if(!groupChanges.some(change => target === change.target && propertyKey === change.propertyKey)){
            groupChanges.push({
                target,
                propertyKey,
                isSet: sc.hasOwn(target, propertyKey),
                value: target[propertyKey]
            });
        }
        if(removeProperty){
            delete target[propertyKey];
            return true;
        }
        target[propertyKey] = value;
        return true;
    }

    static changeEnemiesProperty(room, groupKey, enemyKey, propertyKey, value, removeProperty)
    {
        let enemies = RoomObjectsState.fetchEnemies(room).filter(
            roomObject => enemyKey === roomObject.key || enemyKey === sc.get(roomObject.clientParams, 'asset_key', '')
        );
        if(0 === enemies.length){
            return {error: 'Enemy '+enemyKey+' not found in room '+room.roomName+'.'};
        }
        let pathKeys = propertyKey.split('/');
        let lastKey = pathKeys.pop();
        let targets = enemies.map(enemyObject => LiveObjectsOverrides.fetchPathTarget(enemyObject, pathKeys));
        if(targets.some(target => !target)){
            return {error: 'Property path '+propertyKey+' not found in the enemies '+enemyKey+'.'};
        }
        for(let target of targets){
            LiveObjectsOverrides.changeProperty(groupKey, target, lastKey, value, removeProperty);
        }
        return {changedEnemies: enemies.length};
    }

    static fetchPathTarget(root, pathKeys)
    {
        let target = root;
        for(let pathKey of pathKeys){
            target = target?.[pathKey];
        }
        return target;
    }

    static addTeleportOption(room, groupKey, objectKey, optionKey, option, destination)
    {
        let teleportObject = RoomObjectsState.findObjectByKey(RoomObjectsState.fetchObjectsWithState(room), objectKey);
        if(!teleportObject){
            return {error: 'Object '+objectKey+' not found in room '+room.roomName+'.'};
        }
        LiveObjectsOverrides.changeProperty(
            groupKey,
            teleportObject,
            'options',
            Object.assign({}, teleportObject.options, {[optionKey]: option}),
            false
        );
        LiveObjectsOverrides.changeProperty(
            groupKey,
            teleportObject,
            'destinations',
            Object.assign({}, teleportObject.destinations, {[optionKey]: destination}),
            false
        );
        return {objectId: teleportObject.id, optionKey};
    }

    static changeBodyProperty(room, groupKey, bodyOwner, propertyKey, value)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, bodyOwner);
        let roomObject = RoomObjectsState.findObjectByKey(RoomObjectsState.fetchObjectsWithState(room), bodyOwner);
        let body = playerSchema ? playerSchema.physicalBody : sc.get(roomObject, 'objectBody', false);
        if(!body){
            return {error: 'Body of '+bodyOwner+' not found in room '+room.roomName+'.'};
        }
        LiveObjectsOverrides.changeProperty(groupKey, body, propertyKey, value, false);
        return {bodyOwner, propertyKey, value: body[propertyKey]};
    }

    static changeRoomProperty(room, groupKey, propertyKey, value)
    {
        if(!sc.hasOwn(room, propertyKey)){
            return {error: 'Property '+propertyKey+' not found in room '+room.roomName+'.'};
        }
        LiveObjectsOverrides.changeProperty(groupKey, room, propertyKey, value, false);
        return {propertyKey, value: room[propertyKey]};
    }

    static overrideMethod(groupKey, target, methodKey, behavior)
    {
        if(!sc.isFunction(target[methodKey])){
            return {error: 'Method '+methodKey+' not found in '+behavior.callsKey+'.'};
        }
        let calls = {left: behavior.failuresCount, done: 0, called: 0};
        LiveObjectsOverrides.methodFailures[behavior.callsKey+'.'+methodKey] = calls;
        let method = target[methodKey];
        LiveObjectsOverrides.changeProperty(groupKey, target, methodKey, async (...methodArguments) => {
            calls.called++;
            if(0 < behavior.delayMs){
                await timersPromises.setTimeout(behavior.delayMs);
            }
            if(0 >= calls.left){
                return await method.apply(target, methodArguments);
            }
            calls.left--;
            calls.done++;
            return behavior.rejects ? ErrorManager.error('E2E forced '+methodKey+' failure.') : false;
        }, false);
        return Object.assign({methodKey}, behavior);
    }

    static hideRoomClient(room, groupKey, playerName)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        if(!playerSchema){
            return {error: 'Player '+playerName+' not found in room '+room.roomName+'.'};
        }
        let getClientById = room.getClientById;
        LiveObjectsOverrides.changeProperty(groupKey, room, 'getClientById', (sessionId) => {
            return playerSchema.sessionId === sessionId ? false : getClientById.call(room, sessionId);
        }, false);
        return {hiddenSessionId: playerSchema.sessionId};
    }

    static restoreGroup(groupKey)
    {
        let groupChanges = sc.get(LiveObjectsOverrides.changedProperties, groupKey, []);
        for(let change of [...groupChanges].reverse()){
            if(change.isSet){
                change.target[change.propertyKey] = change.value;
                continue;
            }
            delete change.target[change.propertyKey];
        }
        delete LiveObjectsOverrides.changedProperties[groupKey];
        return groupChanges.length;
    }

    static registerEndpoints(serverManager)
    {
        let app = serverManager.app;
        app.post('/api/e2e/live-objects/enemy-property', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => LiveObjectsOverrides.changeEnemiesProperty(
                    room,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'enemyKey', ''),
                    sc.get(request.body, 'propertyKey', ''),
                    sc.get(request.body, 'value', null),
                    true === sc.get(request.body, 'removeProperty', false)
                )
            );
        });
        app.post('/api/e2e/live-objects/teleport-option', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => LiveObjectsOverrides.addTeleportOption(
                    room,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'objectKey', ''),
                    String(sc.get(request.body, 'optionKey', '')),
                    sc.get(request.body, 'option', {}),
                    sc.get(request.body, 'destination', {})
                )
            );
        });
        app.post('/api/e2e/live-objects/body-property', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => LiveObjectsOverrides.changeBodyProperty(
                    room,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'bodyOwner', ''),
                    sc.get(request.body, 'propertyKey', ''),
                    sc.get(request.body, 'value', null)
                )
            );
        });
        app.post('/api/e2e/live-objects/room-property', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => LiveObjectsOverrides.changeRoomProperty(
                    room,
                    sc.get(request.body, 'group', ''),
                    String(sc.get(request.body, 'propertyKey', '')),
                    sc.get(request.body, 'value', null)
                )
            );
        });
        LiveObjectsOverrides.registerMethodEndpoints(serverManager);
        app.post('/api/e2e/live-objects/hidden-client', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => LiveObjectsOverrides.hideRoomClient(
                    room,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'playerName', '')
                )
            );
        });
        app.post('/api/e2e/live-objects/dispose-room', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => {
                    await room.disconnect();
                    return {disposed: room.roomName};
                }
            );
        });
        app.post('/api/e2e/live-objects/restore', (request, response) => {
            response.json({restored: LiveObjectsOverrides.restoreGroup(sc.get(request.body, 'group', ''))});
        });
        Logger.info('[live-objects-overrides] Live objects overrides endpoints registered.');
    }

    static registerMethodEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/live-objects/room-method-override', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => LiveObjectsOverrides.overrideMethod(
                    sc.get(request.body, 'group', ''),
                    room,
                    String(sc.get(request.body, 'methodKey', '')),
                    {
                        callsKey: room.roomName,
                        delayMs: Number(sc.get(request.body, 'delayMs', 0)),
                        failuresCount: Number(sc.get(request.body, 'failuresCount', 0)),
                        rejects: false !== sc.get(request.body, 'rejects', true)
                    }
                )
            );
        });
        serverManager.app.get('/api/e2e/live-objects/room-method-failures', (request, response) => {
            response.json(sc.get(
                LiveObjectsOverrides.methodFailures,
                sc.get(request.query, 'callsKey', sc.get(request.query, 'roomName', ''))
                    +'.'+sc.get(request.query, 'methodKey', ''),
                {left: 0, done: 0, called: 0}
            ));
        });
    }

}

module.exports.LiveObjectsOverrides = LiveObjectsOverrides;
