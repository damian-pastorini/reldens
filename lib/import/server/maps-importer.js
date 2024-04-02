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
        let fileContent = this.fileHandler.readFile(
            this.fileHandler.joinPaths(this.serverManager.projectRoot, 'generate-data', mapFileName + '.json')
        );
        if (!fileContent) {
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
            let validTilesetsImages = true;
            for (let tileset of tilesets) {
                if (!tileset.image) {
                    validTilesetsImages = false;
                    Logger.critical('Tileset "' + tileset.name + '" must have an image.');
                    break;
                }
                if (!validTilesetsImages) {
                    validTilesetsImages = false;
                    Logger.critical('File "' + mapFileName + '.json" must have at least one tileset with an image.');
                    break;
                }
                let checkImagePath = this.fileHandler.joinPaths(
                    this.serverManager.projectRoot,
                    'generate-data',
                    tileset.image
                );
                if (!this.fileHandler.exists(checkImagePath)) {
                    validTilesetsImages = false;
                    Logger.critical('File "' + checkImagePath + '" not found.');
                    break;
                }
                if (!this.mapsImages[mapFileName]) {
                    this.mapsImages[mapFileName] = [];
                }
                this.mapsImages[mapFileName].push(tileset.image);
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
            Logger.critical('Could not copy map files for "' + mapFileName + '".');
            return;
        }
        let roomCreateData = {
            name: mapFileName,
            title: mapTitle,
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
        this.createdRooms[mapTitle] = result;
        Logger.info('Created room "'+mapFileName+'".');
        await this.createRoomsChangePoints(mapFileName, result);
        await this.createRoomsReturnPoints(mapFileName, result);
        return this.createdRooms[mapTitle];
    }

    copyFiles(fileNames)
    {
        for(let fileName of fileNames){
            let from = this.fileHandler.joinPaths(this.serverManager.projectRoot, 'generate-data', fileName);
            let to = this.fileHandler.joinPaths(this.serverManager.themeManager.projectThemePath, 'assets', 'maps');
            let result = this.fileHandler.copyFile(from, fileName, to);
            if (!result) {
                return false;
            }
        }
        return true;
    }

    async createRoomsChangePoints(mapFileName, createdRoom)
    {
        let mapJson = this.mapsJson[mapFileName];
        if(!sc.isArray(mapJson.layers)){
            return false;
        }
        let changePointForKey = 'change-point-for-';
        for(let layer of mapJson.layers){
            if (!sc.isArray(layer.properties)){
                continue;
            }
            let roomChangePoints = layer.properties.filter((property) => {
                return 0 === property.name.indexOf(changePointForKey);
            })
            for(let changePointData of roomChangePoints){
                let nextRoomName = changePointData.name.replace(changePointForKey, '');
                let nextRoomModel = await this.provideNextRoomByName(nextRoomName);
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
                if(result){
                    Logger.info('Created rooms change point with ID "'+result.id+'".', roomChangePointCreateData);
                }
            }
        }
    }

    async provideNextRoomByName(nextRoomName)
    {
        if(this.importAssociationsForChangePoints){
            this.loadMapByTitle(nextRoomName, true);
            return await this.createRoomByMapTitle(nextRoomName, true);
        }
        return this.roomsRepository.loadOneBy('name', nextRoomName);
    }

    async createRoomsReturnPoints(mapJson)
    {
        /*
        for(let roomReturnPoint of this.roomsReturnPoints){
            let roomReturnPointCreateData = {
                roomId: roomReturnPoint.roomId,
                x: roomReturnPoint.x,
                y: roomReturnPoint.y
            };
            let result = await this.roomsReturnPointsRepository.create(roomReturnPointCreateData);
            if(result){
                Logger.info('Created rooms return point with ID "'+result.id+'".', roomReturnPointCreateData);
            }
        }
        */
    }

}

module.exports.MapsImporter = MapsImporter;
