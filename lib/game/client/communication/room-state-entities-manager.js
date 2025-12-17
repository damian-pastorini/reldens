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
        let propertyCallbacks = {};
        for(let prop of properties){
            propertyCallbacks[prop] = (entity, key, value, previousValue) => {
                if(onPropertyChangeCallback){
                    onPropertyChangeCallback(entity, key, prop, value, previousValue);
                }
            };
        }
        return this.onEntityAddWithPropertyCallbacks(room, collectionName, propertyCallbacks, onAddCallback);
    }

    static onEntityAddWithPropertyCallbacks(room, collectionName, propertyCallbacks, onAddCallback)
    {
        let manager = this.createManager(room);
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
        return this._onCollectionEvent(room, collectionName, 'onAdd', callback);
    }

    static onEntityRemove(room, collectionName, callback)
    {
        return this._onCollectionEvent(room, collectionName, 'onRemove', callback);
    }

    static createManager(room)
    {
        return new StateCallbacksManager(room);
    }

    static _onCollectionEvent(room, collectionName, eventType, callback)
    {
        let manager = this.createManager(room);
        let wrappedState = manager.wrap(room.state);
        manager[eventType](wrappedState[collectionName], callback);
        return manager;
    }

}

module.exports.RoomStateEntitiesManager = RoomStateEntitiesManager;
