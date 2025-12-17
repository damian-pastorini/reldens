/**
 *
 * Reldens - StateCallbacksManager
 *
 * Manages Colyseus 0.16 state callbacks with getStateCallbacks wrapper.
 * Provides a unified API for state callback handling. Centralizes all state
 * callback logic to minimize migration changes. Browser-only code bundled
 * by Parcel.
 *
 */

const { getStateCallbacks } = require('colyseus.js');

class StateCallbacksManager
{

    constructor(room)
    {
        this.room = room;
        this.$ = getStateCallbacks(room);
        this.cleanupFunctions = [];
    }

    wrap(schemaObject)
    {
        return this.$(schemaObject);
    }

    onAdd(collection, callback)
    {
        let cleanup = collection.onAdd(callback);
        if(cleanup){
            this.cleanupFunctions.push(cleanup);
        }
        return cleanup;
    }

    onRemove(collection, callback)
    {
        let cleanup = collection.onRemove(callback);
        if(cleanup){
            this.cleanupFunctions.push(cleanup);
        }
        return cleanup;
    }

    onChange(collection, callback)
    {
        let cleanup = collection.onChange(callback);
        if(cleanup){
            this.cleanupFunctions.push(cleanup);
        }
        return cleanup;
    }

    listen(entity, propertyName, callback)
    {
        let wrappedEntity = this.wrap(entity);
        let cleanup = wrappedEntity.listen(propertyName, callback);
        if(cleanup){
            this.cleanupFunctions.push(cleanup);
        }
        return cleanup;
    }

    listenAll(entity, properties, callback)
    {
        for(let prop of properties){
            this.listen(entity, prop, (value, previousValue) => {
                callback(prop, value, previousValue);
            });
        }
    }

    dispose()
    {
        for(let cleanup of this.cleanupFunctions){
            if('function' === typeof cleanup){
                cleanup();
            }
        }
        this.cleanupFunctions = [];
    }
}

module.exports.StateCallbacksManager = StateCallbacksManager;
