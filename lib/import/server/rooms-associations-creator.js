/**
 *
 * Reldens - RoomsAssociationsCreator
 *
 * Creates the rooms change points and return points associations for an imported map by reading
 * the map layer properties, resolving the related rooms and persisting the corresponding records.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 *
 * @typedef {Object} RoomsAssociationsCreatorProps
 * @property {BaseDriver} roomsRepository
 * @property {BaseDriver} roomsChangePointsRepository
 * @property {BaseDriver} roomsReturnPointsRepository
 * @property {Object<string, Object>} createdRooms
 * @property {Object<string, Object>} mapsJson
 * @property {boolean} importAssociationsForChangePoints
 * @property {Function} createRoomByMapTitle
 * @property {Function} loadMapByTitle
 */
class RoomsAssociationsCreator
{

    /**
     * @param {RoomsAssociationsCreatorProps} props
     */
    constructor(props)
    {
        /** @type {BaseDriver} */
        this.roomsRepository = props?.roomsRepository;
        /** @type {BaseDriver} */
        this.roomsChangePointsRepository = props?.roomsChangePointsRepository;
        /** @type {BaseDriver} */
        this.roomsReturnPointsRepository = props?.roomsReturnPointsRepository;
        /** @type {Object<string, Object>} */
        this.createdRooms = props?.createdRooms;
        /** @type {Object<string, Object>} */
        this.mapsJson = props?.mapsJson;
        /** @type {boolean} */
        this.importAssociationsForChangePoints = props?.importAssociationsForChangePoints;
        /** @type {Function} */
        this.createRoomByMapTitle = props?.createRoomByMapTitle;
        /** @type {Function} */
        this.loadMapByTitle = props?.loadMapByTitle;
    }

    /**
     * @param {string} mapName
     * @param {Object} createdRoom
     * @returns {Promise<void>}
     */
    async createRoomsChangePoints(mapName, createdRoom)
    {
        Logger.info('Creating rooms change points for "'+mapName+'".');
        let mapJson = this.mapsJson[mapName];
        if(!sc.isArray(mapJson.layers)){
            Logger.info('Warning Map JSON not found for "'+mapName+'".');
            return false;
        }
        let changePointForKey = 'change-point-for-';
        for(let layer of mapJson.layers){
            await this.createLayerChangePoints(layer, mapName, changePointForKey, createdRoom);
        }
    }

    /**
     * @param {Object} layer
     * @param {string} mapName
     * @param {string} changePointForKey
     * @param {Object} createdRoom
     * @returns {Promise<boolean>}
     */
    async createLayerChangePoints(layer, mapName, changePointForKey, createdRoom)
    {
        if(!sc.isArray(layer.properties)){
            Logger.info('Layer "'+layer.name+'" properties is not an array on "'+mapName+'".');
            return false;
        }
        let roomChangePoints = this.fetchChangePointsFromLayer(layer, changePointForKey);
        Logger.info(
            'Found '+roomChangePoints.length+' rooms change points on "'+mapName+'".',
            changePointForKey,
            layer.properties
        );
        for(let changePointData of roomChangePoints){
            await this.createRoomChangePoint(changePointData, changePointForKey, createdRoom);
        }
        return true;
    }

    /**
     * @param {Object} layer
     * @param {string} changePointForKey
     * @returns {Array<Object>}
     */
    fetchChangePointsFromLayer(layer, changePointForKey)
    {
        let roomChangePoints = [];
        for(let property of layer.properties){
            if(0 === property.name.indexOf(changePointForKey)){
                roomChangePoints.push(property);
            }
        }
        return roomChangePoints;
    }

