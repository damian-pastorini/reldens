/**
 *
 * Reldens - ObjectsManager
 *
 */

const { Logger, sc } = require('@reldens/utils');

class ObjectsManager
{

    constructor(props)
    {
        this.config = props.config;
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ObjectsManager.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in ObjectsManager.');
        }
        // room objects is just the list of the objects in the storage:
        this.roomObjectsData = false;
        // room objects by layer and title are each object instance plus the data from the storage:
        this.roomObjects = false;
        this.roomObjectsByLayer = {};
        this.preloadAssets = [];
        this.objectsAnimationsData = {};
        this.listenMessages = false;
        this.listenMessagesObjects = {};
    }

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
            ['parent_room', 'objects_assets', 'objects_animations', 'objects_stats.[parent_stat]']
        );
    }

    async generateObjects()
    {
        if(!this.roomObjectsData || 0 === this.roomObjectsData.length){
            return this.roomObjects;
        }
        this.roomObjects = {};
        // @NOTE: allow null index for multiple objects of the same type.
        for (let objectData of this.roomObjectsData) {
            await this.generateObjectFromObjectData(objectData);
        }
    }

    async generateObjectFromObjectData(objectData)
    {
        // @NOTE: these classes are coming from the theme/plugins/objects/server.js file.
        let objClass = this.config.get('server/customClasses/objects/' + objectData.object_class_key);
        let objectClassTypes = this.config?.configList?.server?.objectsClassTypes;
        // @TODO - WIP - FIX WITH OBJECT TYPES.
        if (!objClass) {
            Logger.error([
                'ObjectManager class not found.',
                '- Object ID:', objectData.id,
                '- Custom class:', objectData.object_class_key
            ]);
            return false;
        }
        let objProps = Object.assign(
            { config: this.config, events: this.events, dataServer: this.dataServer },
            objectData
        );
        this.prepareInitialStats(objProps);
        try {
            let objectInstance = new objClass(objProps);
            this.attachToAnimations(objectInstance);
            if (sc.hasOwn(objectInstance, 'multiple')) {
                objectInstance.objProps = objProps;
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
            if (!this.roomObjectsByLayer[objectData.layer_name]) {
                this.roomObjectsByLayer[objectData.layer_name] = {};
            }
            this.roomObjectsByLayer[objectData.layer_name][objectData.id] = objectInstance;
        } catch (err) {
            Logger.error({ 'Error while generating object': err, 'Object Data': objectData });
        }
    }

    prepareInitialStats(objProps)
    {
        let stats = sc.get(objProps, 'objects_stats', []);
        if(0 === stats.length){
            return;
        }
        if(!objProps.initialStats){
            objProps.initialStats = {};
        }
        for(let stat of stats){
            objProps.initialStats[stat.parent_stat.key] = stat.value;
        }
    }

    async runAdditionalSetup(objectInstance, objectData)
    {
        if(!sc.isObjectFunction(objectInstance, 'runAdditionalSetup')){
            return false;
        }
        objectInstance.runAdditionalSetup({objectsManager: this, objectData});
    }

    prepareAssetsPreload(objectData)
    {
        if(!objectData.objects_assets){
            return false;
        }
        for(let asset of objectData.objects_assets){
            // @NOTE: assets can be different types, sprite sheets, images, atlas, etc. We push them
            // here to later send these to the client along with the sceneData.
            this.preloadAssets.push(asset);
        }
    }

    attachToMessagesListeners(objectInstance, objectData)
    {
        // prepare object for room messages:
        if(!sc.hasOwn(objectInstance, 'listenMessages')){
            return false;
        }
        this.listenMessages = true;
        this.listenMessagesObjects[objectData.id] = objectInstance;
    }

    enrichWithMultipleAnimationsData(objectData, objectInstance)
    {
        if(!objectData.objects_animations){
            return false;
        }
        objectInstance.multipleAnimations = {};
        for(let anim of objectData.objects_animations){
            // @NOTE: assets can be different types, sprite sheets, images, atlas, etc.
            // We push them here to later send these to the client along with the sceneData.
            objectInstance.multipleAnimations[anim.animationKey] = sc.toJson(anim.animationData);
        }
    }

    attachToAnimations(objectInstance)
    {
        // if the result is an animation instance then we can include it in the list to send it to the client:
        if(sc.hasOwn(objectInstance, 'isAnimation') || sc.hasOwn(objectInstance, 'hasAnimation')){
            this.objectsAnimationsData[objectInstance.objectIndex] = objectInstance.clientParams;
        }
    }

    /**
     * The object instance is created when the world is created since we don't need to overload the server by creating
     * every object defined if it is not going to be used.
     */
    getObjectData(objectIndex)
    {
        if(sc.hasOwn(this.roomObjects, objectIndex)){
            return this.roomObjects[objectIndex];
        }
        return false;
    }

    removeObjectData(rewardObject)
    {
        this.removeFromPreloadAssetsArray(rewardObject.objects_assets);
        delete this.roomObjects[rewardObject.objectIndex];
        delete this.objectsAnimationsData[rewardObject.objectIndex];
    }

    removeFromPreloadAssetsArray(objectAssets)
    {
        for(let objectAsset of objectAssets){
            this.preloadAssets = this.preloadAssets.filter(obj => obj.object_id !== objectAsset.object_id);
        }
    }

}

module.exports.ObjectsManager = ObjectsManager;
