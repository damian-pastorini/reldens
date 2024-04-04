/**
 *
 * Reldens - AttributesPerLevelImporter
 *
 */

const { FileHandler } = require('@reldens/tile-map-generator/lib/files/file-handler');
const { Logger, sc } = require('@reldens/utils');

class MapsImporter
{

    constructor(serverManager)
    {
        this.serverManager = serverManager;
        this.roomsRepository = this.serverManager?.dataServer?.getEntity('rooms');
        this.roomsChangePointsRepository = this.serverManager?.dataServer?.getEntity('roomsChangePoints');
        this.roomsReturnPointsRepository = this.serverManager?.dataServer?.getEntity('roomsReturnPoints');
        this.importAssociationsForChangePoints = false;
        this.importAssociationsRecursively = false;
        this.verifyTilesetImage = true;
        this.maps = {};
        this.mapsJson = {};
        this.mapsImages = {};
        this.roomsChangePoints = {};
        this.roomsReturnPoints = {};
        this.fileHandler = new FileHandler();
        this.createdRooms = {};
    }

    async import(data)
    {
        if(!data){
            Logger.critical('Import data not found.');
            return false;
        }
        if(!this.validRepositories([
            'roomsRepository',
            'roomsChangePointsRepository',
            'roomsReturnPointsRepository'
        ])){
            return false;
        }
        this.maps = data?.maps;
        this.importAssociationsForChangePoints = sc.get(data, 'importAssociationsForChangePoints', false);
        this.importAssociationsRecursively = sc.get(data, 'importAssociationsRecursively', false);
        this.verifyTilesetImage = sc.get(data, 'verifyTilesetImage', true);
        if(this.maps){
            await this.loadValidMaps();
        }
        if(this.mapsJson){
            await this.createRooms();
        }
    }

    validRepositories(repositoriesKey)
    {
        for (let repositoryKey of repositoriesKey){
            if(!this[repositoryKey]){
                Logger.critical('Repository "'+repositoryKey+'" not found.');
                return false;
            }
        }
        return true;
    }

    loadValidMaps()
    {
        for(let mapTitle of Object.keys(this.maps)){
            this.loadMapByTitle(mapTitle);
        }
    }

    loadMapByTitle(mapTitle, useTitleAsFileName = false)
    {
        let mapFileName = useTitleAsFileName ? mapTitle : this.maps[mapTitle];
        let fullPath = this.fileHandler.joinPaths(this.serverManager.projectRoot, 'generate-data', mapFileName + '.json');
        let fileContent = this.fileHandler.exists(fullPath) ? this.fileHandler.readFile(fullPath) : '';
        if ('' === fileContent) {
            Logger.critical('File "' + mapFileName + '.json" not found.');
            return;
        }
        let jsonContent = sc.toJson(fileContent);
        if (this.verifyTilesetImage) {
            let tilesets = jsonContent?.tilesets || [];
            if (0 === tilesets.length) {
                Logger.critical('File "' + mapFileName + '.json" must have at least one tileset.');
                return;
            }
            for (let tileset of tilesets) {
                if (!tileset.image) {
                    Logger.critical('File "' + mapFileName + '.json" must have at least one tileset with an image.');
                    return;
                }
                let checkImagePath = this.fileHandler.joinPaths(
                    this.serverManager.projectRoot,
                    'generate-data',
                    tileset.image
                );
                if (!this.fileHandler.exists(checkImagePath)) {
                    Logger.critical('File "' + checkImagePath + '" not found.');
                    return;
                }
                if (!this.mapsImages[mapFileName]) {
                    this.mapsImages[mapFileName] = [];
                }
                if (-1 === this.mapsImages[mapFileName].indexOf(tileset.image)){
                    this.mapsImages[mapFileName].push(tileset.image);
                }
            }
        }
        this.mapsJson[mapFileName] = sc.deepJsonClone(jsonContent);
    }

    async createRooms()
    {
        for(let mapTitle of Object.keys(this.maps)){
            await this.createRoomByMapTitle(mapTitle);
        }
    }

    async createRoomByMapTitle(mapTitle, useTitleAsFileName = false)
    {
        if (this.createdRooms[mapTitle]) {
            return this.createdRooms[mapTitle];
        }
        let mapFileName = useTitleAsFileName ? mapTitle : this.maps[mapTitle];
        let mapFileNameWithExtension = mapFileName + '.json';
        let filesCopied = this.copyFiles([mapFileNameWithExtension, ...this.mapsImages[mapFileName]]);
        if (!filesCopied) {
            Logger.critical('Could not copy map files for "' + mapFileName + '" / "' + mapFileNameWithExtension + '".');
            return;
        }
        let roomCreateData = {
            name: mapFileName,
            title: this.fetchRoomTitle(mapFileName, mapTitle),
            map_filename: mapFileNameWithExtension,
            scene_images: this.mapsImages[mapFileName].join(',')
        };
        let result = false;
        try {
            result = await this.roomsRepository.create(roomCreateData);
        } catch (error) {
            Logger.critical('Map "' + mapFileName + '" could not be saved. Error: ' + error.message, roomCreateData);
        }
        if (!result) {
            Logger.critical('Could not create room with title "' + roomCreateData.title + '".', roomCreateData);
            return;
        }
        this.createdRooms[mapFileName] = result;
        Logger.info('Created room "'+mapFileName+'".');
        await this.createRoomsChangePoints(mapFileName, result);
        await this.createRoomsReturnPoints(mapFileName, result);
        return this.createdRooms[mapFileName];
    }

    fetchRoomTitle(mapFileName, mapTitle)
    {
        let mapJson = this.mapsJson[mapFileName];
        if (sc.isArray(mapJson.properties)) {
            for (let property of mapJson.properties) {
                if (property.name === 'mapTitle') {
                    return property.value;
                }
            }
        }
        return mapTitle;
    }