    /**
     * @param {Object} changePointData
     * @param {string} changePointForKey
     * @param {Object} createdRoom
     * @returns {Promise<boolean>}
     */
    async createRoomChangePoint(changePointData, changePointForKey, createdRoom)
    {
        let nextRoomName = changePointData.name.replace(changePointForKey, '');
        let nextRoomModel = await this.provideRoomByName(nextRoomName);
        if(!nextRoomModel){
            Logger.error('Could not find room "'+nextRoomName+'" while creating change points.', changePointData);
            return false;
        }
        let roomChangePointCreateData = {
            room_id: createdRoom.id,
            tile_index: changePointData.value,
            next_room_id: nextRoomModel.id
        };
        let result = await this.roomsChangePointsRepository.create(roomChangePointCreateData);
        if(!result){
            Logger.critical('Could not create rooms change point for "'+nextRoomName+'".', roomChangePointCreateData);
            return false;
        }
        Logger.info('Created rooms change point with ID "'+result.id+'".', roomChangePointCreateData);
        return true;
    }

    /**
     * @param {Object} createdRoom
     * @returns {Promise<void>}
     */
    async createRoomsReturnPoints(createdRoom)
    {
        Logger.info('Creating room return points for "'+createdRoom.name+'".');
        let currentRoomMapJson = this.mapsJson[createdRoom.name];
        if(!sc.isArray(currentRoomMapJson.layers)){
            Logger.info('Warning Map JSON not found for "'+createdRoom.name+'".');
            return false;
        }
        let returnPointForKey = 'return-point-for-';
        let returnPointForDefaultKey = 'return-point-for-default-';
        for(let layer of currentRoomMapJson.layers){
            await this.createLayerReturnPoints(
                layer,
                returnPointForKey,
                returnPointForDefaultKey,
                createdRoom,
                currentRoomMapJson
            );
        }
    }

    /**
     * @param {Object} layer
     * @param {string} returnPointForKey
     * @param {string} returnPointForDefaultKey
     * @param {Object} createdRoom
     * @param {Object} currentRoomMapJson
     * @returns {Promise<boolean>}
     */
    async createLayerReturnPoints(layer, returnPointForKey, returnPointForDefaultKey, createdRoom, currentRoomMapJson)
    {
        if(!sc.isArray(layer.properties)){
            Logger.info('Layer "'+layer.name+'" properties is not an array on "'+createdRoom.name+'".');
            return false;
        }
        let roomReturnPoints = this.fetchReturnPointsFromLayer(layer, returnPointForKey);
        Logger.info(
            'Found '+roomReturnPoints.length+' rooms return points on "'+createdRoom.name+'".',
            layer.properties
        );
        for(let i = 0; i < roomReturnPoints.length; i++){
            await this.createReturnPointForData(
                roomReturnPoints[i],
                returnPointForKey,
                returnPointForDefaultKey,
                createdRoom,
                currentRoomMapJson
            );
        }
        return true;
    }

    /**
     * @param {Object} returnPointData
     * @param {string} returnPointForKey
     * @param {string} returnPointForDefaultKey
     * @param {Object} createdRoom
     * @param {Object} currentRoomMapJson
     * @returns {Promise<boolean>}
     */
    async createReturnPointForData(
        returnPointData,
        returnPointForKey,
        returnPointForDefaultKey,
        createdRoom,
        currentRoomMapJson
    ) {
        let isDefault = -1 !== returnPointData.name.indexOf(returnPointForDefaultKey);
        let returnPointForName = returnPointData.name.replace(
            isDefault ? returnPointForDefaultKey : returnPointForKey,
            ''
        );
        let roomModel = this.createdRooms[returnPointForName] || await this.roomsRepository.loadOneBy(
            'name',
            returnPointForName
        );
        if(!roomModel){
            Logger.error('Could not find room "'+returnPointForName+'" while creating return point.', returnPointData);
            return false;
        }
        return await this.saveReturnPoint(
            isDefault,
            createdRoom,
            roomModel,
            returnPointData,
            currentRoomMapJson,
            returnPointForName
        );
    }

