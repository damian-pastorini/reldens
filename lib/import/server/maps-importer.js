/**
 *
 * Reldens - AttributesPerLevelImporter
 *
 */

const { FileHandler } = require('../../game/server/file-handler');
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
        this.createdRooms = {};
        this.generatedDataPath = this.serverManager?.themeManager?.projectGeneratedDataPath;
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
        this.setImportFilesPath(data);
        if(this.maps){
            await this.loadValidMaps();
        }
        if(this.mapsJson){
            await this.createRooms();
        }
    }

    setImportFilesPath(data)
    {
        let generatedDataPath = String(sc.get(data, 'generatedDataPath', ''));
        if('' !== generatedDataPath){
            this.generatedDataPath = generatedDataPath;
        }
        let relativeGeneratedDataPath = String(sc.get(data, 'relativeGeneratedDataPath', ''));
        if('' !== relativeGeneratedDataPath){
            this.generatedDataPath = FileHandler.joinPaths(this.serverManager.projectRoot, relativeGeneratedDataPath);
        }
    }

    validRepositories(repositoriesKey)
    {
        for(let repositoryKey of repositoriesKey){
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
        let mapName = useTitleAsFileName ? mapTitle : this.maps[mapTitle];
        let fullPath = FileHandler.joinPaths(this.generatedDataPath, mapName + '.json');
        let fileContent = FileHandler.exists(fullPath) ? FileHandler.readFile(fullPath) : '';
        if('' === fileContent){
            Logger.critical('File "' + mapName + '.json" not found.', fullPath);
            return;
        }
        let jsonContent = sc.toJson(fileContent);
        if(this.verifyTilesetImage){
            let tilesets = jsonContent?.tilesets || [];
            if(0 === tilesets.length){
                Logger.critical('File "' + mapName + '.json" must have at least one tileset.');
                return;
            }
            for(let tileset of tilesets){
                if(!tileset.image){
                    Logger.critical('File "' + mapName + '.json" must have at least one tileset with an image.');
                    return;
                }
                let checkImagePath = FileHandler.joinPaths(this.generatedDataPath, tileset.image);
                if(!FileHandler.exists(checkImagePath)){
                    Logger.critical('File "' + checkImagePath + '" not found.');
                    return;
                }
                if(!this.mapsImages[mapName]){
                    this.mapsImages[mapName] = [];
                }
                if(-1 === this.mapsImages[mapName].indexOf(tileset.image)){
                    this.mapsImages[mapName].push(tileset.image);
                }
            }
        }
        this.mapsJson[mapName] = sc.deepJsonClone(jsonContent);
    }

    async createRooms()
    {
        for(let mapTitle of Object.keys(this.maps)){
            await this.createRoomByMapTitle(mapTitle);
        }
    }

    async createRoomByMapTitle(mapTitle, useTitleAsFileName = false)
    {
        if(this.createdRooms[mapTitle]){
            return this.createdRooms[mapTitle];
        }
        let mapName = useTitleAsFileName ? mapTitle : this.maps[mapTitle];
        let mapFileName = mapName + '.json';
        let filesCopied = this.copyFiles([mapFileName, ...this.mapsImages[mapName]]);
        if(!filesCopied){
            Logger.critical('Could not copy map files for "' + mapName + '" / "' + mapFileName + '".');
            return;
        }
        let roomCreateData = {
            name: mapName,
            title: this.fetchRoomTitle(mapName, mapTitle),
            map_filename: mapFileName,
            scene_images: this.mapsImages[mapName].join(',')
        };
        let result = false;
        try {
            result = await this.roomsRepository.create(roomCreateData);
        } catch (error) {
            Logger.critical('Map "' + mapName + '" could not be saved. Error: ' + error.message, roomCreateData);
        }
        if(!result){
            Logger.critical('Could not create room with title "' + roomCreateData.title + '".', roomCreateData);
            return;
        }
        this.createdRooms[mapName] = result;
        Logger.info('Created room "'+mapName+'".');
        await this.createRoomsChangePoints(mapName, result);
        await this.createRoomsReturnPoints(result);
        return this.createdRooms[mapName];
    }

    fetchRoomTitle(mapName, mapTitle)
    {
        let mapJson = this.mapsJson[mapName];
        if(sc.isArray(mapJson.properties)){
            for(let property of mapJson.properties){
                if(property.name === 'mapTitle'){
                    return property.value;
                }
            }
        }
        return mapTitle;
    }

    copyFiles(fileNames)
    {
        for(let fileName of fileNames){
            let from = FileHandler.joinPaths(this.generatedDataPath, fileName);
            let to = FileHandler.joinPaths(this.serverManager.themeManager.projectThemePath, 'assets', 'maps', fileName);
            let result = FileHandler.copyFile(from, to);
            if(!result){
                Logger.critical('Could not copy file "' + from + '" to "' + to + '".');
                return false;
            }
            let toDist = FileHandler.joinPaths(this.serverManager.themeManager.assetsDistPath, 'maps', fileName);
            let resultDist = FileHandler.copyFile(from, toDist);
            if(!resultDist){
                Logger.critical('Could not copy file "' + from + '" to "' + to + '".');
                return false;
            }
        }
        return true;
    }

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
            if(!sc.isArray(layer.properties)){
                Logger.info('Layer "'+layer.name+'" properties is not an array on "'+mapName+'".');
                continue;
            }
            let roomChangePoints = [];
            for(let property of layer.properties){
                if(0 === property.name.indexOf(changePointForKey)){
                    roomChangePoints.push(property);
                }
            }
            Logger.info(
                'Found '+roomChangePoints.length+' rooms change points on "'+mapName+'".',
                changePointForKey,
                layer.properties
            );
            for(let changePointData of roomChangePoints){
                let nextRoomName = changePointData.name.replace(changePointForKey, '');
                let nextRoomModel = await this.provideRoomByName(nextRoomName);
                if(!nextRoomModel){
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
            if(!sc.isArray(layer.properties)){
                Logger.info('Layer "'+layer.name+'" properties is not an array on "'+createdRoom.name+'".');
                continue;
            }
            let roomReturnPoints = this.fetchReturnPointsFromLayer(layer, returnPointForKey);
            Logger.info(
                'Found '+roomReturnPoints.length+' rooms return points on "'+createdRoom.name+'".',
                layer.properties
            );
            for(let i = 0; i < roomReturnPoints.length; i++){
                let returnPointData = roomReturnPoints[i];
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
                    Logger.error('Could not find room "'+returnPointForName+'".');
                    continue;
                }
                await this.saveReturnPoint(
                    isDefault,
                    createdRoom,
                    roomModel,
                    returnPointData,
                    currentRoomMapJson,
                    returnPointForName
                );
            }
        }
    }

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
        // get all the data from the layer that could be in any order
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
        // map only points with indexes:
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

    async saveReturnPoint(isDefault, createdRoom, roomModel, returnPointData, currentRoomMapJson, returnPointForName)
    {
        // a valid "x" is determined by the map width in points:
        let mapWidthInPoints = currentRoomMapJson.width * currentRoomMapJson.tilewidth;
        let x = (returnPointData.x * currentRoomMapJson.tilewidth) + currentRoomMapJson.tilewidth;
        if(mapWidthInPoints < x){
            x = mapWidthInPoints - (currentRoomMapJson.tilewidth);
        }
        // a valid "y" is determined by the specified return position (top or down for now):
        let playerY = 'down' === returnPointData.position
            ? currentRoomMapJson.tileheight
            : -currentRoomMapJson.tileheight;
        let y = (returnPointData.y * currentRoomMapJson.tileheight) + playerY;
        // create the room return point:
        let roomReturnPointCreateData = {
            // destination room id, for example going from the map in to the house this will be the house ID:
            room_id: createdRoom.id,
            // display direction:
            direction: returnPointData.position,
            // x position in map in pixels + 1 tile because the player occupies one tile space:
            x,
            // y position in map in pixels + 1 tile because the player occupies one tile space:
            y,
            // if is the default place where the player starts when selecting the map:
            is_default: Boolean(isDefault || returnPointData.isDefault),
            // room id where the change point was hit, for example the town ID:
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

module.exports.MapsImporter = MapsImporter;
