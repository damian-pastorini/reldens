/**
 *
 * Reldens - StateCallbacksManager
 *
 * Manages Colyseus state callbacks via ColyseusDriver.
 * Provides a unified API for state callback handling. Centralizes all state
 * callback logic to minimize migration changes. Browser-only code bundled
 * by Parcel.
 *
 */

const { SyncClientDriver } = require('../../../sync/client/colyseus/sync-client-driver');
const { getStateCallbacks } = SyncClientDriver;

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

    trackCleanup(cleanup)
    {
        if(cleanup){
            this.cleanupFunctions.push(cleanup);
        }
        return cleanup;
    }

    onAdd(collection, callback)
    {
        return this.trackCleanup(collection.onAdd(callback));
    }

    onRemove(collection, callback)
    {
        return this.trackCleanup(collection.onRemove(callback));
    }

    onChange(collection, callback)
    {
        return this.trackCleanup(collection.onChange(callback));
    }

    listen(entity, propertyName, callback)
    {
        return this.trackCleanup(this.wrap(entity).listen(propertyName, callback));
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
