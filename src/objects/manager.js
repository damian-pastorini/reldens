/**
 *
 * Reldens - ObjectsManager
 *
 * This class will load the objects information and create each object server instance.
 * It will also create the list of the presets and animations that will be sent to the client.
 *
 */

const Objects = require('./model');

class ObjectsManager
{

    constructor(options)
    {
        this.config = options.config;
        // room objects is just the list of the objects in the storage:
        this.roomObjectsData = false;
        // room objects by layer and title are each object instance plus the data from the storage:
        this.roomObjects = false;
        this.preloadAssets = [];
        this.objectsAnimationsData = {};
    }

    async loadObjectsByRoomId(roomId)
    {
        if(!this.roomObjectsData){
            this.roomObjectsData = await Objects.query()
                .eager('[parent_room, objects_assets]')
                .where('room_id', roomId)
                .orderBy('tile_index');
            if(this.roomObjectsData){
                this.roomObjects = {};
                for(let objectData of this.roomObjectsData){
                    try {
                        let objectIndex = objectData.layer_name + objectData.tile_index;
                        // dynamic path using the server root:
                        let fullPath = this.config.projectRoot+'/'+objectData.server_path;
                        // here we dynamically require the object class using the path specified in the storage:
                        let objClass = require(fullPath);
                        let objInstance = new objClass(objectData);
                        // if the result is an animation instance then we can include in the list to send it to the client:
                        if(objInstance.hasOwnProperty('isAnimation') || objInstance.hasOwnProperty('hasAnimation')){
                            this.objectsAnimationsData[objectIndex] = objInstance.getPublicObjectData();
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
                    } catch(err) {
                        console.log('ERROR - Object class does not exists for objectIndex:', err);
                    }
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
     * @returns {boolean}
     */
    getObjectData(objectIndex)
    {
        if(this.roomObjects.hasOwnProperty(objectIndex)){
            return this.roomObjects[objectIndex];
        }
        return false;
    }

}

module.exports = ObjectsManager;
