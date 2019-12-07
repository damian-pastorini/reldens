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

    // room objects is just the list of the objects in the storage:
    roomObjectsData = false;
    // room objects by layer and title are each object instance plus the data from the storage:
    roomObjects = false;
    preloadAssets = [];
    objectsAnimationsData = {};
    listenMessages = false;
    listenMessagesObjects = {};

    constructor(options)
    {
        this.config = options.config;
    }

    async loadObjectsByRoomId(roomId)
    {
        if(!this.roomObjectsData){
            this.roomObjectsData = await ObjectsModel.query()
                .eager('[parent_room, objects_assets]')
                .where('room_id', roomId)
                .orderBy('tile_index');
        }
        if(this.roomObjectsData){
            this.roomObjects = {};
            for(let objectData of this.roomObjectsData){
                let objectIndex = objectData.layer_name + objectData.tile_index;
                try {
                    let objClass = this.config.get('server/customClasses/objects/'+objectData.object_class_key);
                    if(!objClass){
                        Logger.error([
                            'ObjectManager custom class not found.',
                            '- Object ID:', objectData.id,
                            '- Custom class:', objectData.object_class_key
                        ]);
                        continue;
                    }
                    let objInstance = new objClass(objectData);
                    // if the result is an animation instance then we can include in the list to send it to the client:
                    if (
                        {}.hasOwnProperty.call(objInstance, 'isAnimation')
                        || {}.hasOwnProperty.call(objInstance, 'hasAnimation')
                    ) {
                        this.objectsAnimationsData[objectIndex] = objInstance.clientParams;
                    }
                    // prepare assets list:
                    if(objectData.objects_assets){
                        for(let asset of objectData.objects_assets){
                            // @NOTE: assets can be different types, spritesheets, images, atlas, etc. We push them
                            // here to later send these to the client along with the sceneData.
                            this.preloadAssets.push(asset);
                        }
                    }
                    // prepare object for room messages:
                    if({}.hasOwnProperty.call(objInstance, 'listenMessages')){
                        this.listenMessages = true;
                        this.listenMessagesObjects[objectData.id] = objInstance;
                    }
                    // save object:
                    this.roomObjects[objectIndex] = objInstance;
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

}

module.exports.ObjectsManager = ObjectsManager;
