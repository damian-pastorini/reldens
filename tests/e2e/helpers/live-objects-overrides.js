/**
 *
 * Reldens - Live Objects Overrides
 *
 * Server side e2e endpoints that change a property of the live objects of a scene room (the private params the objects
 * read on every use: the enemies "killScore" and "autoRecovery", the teleport NPC options and destinations) and restore
 * them. The original value of every changed property is kept per parallel spec group the first time it changes, the
 * restore puts back the originals of that group in the reverse order (a property that did not exist is removed again),
 * and the specs that change a property restore their group after every test, so no change reaches the next test.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { Logger, sc } = require('@reldens/utils');

class LiveObjectsOverrides
{

    static changedProperties = {};

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
        for(let enemyObject of enemies){
            LiveObjectsOverrides.changeProperty(groupKey, enemyObject, propertyKey, value, removeProperty);
        }
        return {changedEnemies: enemies.length};
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
        app.post('/api/e2e/live-objects/restore', (request, response) => {
            response.json({restored: LiveObjectsOverrides.restoreGroup(sc.get(request.body, 'group', ''))});
        });
        Logger.info('[live-objects-overrides] Live objects overrides endpoints registered.');
    }

}

module.exports.LiveObjectsOverrides = LiveObjectsOverrides;
