/**
 *
 * Reldens - ObjectsManager
 *
 * Manages loading, generating, and lifecycle of game objects within a room.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 */
class ObjectsManager
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.config = props.config;
        /** @type {EventsManager|false} */
        this.events = sc.get(props, 'events', false);
        /** @type {number|string|false} */
        this.roomId = sc.get(props, 'roomId', false);
        /** @type {string|false} */
        this.roomName = sc.get(props, 'roomName', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ObjectsManager.');
        }
        /** @type {BaseDataServer|false} */
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in ObjectsManager.');
        }
        /** @type {Array<Object>|false} */
        this.roomObjectsData = false;
        /** @type {Object<string, Object>|false} */
        this.roomObjects = false;
        /** @type {Object<string, Object>} */
        this.roomObjectsByLayer = {};
        /** @type {Object<string, Object>} */
        this.preloadAssets = {};
        /** @type {Object<string, Object>} */
        this.objectsAnimationsData = {};
        /** @type {boolean} */
        this.listenMessages = false;
        /** @type {Object<string, Object>} */
        this.listenMessagesObjects = {};
    }

    /**
     * @param {number|string} roomId
     * @returns {Promise<Array<Object>|false>}
     */
    async loadObjectsByRoomId(roomId)
    {
        if(this.roomObjectsData){
            return this.roomObjectsData;
        }
        let objectsRepository = this.dataServer.getEntity('objects');
        objectsRepository.sortBy = 'tile_index';
        this.roomObjectsData = await objectsRepository.loadByWithRelations(
            'room_id',
            roomId,
            [
                'related_rooms',
                'related_objects_assets',
                'related_objects_animations',
                'related_objects_stats.related_stats'
            ]
        );
    }

    /**
     * @returns {Promise<Object<string, Object>|false>}
     */
    async generateObjects()
    {
        if(!this.roomObjectsData || 0 === this.roomObjectsData.length){
            return this.roomObjects;
        }
        this.roomObjects = {};
        // @NOTE: allow null index for multiple objects of the same type.
        for(let objectData of this.roomObjectsData){
            await this.generateObjectFromObjectData(objectData);
        }
    }

    /**
     * @param {Object} objectData
     * @returns {Promise<Object|false>}
     */
    async generateObjectFromObjectData(objectData)
    {
        // @NOTE: these classes are coming from the theme/plugins/objects/server.js file.
        let objClass = this.config.getWithoutLogs('server/customClasses/objects/'+objectData.object_class_key, false);
        let objectClassTypes = this.config?.configList?.server?.objectsClassTypes;
        if(!objClass && objectClassTypes && objectData.class_type){
            let objClassData = sc.get(objectClassTypes, objectData.class_type, false);
            if(objClassData){
                objClass = objClassData.classInstance;
            }
        }
        if(!objClass){
            Logger.error('ObjectManager object class type not found.', objectData);
            return false;
        }
        let objProps = Object.assign(
            {config: this.config, events: this.events, dataServer: this.dataServer},
            objectData
        );
        // @TODO - BETA - Create a memory cache for objects information and avoid the data reload and remap.
        this.prepareInitialStats(objProps);
        try {
            let objectInstance = new objClass(objProps);
            this.attachToAnimations(objectInstance);
            if(objectInstance.multiple){
                objectInstance.objProps = objProps;
                let subObjClass = false;
                if(objectClassTypes && objectInstance.childObjectType){
                    let objClassData = sc.get(objectClassTypes, objectInstance.childObjectType, false);
                    if(objClassData){
                        subObjClass = objClassData.classInstance;
                    }
                }
                if(objectInstance.childObjectType && !subObjClass){
                    Logger.error('ObjectManager sub-object class type not found.', {
                        objectClassKey: objectData.object_class_key,
                        childObjectType: objectInstance.childObjectType
                    });
                    return false;
                }
                objectInstance.classInstance = subObjClass;
            }
            this.enrichWithMultipleAnimationsData(objectData, objectInstance);
            this.attachToMessagesListeners(objectInstance, objectData);
            this.prepareAssetsPreload(objectData);
            await this.runAdditionalSetup(objectInstance, objectData);
            this.events.emit('reldens.afterRunAdditionalSetup', {
                objectInstance,
                objectData,
                objectsManager: this
            });
            this.roomObjects[objectInstance.objectIndex] = objectInstance;
            if(!this.roomObjectsByLayer[objectData.layer_name]){
                this.roomObjectsByLayer[objectData.layer_name] = {};
            }
            this.roomObjectsByLayer[objectData.layer_name][objectData.id] = objectInstance;
            return objectInstance;
        } catch (error) {
            Logger.error('Error while generating object.', error, objectData);
            return false;
        }
    }

    /**
     * @param {Object} objProps
     */
    prepareInitialStats(objProps)
    {
        //Logger.debug('Preparing initial stats:', objProps);
        let stats = sc.get(objProps, 'related_objects_stats', []);
        if(0 === stats.length){
            return;
        }
        if(!objProps.initialStats){
            objProps.initialStats = {};
        }
        for(let stat of stats){
            objProps.initialStats[stat.related_stats.key] = stat.value;
        }
    }

    /**
     * @param {Object} objectInstance
     * @param {Object} objectData
     * @returns {Promise<boolean|undefined>}
     */
    async runAdditionalSetup(objectInstance, objectData)
    {
        if(!sc.isObjectFunction(objectInstance, 'runAdditionalSetup')){
            return false;
        }
        objectInstance.runAdditionalSetup({objectsManager: this, objectData});
    }

    /**
     * @param {Object} objectData
     */
    prepareAssetsPreload(objectData)
    {
        //Logger.debug('Preparing object assets preload:', objectData);
        if(!objectData.related_objects_assets){
            return false;
        }
        for(let asset of objectData.related_objects_assets){
            // @NOTE: assets can be different types, sprite sheets, images, atlas, etc. We push them
            // here to later send these to the client along with the sceneData.
            this.preloadAssets[(asset.object_id || '')+(asset.object_asset_id || '')] = asset;
        }
    }

    /**
     * @param {Object} objectInstance
     * @param {Object} objectData
     */
    attachToMessagesListeners(objectInstance, objectData)
    {
        // prepare an object for room messages:
        if(!sc.hasOwn(objectInstance, 'listenMessages')){
            return false;
        }
        this.listenMessages = true;
        this.listenMessagesObjects[objectData.id] = objectInstance;
    }

    /**
     * @param {Object} objectData
     * @param {Object} objectInstance
     */
    enrichWithMultipleAnimationsData(objectData, objectInstance)
    {
        if(!objectData.related_objects_animations){
            return false;
        }
        objectInstance.multipleAnimations = {};
        for(let anim of objectData.related_objects_animations){
            // @NOTE: assets can be different types, sprite sheets, images, atlas, etc.
            // We push them here to later send these to the client along with the sceneData.
            objectInstance.multipleAnimations[anim.animationKey] = sc.toJson(anim.animationData);
        }
    }

    /**
     * @param {Object} objectInstance
     */
    attachToAnimations(objectInstance)
    {
        // if the result is an animation instance, then we can include it in the list to send it to the client:
        if(sc.hasOwn(objectInstance, 'isAnimation') || sc.hasOwn(objectInstance, 'hasAnimation')){
            this.objectsAnimationsData[objectInstance.objectIndex] = objectInstance.clientParams;
        }
    }

    /**
     * The object instance is created when the world is created since we don't need to overload the server by creating
     * every object defined if it is not going to be used.
     *
     * @param {string} objectIndex
     * @returns {Object|false}
     */
    getObjectData(objectIndex)
    {
        if(sc.hasOwn(this.roomObjects, objectIndex)){
            return this.roomObjects[objectIndex];
        }
        return false;
    }

    /**
     * @param {Object} rewardObject
     */
    removeObjectData(rewardObject)
    {
        this.removeFromPreloadAssetsArray(rewardObject.objects_assets);
        delete this.roomObjects[rewardObject.objectIndex];
        delete this.objectsAnimationsData[rewardObject.objectIndex];
    }

    /**
     * @param {Array<Object>} objectAssets
     */
    removeFromPreloadAssetsArray(objectAssets)
    {
        for(let objectAsset of objectAssets){
            delete this.preloadAssets[(objectAsset.object_id || '')+(objectAsset.object_asset_id || '')];
        }
    }

}

module.exports.ObjectsManager = ObjectsManager;