    copyFiles(fileNames)
    {
        for(let fileName of fileNames){
            let from = this.fileHandler.joinPaths(this.serverManager.projectRoot, 'generate-data', fileName);
            let to = this.fileHandler.joinPaths(this.serverManager.themeManager.projectThemePath, 'assets', 'maps');
            let result = this.fileHandler.copyFile(from, fileName, to);
            if (!result) {
                Logger.critical('Could not copy file "' + from + '" to "' + to + '".');
                return false;
            }
        }
        return true;
    }

    async createRoomsChangePoints(mapFileName, createdRoom)
    {
        Logger.info('Creating rooms change points for "'+mapFileName+'".');
        let mapJson = this.mapsJson[mapFileName];
        if(!sc.isArray(mapJson.layers)){
            Logger.info('Warning Map JSON not found for "'+mapFileName+'".');
            return false;
        }
        let changePointForKey = 'change-point-for-';
        for(let layer of mapJson.layers){
            if (!sc.isArray(layer.properties)){
                Logger.info('Layer "'+layer.name+'" properties is not an array on "'+mapFileName+'".');
                continue;
            }
            let roomChangePoints = [];
            for (let property of layer.properties) {
                if (0 === property.name.indexOf(changePointForKey)){
                    roomChangePoints.push(property);
                }
            }
            Logger.info(
                'Found '+roomChangePoints.length+' rooms change points on "'+mapFileName+'".',
                changePointForKey,
                layer.properties
            );
            for(let changePointData of roomChangePoints){
                let nextRoomName = changePointData.name.replace(changePointForKey, '');
                let nextRoomModel = await this.provideRoomByName(nextRoomName);
                if (!nextRoomModel){
                    Logger.error('Could not find room "'+nextRoomName+'".');
                    continue;
                }
                let roomChangePointCreateData = {
                    room_id: createdRoom.id,
                    tile_index: changePointData.value,
                    next_room_id: nextRoomModel.id
                };
                let result = await this.roomsChangePointsRepository.create(roomChangePointCreateData);
                if(!result){
                    Logger.critical(
                        'Could not create rooms change point for "'+nextRoomName+'".',
                        roomChangePointCreateData
                    );
                    continue;
                }
                Logger.info('Created rooms change point with ID "'+result.id+'".', roomChangePointCreateData);
            }
        }
    }

    async createRoomsReturnPoints(mapFileName, createdRoom)
    {
        Logger.info('Creating room return points for "'+mapFileName+'".');
        let mapJson = this.mapsJson[mapFileName];
        if(!sc.isArray(mapJson.layers)){
            Logger.info('Warning Map JSON not found for "'+mapFileName+'".');
            return false;
        }
        let returnPointForKey = 'return-point-for-';
        for(let layer of mapJson.layers){
            if (!sc.isArray(layer.properties)){
                Logger.info('Layer "'+layer.name+'" properties is not an array on "'+mapFileName+'".');
                continue;
            }
            let roomReturnPoints = [];
            for (let property of layer.properties) {
                if (0 === property.name.indexOf(returnPointForKey)){
                    roomReturnPoints.push(property);
                }
            }
            Logger.info(
                'Found '+roomReturnPoints.length+' rooms return points on "'+mapFileName+'".',
                returnPointForKey,
                layer.properties
            );
            for(let returnPointData of roomReturnPoints){
                let isDefault = -1 !== returnPointData.name.indexOf('return-point-for-default-');
                let returnFromRoomName = returnPointData.name.replace(
                    isDefault ? 'return-point-for-default-' : returnPointForKey,
                    ''
                );
                let roomModel = this.createdRooms[returnFromRoomName] || await this.roomsRepository.loadOneBy(
                    'name',
                    returnFromRoomName
                );
                if (!roomModel){
                    Logger.error('Could not find room "'+returnFromRoomName+'".');
                    continue;
                }
                let tilePosition = this.fetchTilePosition(returnPointData.value, this.mapsJson[mapFileName].width);
                let roomReturnPointCreateData = {
                    // destination room id, for example going from the map in to the house this will be the house ID:
                    room_id: roomModel.id,
                    // display direction:
                    direction: 'down',
                    // x position in map in pixels:
                    x: tilePosition.x * this.mapsJson[mapFileName].tilewidth,
                    // y position in map in pixels:
                    y: tilePosition.y * this.mapsJson[mapFileName].tileheight,
                    // if is the default place where the player starts when selecting the map:
                    is_default: isDefault,
                    // room id where the change point was hit, for example the town ID:
                    from_room_id: createdRoom.id
                };
                let result = await this.roomsReturnPointsRepository.create(roomReturnPointCreateData);
                if(!result){
                    Logger.critical(
                        'Could not create rooms return point for "'+returnFromRoomName+'".',
                        roomReturnPointCreateData
                    );
                    continue;
                }
                Logger.info('Created rooms return point with ID "'+result.id+'".', roomReturnPointCreateData);
            }
        }
    }

    fetchTilePosition(tileIndex, mapWidth)
    {
        let x = tileIndex % mapWidth;
        let y = Math.floor(tileIndex / mapWidth);
        return {x, y};
    }

    async provideRoomByName(roomName)
    {
        if(this.importAssociationsForChangePoints){
            if (!this.mapsJson[roomName]){
                this.loadMapByTitle(roomName, true);
            }
            if (this.createdRooms[roomName]) {
                return this.createdRooms[roomName];
            }
            return await this.createRoomByMapTitle(roomName, true);
        }
        return this.roomsRepository.loadOneBy('name', roomName);
    }

}

module.exports.MapsImporter = MapsImporter;
