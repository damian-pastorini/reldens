/**
 *
 * Reldens - RoomStateEntitiesManager
 *
 * Provides static methods for common room state entity patterns.
 * Simplifies entity lifecycle management with automatic property listening.
 * Browser-only code bundled by Parcel.
 *
 */

const { StateCallbacksManager } = require('./state-callbacks-manager');

class RoomStateEntitiesManager
{

    static onEntityAddWithProperties(room, collectionName, properties, onAddCallback, onPropertyChangeCallback)
    {
        let manager = new StateCallbacksManager(room);
        let wrappedState = manager.wrap(room.state);
        manager.onAdd(wrappedState[collectionName], (entity, key) => {
            if(onAddCallback){
                onAddCallback(entity, key);
            }
            for(let prop of properties){
                manager.listen(entity, prop, (value, previousValue) => {
                    if(onPropertyChangeCallback){
                        onPropertyChangeCallback(entity, key, prop, value, previousValue);
                    }
                });
            }
        });
        return manager;
    }

    static onEntityAddWithPropertyCallbacks(room, collectionName, propertyCallbacks, onAddCallback)
    {
        let manager = new StateCallbacksManager(room);
        let wrappedState = manager.wrap(room.state);
        manager.onAdd(wrappedState[collectionName], (entity, key) => {
            if(onAddCallback){
                onAddCallback(entity, key);
            }
            for(let prop of Object.keys(propertyCallbacks)){
                let callback = propertyCallbacks[prop];
                manager.listen(entity, prop, (value, previousValue) => {
                    callback(entity, key, value, previousValue);
                });
            }
        });
        return manager;
    }

    static onEntityAdd(room, collectionName, callback)
    {
        let manager = new StateCallbacksManager(room);
        let wrappedState = manager.wrap(room.state);
        manager.onAdd(wrappedState[collectionName], callback);
        return manager;
    }

    static onEntityRemove(room, collectionName, callback)
    {
        let manager = new StateCallbacksManager(room);
        let wrappedState = manager.wrap(room.state);
        manager.onRemove(wrappedState[collectionName], callback);
        return manager;
    }

    static createManager(room)
    {
        return new StateCallbacksManager(room);
    }
}

module.exports.RoomStateEntitiesManager = RoomStateEntitiesManager;
