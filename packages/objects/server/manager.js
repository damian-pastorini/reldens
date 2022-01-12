/**
 *
 * Reldens - ObjectsManager
 *
 * This class will load the objects information and create each object server instance.
 * It will also create the list of the presets and animations that will be sent to the client.
 *
 */

const { ObjectsModel } = require('./models/objection-js/objects-model');
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
        if(!this.roomObjectsData){
            this.roomObjectsData = await ObjectsModel.loadRoomObjects(roomId);
        }
    }

    async generateObjects()
    {
        if(this.roomObjectsData){
            this.roomObjects = {};
            // @NOTE: allow null index for multiple objects of the same type.
            for(let objectData of this.roomObjectsData){
                try {
                    // @NOTE: this configurations are coming from the theme/packages/objects/server.js file.
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
                    // if the result is an animation instance then we can include in the list to send it to the client:
                    if(sc.hasOwn(objInstance, 'isAnimation') || sc.hasOwn(objInstance, 'hasAnimation')){
                        this.objectsAnimationsData[objInstance.objectIndex] = objInstance.clientParams;
                    }
                    if(sc.hasOwn(objInstance, 'multiple')){
                        objInstance.objProps = objProps;
                    }
                    // prepare assets list:
                    if(objectData.objects_animations){
                        objInstance.multipleAnimations = {};
                        for(let anim of objectData.objects_animations){
                            // @NOTE: assets can be different types, spritesheets, images, atlas, etc. We push them
                            // here to later send these to the client along with the sceneData.
                            objInstance.multipleAnimations[anim.animationKey] = sc.toJson(anim.animationData);
                        }
                    }
                    // prepare object for room messages:
                    if(sc.hasOwn(objInstance, 'listenMessages')){
                        this.listenMessages = true;
                        this.listenMessagesObjects[objectData.id] = objInstance;
                    }
                    // prepare assets list:
                    if(objectData.objects_assets){
                        for(let asset of objectData.objects_assets){
                            // @NOTE: assets can be different types, spritesheets, images, atlas, etc. We push them
                            // here to later send these to the client along with the sceneData.
                            this.preloadAssets.push(asset);
                        }
                    }
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
        return this.roomObjects;
    }

    /**
     * The object instance is created when the world is created since we don't need to overload the server by creating
     * every object defined if is not going to be used.
     *
     * @param objectIndex
     * @returns {boolean|*}
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
