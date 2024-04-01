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
        this.automaticallyReadAssociations = false;
        this.verifyTilesetImage = true;
        this.maps = {};
        this.mapsJson = {};
        this.mapsImages = {};
        this.roomsChangePoints = {};
        this.roomsReturnPoints = {};
        this.fileHandler = new FileHandler();
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
        this.automaticallyReadAssociations = sc.get(data, 'automaticallyReadAssociations', false);
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
            let mapFileName = this.maps[mapTitle];
            let fileContent = this.fileHandler.readFile(
                this.fileHandler.joinPaths(this.serverManager.projectRoot, 'generate-data', mapFileName+'.json')
            );
            if (!fileContent) {
                Logger.critical('File "'+mapFileName+'.json" not found.');
                continue;
            }
            let jsonContent = sc.toJson(fileContent);
            if (this.verifyTilesetImage){
                let tilesets = jsonContent?.tilesets || [];
                if (0 === tilesets.length) {
                    Logger.critical('File "'+mapFileName+'.json" must have at least one tileset.');
                    continue;
                }
                let validTilesetsImages = true;
                for(let tileset of tilesets) {
                    if (!tileset.image) {
                        validTilesetsImages = false;
                        Logger.critical('Tileset "'+tileset.name+'" must have an image.');
                        break;
                    }
                    if (!validTilesetsImages) {
                        validTilesetsImages = false;
                        Logger.critical('File "'+mapFileName+'.json" must have at least one tileset with an image.');
                        break;
                    }
                    let checkImagePath = this.fileHandler.joinPaths(
                        this.serverManager.projectRoot,
                        'generate-data',
                        tileset.image
                    );
                    if (!this.fileHandler.exists(checkImagePath)) {
                        validTilesetsImages = false;
                        Logger.critical('File "'+checkImagePath+'" not found.');
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
    }

    async createRooms()
    {
        for(let mapTitle of Object.keys(this.maps)){
            let mapFileName = this.maps[mapTitle];
            let mapFileNameWithExtension = mapFileName+'.json';
            let filesCopied = this.copyFiles([mapFileNameWithExtension, ...this.mapsImages[mapFileName]]);
            if (!filesCopied) {
                Logger.critical('Could not copy map files for "'+mapFileName+'".');
                continue;
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
                Logger.critical('Map "'+mapFileName+'" could not be saved. Error: '+error.message, roomCreateData);
            }
            if(!result){
                Logger.critical('Could not create room with title "'+roomCreateData.title+'".', roomCreateData);
                continue;
            }
            if(this.roomsChangePoints){
                await this.createRoomsChangePoints();
            }
            if(this.roomsReturnPoints){
                await this.createRoomsReturnPoints();
            }
        }
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

    async createRoomsChangePoints()
    {
        /*
        for(let roomChangePoint of this.roomsChangePoints){
            let roomChangePointCreateData = {
                roomId: roomChangePoint.roomId,
                x: roomChangePoint.x,
                y: roomChangePoint.y
            };
            let result = await this.roomsChangePointsRepository.create(roomChangePointCreateData);
            if(result){
                Logger.info('Created rooms change point with ID "'+result.id+'".', roomChangePointCreateData);
            }
        }
        */
    }

    async createRoomsReturnPoints()
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