    /**
     * @param {Object} layer
     * @returns {Array<Object>}
     */
    fetchReturnPointsFromLayer(layer)
    {
        let key = 'return-point-';
        let keyFor = key + 'for-';
        let keyX = key + 'x-';
        let keyY = key + 'y-';
        let keyPosition = key + 'position-';
        let keyIsDefault = key + 'isDefault-';
        let roomReturnPoints = [];
        let roomReturnPointsIndex = {};
        let roomReturnPointsX = {};
        let roomReturnPointsY = {};
        let roomReturnPointsPosition = {};
        let roomReturnPointsIsDefault = {};
        for(let property of layer.properties){
            let normalizedName = property.name
                .replace(keyFor, '')
                .replace(keyX, '')
                .replace(keyY, '')
                .replace(keyPosition, '')
                .replace(keyIsDefault, '')
                .replace('default-', '');
            if(0 === property.name.indexOf(keyFor)){
                roomReturnPointsIndex[normalizedName] = property;
            }
            if(0 === property.name.indexOf(keyX)){
                roomReturnPointsX[normalizedName] = property;
            }
            if(0 === property.name.indexOf(keyY)){
                roomReturnPointsY[normalizedName] = property;
            }
            if(0 === property.name.indexOf(keyPosition)){
                roomReturnPointsPosition[normalizedName] = property;
            }
            if(0 === property.name.indexOf(keyIsDefault)){
                roomReturnPointsIsDefault[normalizedName] = property;
            }
        }
        for(let propertyName of Object.keys(roomReturnPointsIndex)){
            let newPoint = {
                name: propertyName,
                value: roomReturnPointsIndex[propertyName].value
            };
            if(roomReturnPointsX[propertyName]){
                newPoint.x = roomReturnPointsX[propertyName].value;
            }
            if(roomReturnPointsY[propertyName]){
                newPoint.y = roomReturnPointsY[propertyName].value;
            }
            if(roomReturnPointsPosition[propertyName]){
                newPoint.position = roomReturnPointsPosition[propertyName].value;
            }
            if(roomReturnPointsIsDefault[propertyName]){
                newPoint.isDefault = roomReturnPointsIsDefault[propertyName].value;
            }
            roomReturnPoints.push(newPoint);
        }
        return roomReturnPoints;
    }

    /**
     * @param {boolean} isDefault
     * @param {Object} createdRoom
     * @param {Object} roomModel
     * @param {Object} returnPointData
     * @param {Object} currentRoomMapJson
     * @param {string} returnPointForName
     * @returns {Promise<boolean>}
     */
    async saveReturnPoint(isDefault, createdRoom, roomModel, returnPointData, currentRoomMapJson, returnPointForName)
    {
        let mapWidthInPoints = currentRoomMapJson.width * currentRoomMapJson.tilewidth;
        let x = (returnPointData.x * currentRoomMapJson.tilewidth) + (currentRoomMapJson.tilewidth / 2);
        if(mapWidthInPoints < x){
            x = mapWidthInPoints - (currentRoomMapJson.tilewidth / 2);
        }
        let playerY = 'down' === returnPointData.position
            ? currentRoomMapJson.tileheight
            : -currentRoomMapJson.tileheight;
        let y = (returnPointData.y * currentRoomMapJson.tileheight) + playerY;
        let roomReturnPointCreateData = {
            room_id: createdRoom.id,
            direction: returnPointData.position,
            x,
            y,
            is_default: Boolean(isDefault || returnPointData.isDefault),
            from_room_id: isDefault ? null : roomModel.id
        };
        let result = await this.roomsReturnPointsRepository.create(roomReturnPointCreateData);
        if(!result){
            Logger.critical(
                'Could not create rooms return point for "' + returnPointForName + '".',
                roomReturnPointCreateData
            );
            return false;
        }
        Logger.info('Created rooms return point with ID "' + result.id + '".', roomReturnPointCreateData);
        return true;
    }

    /**
     * @param {string} roomName
     * @returns {Promise<Object|boolean>}
     */
    async provideRoomByName(roomName)
    {
        if(this.importAssociationsForChangePoints){
            if(!this.mapsJson[roomName]){
                this.loadMapByTitle(roomName, true);
            }
            if(this.createdRooms[roomName]){
                return this.createdRooms[roomName];
            }
            return await this.createRoomByMapTitle(roomName, true);
        }
        return this.roomsRepository.loadOneBy('name', roomName);
    }

}

module.exports.RoomsAssociationsCreator = RoomsAssociationsCreator;
