/**
 *
 * Reldens - ObjectsManager
 *
 * This class will load the objects information and create each object server instance.
 * It will also create the list of the presets and animations that will be sent to the client.
 *
 */

const { ObjectsModel } = require('./model');
const { Logger } = require('../../game/logger');

class ObjectsManager
{

    constructor(options)
    {
        this.config = options.config;
        // room objects is just the list of the objects in the storage:
        this.roomObjectsData = false;
        // room objects by layer and title are each object instance plus the data from the storage:
        this.roomObjects = false;
        this.roomObjectsById = {};
        this.roomObjectsByLayer = {};
        this.preloadAssets = [];
        this.objectsAnimationsData = {};
        this.listenMessages = false;
        this.listenMessagesObjects = {};
    }

    async loadObjectsByRoomId(roomId)
    {
        if(!this.roomObjectsData){
            this.roomObjectsData = await ObjectsModel.query()
                .eager('[parent_room, objects_assets]')
                .where('room_id', roomId)
                .orderBy('tile_index');
        }
    }

    async generateObjects()
    {
        if(this.roomObjectsData){
            this.roomObjects = {};
            // @NOTE: allow null index for multiple objects of the same type.
            for(let objectData of this.roomObjectsData){
                let appendIndex = (objectData.tile_index ? objectData.tile_index : objectData.id);
                let objectIndex = objectData.layer_name + appendIndex;
                try {
                    let objClass = this.config.get('server/customClasses/objects/'+objectData.object_class_key);
                    if(!objClass){
                        Logger.error([
                            'ObjectManager class not found.',
                            '- Object ID:', objectData.id,
                            '- Custom class:', objectData.object_class_key
                        ]);
                        continue;
                    }
                    let objProps = Object.assign({config: this.config}, objectData);
                    let objInstance = new objClass(objProps);
                    // if the result is an animation instance then we can include in the list to send it to the client:
                    if(
                        {}.hasOwnProperty.call(objInstance, 'isAnimation')
                        || {}.hasOwnProperty.call(objInstance, 'hasAnimation')
                    ){
                        this.objectsAnimationsData[objectIndex] = objInstance.clientParams;
                    }
                    if({}.hasOwnProperty.call(objInstance, 'multiple')){
                        objInstance.objProps = objProps;
                    }
                    // prepare object for room messages:
                    if({}.hasOwnProperty.call(objInstance, 'listenMessages')){
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
                    this.roomObjects[objectIndex] = objInstance;
                    this.roomObjectsById[objectData.id] = objInstance;
                    if(!this.roomObjectsByLayer[objectData.layer_name]){
                        this.roomObjectsByLayer[objectData.layer_name] = {};
                    }
                    this.roomObjectsByLayer[objectData.layer_name][objectData.id] = objInstance;
                } catch(err) {
                    Logger.error('Object class does not exists for objectIndex:', objectIndex);
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
        if({}.hasOwnProperty.call(this.roomObjects, objectIndex)){
            return this.roomObjects[objectIndex];
        }
        return false;
    }

    getObjectById(objectId)
    {
        if({}.hasOwnProperty.call(this.roomObjectsById, objectId)){
            return this.roomObjectsById[objectId];
        }
        return false;
    }

}

module.exports.ObjectsManager = ObjectsManager;
