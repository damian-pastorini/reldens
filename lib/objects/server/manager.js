/**
 *
 * Reldens - ObjectsManager
 *
 * This class will load the objects information and create each object server instance.
 * It will also create the list of the presets and animations that will be sent to the client.
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
        if(this.roomObjectsData) {
            return this.roomObjectsData;
        }
        let roomsRepository = this.dataServer.getEntity('objects');
        roomsRepository.sortBy = 'tile_index';
        this.roomObjectsData = await roomsRepository.loadByWithRelations(
            {room_id: roomId},
            ['parent_room', 'objects_assets', 'objects_animations']
        );
    }

    async generateObjects()
    {
        if(!this.roomObjectsData || 0 === this.roomObjectsData.length){
            return this.roomObjects;
        }
        this.roomObjects = {};
        // @NOTE: allow null index for multiple objects of the same type.
        for(let objectData of this.roomObjectsData){
            try {
                // @NOTE: these classes are coming from the theme/plugins/objects/server.js file.
                let objClass = this.config.get('server/customClasses/objects/'+objectData.object_class_key);
                if(!objClass){
                    Logger.error([
                        'ObjectManager class not found.',
                        '- Object ID:', objectData.id,
                        '- Custom class:', objectData.object_class_key
                    ]);
                    continue;
                }
                let objProps = Object.assign({config: this.config, events: this.events}, objectData);
                let objInstance = new objClass(objProps);
                this.attachToAnimations(objInstance);
                if(sc.hasOwn(objInstance, 'multiple')){
                    objInstance.objProps = objProps;
                }
                this.enrichWithMultipleAnimationsData(objectData, objInstance);
                this.attachToMessagesListeners(objInstance, objectData);
                this.prepareAssetsPreload(objectData);
                // save object:
                this.roomObjects[objInstance.objectIndex] = objInstance;
                if(!this.roomObjectsByLayer[objectData.layer_name]){
                    this.roomObjectsByLayer[objectData.layer_name] = {};
                }
                this.roomObjectsByLayer[objectData.layer_name][objectData.id] = objInstance;
            } catch(err) {
                Logger.error([
                    'Error while generating object:', err,
                    'Object Data:', objectData
                ]);
            }
        }
    }

    prepareAssetsPreload(objectData)
    {
        if(!objectData.objects_assets){
            return false;
        }
        for (let asset of objectData.objects_assets) {
            // @NOTE: assets can be different types, sprite sheets, images, atlas, etc. We push them
            // here to later send these to the client along with the sceneData.
            this.preloadAssets.push(asset);
        }
    }

    attachToMessagesListeners(objInstance, objectData)
    {
        // prepare object for room messages:
        if(!sc.hasOwn(objInstance, 'listenMessages')){
            return false;
        }
        this.listenMessages = true;
        this.listenMessagesObjects[objectData.id] = objInstance;
    }

    enrichWithMultipleAnimationsData(objectData, objInstance)
    {
        if(!objectData.objects_animations){
            return false;
        }
        objInstance.multipleAnimations = {};
        for(let anim of objectData.objects_animations){
            // @NOTE: assets can be different types, sprite sheets, images, atlas, etc.
            // We push them here to later send these to the client along with the sceneData.
            objInstance.multipleAnimations[anim.animationKey] = sc.toJson(anim.animationData);
        }
    }

    attachToAnimations(objInstance)
    {
        // if the result is an animation instance then we can include it in the list to send it to the client:
        if(sc.hasOwn(objInstance, 'isAnimation') || sc.hasOwn(objInstance, 'hasAnimation')){
            this.objectsAnimationsData[objInstance.objectIndex] = objInstance.clientParams;
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

}

module.exports.ObjectsManager = ObjectsManager;
