/**
 *
 * Reldens - MapsImporter
 *
 */

const { ExtrudeTileset } = require('./tile-extruder');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class MapsImporter
{

    constructor(props)
    {
        this.config = props?.configManager;
        this.dataServer = props?.dataServer;
        this.themeManager = props?.themeManager;
        this.generatedDataPath = this.themeManager?.projectGeneratedDataPath;
        this.importAssociationsForChangePoints = false;
        this.importAssociationsRecursively = false;
        this.verifyTilesetImage = true;
        this.maps = {};
        this.mapsJson = {};
        this.mapsImages = {};
        this.roomsChangePoints = {};
        this.roomsReturnPoints = {};
        this.createdRooms = {};
        this.errorCode = '';
        this.setupRepositories();
    }

    setupRepositories()
    {
        if (!this.dataServer){
            Logger.warning('Data server not found on MapsImporter.');
            return false;
        }
        this.roomsRepository = this.dataServer.getEntity('rooms');
        this.roomsChangePointsRepository = this.dataServer.getEntity('roomsChangePoints');
        this.roomsReturnPointsRepository = this.dataServer.getEntity('roomsReturnPoints');
    }

    async import(data)
    {
        if(!data){
            Logger.critical('Import data not found.');
            return false;
        }
        if(!this.validRepositories(['roomsRepository', 'roomsChangePointsRepository', 'roomsReturnPointsRepository'])){
            return false;
        }
        this.maps = data.maps;
        this.importAssociationsForChangePoints = 1 === Number(sc.get(data, 'importAssociationsForChangePoints', 0));
        this.importAssociationsRecursively = 1 === Number(sc.get(data, 'importAssociationsRecursively', 0));
        this.verifyTilesetImage = 1 === Number(sc.get(data, 'verifyTilesetImage', 1));
        this.automaticallyExtrudeMaps = 1 === Number(sc.get(data, 'automaticallyExtrudeMaps', 0));
        this.handlerParams = sc.get(data, 'handlerParams', {});
        this.setImportFilesPath(data);
        if(this.maps){
            if(!await this.loadValidMaps()){
                return false;
            }
        }
        if(this.mapsJson){
            if(!await this.createRooms()){
                return false;
            }
        }
        return true;
    }

    setImportFilesPath(data)
    {
        let generatedDataPath = String(sc.get(data, 'generatedDataPath', ''));
        if('' !== generatedDataPath){
            this.generatedDataPath = generatedDataPath;
        }
        let relativeGeneratedDataPath = String(sc.get(data, 'relativeGeneratedDataPath', ''));
        if('' !== relativeGeneratedDataPath){
            this.generatedDataPath = FileHandler.joinPaths(this.themeManager.projectRoot, relativeGeneratedDataPath);
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

    async loadValidMaps()
    {
        for(let mapTitle of Object.keys(this.maps)){
            let mapExists = await this.roomsRepository.loadOneBy('name', this.maps[mapTitle]);
            if(mapExists){
                Logger.error('Map with name "'+this.maps[mapTitle]+'" already exists.');
                this.errorCode = 'mapExists';
                return false;
            }
            if(!this.loadMapByTitle(mapTitle)){
                return false;
            }
        }
        return true;
    }

    loadMapByTitle(mapTitle, useTitleAsFileName = false)
    {
        let mapName = useTitleAsFileName ? mapTitle : this.maps[mapTitle];
        let fullPath = FileHandler.joinPaths(this.generatedDataPath, mapName + '.json');
        let fileContent = FileHandler.exists(fullPath) ? FileHandler.readFile(fullPath) : '';
        if('' === fileContent){
            Logger.critical('File "' + mapName + '.json" not found.', fullPath);
            this.errorCode = 'mapJsonNotFound';
            return false;
        }
        let jsonContent = sc.toJson(fileContent);
        if(this.verifyTilesetImage){
            let tilesets = jsonContent?.tilesets || [];
            if(0 === tilesets.length){
                Logger.critical('File "' + mapName + '.json" must have at least one tileset.');
                this.errorCode = 'mapJsonMissingTileset';
                return false;
            }
            for(let tileset of tilesets){
                if(!tileset.image){
                    Logger.critical('File "' + mapName + '.json" must have at least one tileset with an image.');
                    this.errorCode = 'mapJsonMissingTilesetImage';
                    return false;
                }
                let checkImagePath = FileHandler.joinPaths(this.generatedDataPath, tileset.image);
                if(!FileHandler.exists(checkImagePath)){
                    Logger.critical('File "' + checkImagePath + '" not found.');
                    this.errorCode = 'mapTilesetImageNotFound';
                    return false;
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
        return true;
    }

    async createRooms()
    {
        for(let mapTitle of Object.keys(this.maps)){
            if(!await this.createRoomByMapTitle(mapTitle)){
                return false;
            }
        }
        return true;
    }

    async copyExtrudedFiles(fileNames)
    {
        for(let fileName of fileNames){
            let from = FileHandler.joinPaths(this.generatedDataPath, fileName);
            let to = FileHandler.joinPaths(this.generatedDataPath, fileName.replace('.png', '-original.png'));
            let result = FileHandler.copyFile(from, to);
            if(!result){
                Logger.error('File copy error.', FileHandler.error);
                return false;
            }
        }
        return true;
    }

    async createRoomByMapTitle(mapTitle, useTitleAsFileName = false)
    {
        if(this.createdRooms[mapTitle]){
            return this.createdRooms[mapTitle];
        }
        let mapName = useTitleAsFileName ? mapTitle : this.maps[mapTitle];
        let mapFileName = mapName + '.json';
        let mapsImages = this.mapsImages[mapName] || [];
        if(this.automaticallyExtrudeMaps){
            let createExtrudeBackups = await this.copyExtrudedFiles(mapsImages);
            if(!createExtrudeBackups){
                this.errorCode = 'createExtrudeBackupsError';
                return false;
            }
            let margin = Number(sc.get(this.handlerParams, 'margin', 0));
            let mapJson = this.mapsJson[mapName];
            for(let image of mapsImages){
                let inputPath = image.replace('.png', '-original.png');
                try {
                    let imageObject = await ExtrudeTileset(
                        mapJson.tilewidth,
                        mapJson.tileheight,
                        FileHandler.joinPaths(this.generatedDataPath, inputPath),
                        {
                            margin,
                            spacing: Number(sc.get(this.handlerParams, 'spacing', 0)),
                            color: sc.get(this.handlerParams, 'color', 0xffffff00),
                            extrusion: Number(sc.get(this.handlerParams, 'extrusion', 1))
                        }
                    );
                    try {
                        await imageObject.write(FileHandler.joinPaths(this.generatedDataPath, image));
                    } catch (error) {
                        Logger.critical('Image object could not be saved as file.', image, error);
                        this.errorCode = 'imageObjectSaveError';
                        return false;
                    }
                    for(let tileset of mapJson.tilesets){
                        if(tileset.image !== image){
                            continue;
                        }
                        tileset.margin = this.config.getWithoutLogs('maps/extrude/margin', 1);
                        tileset.spacing = this.config.getWithoutLogs('maps/extrude/spacing', 2);
                        tileset.imagewidth = imageObject.bitmap.width;
                        tileset.imageheight = imageObject.bitmap.height;
                        if(margin){
                            tileset.tilewidth = tileset.tilewidth + 2 * margin;
                            tileset.tileheight = tileset.tileheight + 2 * margin;
                        }
                    }
                } catch (error) {
                    Logger.critical('Image object could not be extruded.', image, error);
                    this.errorCode = 'imageObjectExtrudeError';
                    return false;
                }
            }
            if(margin){
                mapJson.tilewidth = mapJson.tilewidth + 2 * margin;
                mapJson.tileheight = mapJson.tileheight + 2 * margin;
            }
            await FileHandler.updateFileContents(
                FileHandler.joinPaths(this.generatedDataPath, mapFileName),
                JSON.stringify(mapJson)
            );
        }
        let filesCopied = await this.copyFiles([mapFileName, ...mapsImages]);
        if(!filesCopied){
            Logger.critical('Could not copy map files for "' + mapName + '" / "' + mapFileName + '".');
            this.errorCode = 'copyMapFilesError';
            return false;
        }
        let roomCreateData = {
            name: mapName,
            title: this.fetchRoomTitle(mapName, mapTitle),
            map_filename: mapFileName,
            scene_images: mapsImages.join(',')
        };
        let result = false;
        try {
            result = await this.roomsRepository.create(roomCreateData);
        } catch (error) {
            Logger.critical('Map "' + mapName + '" could not be saved. Error: ' + error.message, roomCreateData);
            this.errorCode = 'mapSaveError';
            return false;
        }
        if(!result){
            Logger.critical('Could not create room with title "' + roomCreateData.title + '".', roomCreateData);
            this.errorCode = 'createRoomError';
            return false;
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

    async copyFiles(fileNames)
    {
        for(let fileName of fileNames){
            let from = FileHandler.joinPaths(this.generatedDataPath, fileName);
            let to = FileHandler.joinPaths(this.themeManager.projectAssetsPath, 'maps', fileName);
            let result = FileHandler.copyFile(from, to);
            if(!result){
                Logger.critical('Could not copy file "' + from + '" to "' + to + '".');
                return false;
            }
            let toDist = FileHandler.joinPaths(this.themeManager.assetsDistPath, 'maps', fileName);
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
                    Logger.error(
                        'Could not find room "'+nextRoomName+'" while creating change points.',
                        changePointData
                    );
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
                    Logger.error(
                        'Could not find room "'+returnPointForName+'" while creating return point.',
                        returnPointData
                    );
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
        let x = (returnPointData.x * currentRoomMapJson.tilewidth) + (currentRoomMapJson.tilewidth / 2);
        if(mapWidthInPoints < x){
            x = mapWidthInPoints - (currentRoomMapJson.tilewidth / 2);
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
            // x position in map in pixels + half tile because the player occupies one tile space:
            x,
            // y position in map in pixels + half tile because the player occupies one tile space:
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
