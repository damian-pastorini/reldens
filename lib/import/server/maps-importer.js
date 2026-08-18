/**
 *
 * Reldens - MapsImporter
 *
 * Imports Tiled map files (.json) into the Reldens database, creating room records,
 * handling tileset image extrusion, copying assets to dist folders, and setting up
 * room change points and return points from map layer properties.
 *
 */

const { MapImageExtruder } = require('./map-image-extruder');
const { RoomsAssociationsCreator } = require('./rooms-associations-creator');
const { RepositoriesValidator } = require('./repositories-validator');
const { PublishedMapMerger } = require('./published-map-merger');
const { RoomCustomData } = require('../../rooms/server/room-custom-data');
const { RoomImportData } = require('./room-import-data');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../config/client/config-manager').ConfigManager} ConfigManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 * @typedef {import('../../game/server/theme-manager').ThemeManager} ThemeManager
 *
 * @typedef {Object} MapsImporterProps
 * @property {ConfigManager} configManager
 * @property {BaseDataServer} dataServer
 * @property {ThemeManager} themeManager
 */
class MapsImporter
{

    /**
     * @param {MapsImporterProps} props
     */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.config = props?.configManager;
        /** @type {BaseDataServer} */
        this.dataServer = props?.dataServer;
        /** @type {ThemeManager} */
        this.themeManager = props?.themeManager;
        /** @type {string} */
        this.generatedDataPath = this.themeManager?.projectGeneratedDataPath;
        /** @type {boolean} */
        this.importAssociationsForChangePoints = false;
        /** @type {boolean} */
        this.importAssociationsRecursively = false;
        /** @type {boolean} */
        this.verifyTilesetImage = true;
        /** @type {Object<string, string>} */
        this.maps = {};
        /** @type {Object<string, Object>} */
        this.mapsJson = {};
        /** @type {Object<string, Array<string>>} */
        this.mapsImages = {};
        /** @type {Object<string, Object>} */
        this.roomsChangePoints = {};
        /** @type {Object<string, Object>} */
        this.roomsReturnPoints = {};
        /** @type {Object<string, Object>} */
        this.createdRooms = {};
        /** @type {string} */
        this.errorCode = '';
        /** @type {RoomsAssociationsCreator} */
        this.roomsAssociationsCreator = null;
        /** @type {RoomImportData} */
        this.roomImportData = new RoomImportData({});
        this.setupRepositories();
    }

    setupRepositories()
    {
        if (!this.dataServer){
            Logger.warning('Data server not found on MapsImporter.');
            return false;
        }
        /** @type {BaseDriver} */
        this.roomsRepository = this.dataServer.getEntity('rooms');
        /** @type {BaseDriver} */
        this.roomsChangePointsRepository = this.dataServer.getEntity('roomsChangePoints');
        /** @type {BaseDriver} */
        this.roomsReturnPointsRepository = this.dataServer.getEntity('roomsReturnPoints');
    }

    /**
     * @param {Object} data
     * @returns {Promise<boolean>}
     */
    async import(data)
    {
        if(!data){
            Logger.critical('Import maps data not found.');
            return false;
        }
        if(!RepositoriesValidator.validate(this, [
            'roomsRepository',
            'roomsChangePointsRepository',
            'roomsReturnPointsRepository'
        ])){
            return false;
        }
        this.maps = data.maps;
        this.importAssociationsForChangePoints = 1 === Number(sc.get(data, 'importAssociationsForChangePoints', 0));
        this.importAssociationsRecursively = 1 === Number(sc.get(data, 'importAssociationsRecursively', 0));
        this.verifyTilesetImage = 1 === Number(sc.get(data, 'verifyTilesetImage', 1));
        /** @type {boolean} */
        this.automaticallyExtrudeMaps = 1 === Number(sc.get(data, 'automaticallyExtrudeMaps', 0));
        /** @type {Object<string, any>} */
        this.handlerParams = sc.get(data, 'handlerParams', {});
        this.roomImportData = new RoomImportData(sc.get(data, 'roomData', sc.get(this.handlerParams, 'roomData', {})));
        this.setImportFilesPath(data);
        this.createRoomsAssociationsCreator();
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

    createRoomsAssociationsCreator()
    {
        this.roomsAssociationsCreator = new RoomsAssociationsCreator({
            roomsRepository: this.roomsRepository,
            roomsChangePointsRepository: this.roomsChangePointsRepository,
            roomsReturnPointsRepository: this.roomsReturnPointsRepository,
            createdRooms: this.createdRooms,
            mapsJson: this.mapsJson,
            importAssociationsForChangePoints: this.importAssociationsForChangePoints,
            createRoomByMapTitle: this.createRoomByMapTitle.bind(this),
            loadMapByTitle: this.loadMapByTitle.bind(this)
        });
    }

    /**
     * @param {Object} data
     */
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

    /**
     * @returns {Promise<boolean>}
     */
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

    /**
     * @param {string} mapTitle
     * @param {boolean} [useTitleAsFileName]
     * @returns {boolean}
     */
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

    /**
     * @returns {Promise<boolean>}
     */
    async createRooms()
    {
        for(let mapTitle of Object.keys(this.maps)){
            if(!await this.createRoomByMapTitle(mapTitle)){
                return false;
            }
        }
        return true;
    }

    /**
     * @param {string} mapTitle
     * @param {boolean} [useTitleAsFileName]
     * @returns {Promise<Object|boolean>}
     */
    async createRoomByMapTitle(mapTitle, useTitleAsFileName = false)
    {
        if(this.createdRooms[mapTitle]){
            return this.createdRooms[mapTitle];
        }
        let mapName = useTitleAsFileName ? mapTitle : this.maps[mapTitle];
        let mapFileName = mapName + '.json';
        let mapsImages = this.mapsImages[mapName] || [];
        if(this.automaticallyExtrudeMaps){
            if(!await this.extrudeMapImages(mapName, mapFileName, mapsImages)){
                return false;
            }
        }
        let filesCopied = await this.copyFiles([mapFileName, ...mapsImages]);
        if(!filesCopied){
            Logger.critical('Could not copy map files for "' + mapName + '" / "' + mapFileName + '".');
            this.errorCode = 'copyMapFilesError';
            return false;
        }
        if(!this.mergeImportedMapForPublish(mapName, mapFileName)){
            Logger.critical('Could not write merged map for "' + mapName + '" / "' + mapFileName + '".');
            this.errorCode = 'mergeMapFilesError';
            return false;
        }
        let roomCustomData = new RoomCustomData({});
        roomCustomData.set('enabled', false);
        let roomCreateData = {
            name: mapName,
            title: this.fetchRoomTitle(mapName, mapTitle),
            map_filename: mapFileName,
            scene_images: mapsImages.join(','),
            customData: roomCustomData.toJsonString()
        };
        this.roomImportData.applyTo(roomCreateData, roomCustomData, mapName, mapTitle);
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
        await this.roomsAssociationsCreator.createRoomsChangePoints(mapName, result);
        await this.roomsAssociationsCreator.createRoomsReturnPoints(result);
        this.removeImportedMapFromGenerated(mapName, mapFileName, mapsImages);
        return this.createdRooms[mapName];
    }

    /**
     * @param {string} mapName
     * @param {string} mapFileName
     * @param {Array<string>} mapsImages
     * @returns {Promise<boolean>}
     */
    async extrudeMapImages(mapName, mapFileName, mapsImages)
    {
        let extruder = new MapImageExtruder(this.generatedDataPath, this.handlerParams, this.config);
        let extrudeResult = await extruder.extrudeMap(mapName, mapFileName, mapsImages, this.mapsJson[mapName]);
        if(extrudeResult.errorCode){
            this.errorCode = extrudeResult.errorCode;
            return false;
        }
        return true;
    }

    /**
     * @param {string} mapName
     * @param {string} mapFileName
     * @param {Array<string>} mapsImages
     * @returns {void}
     */
    removeImportedMapFromGenerated(mapName, mapFileName, mapsImages)
    {
        if(this.config.getWithoutLogs('server/rooms/maps/keepGeneratedForEditing', true)){
            Logger.info('Generated files are kept for later map-element editing on "'+mapName+'".');
            return;
        }
        let recordName = mapName + '-room-map-elements.json';
        FileHandler.remove(FileHandler.joinPaths(this.generatedDataPath, mapFileName));
        FileHandler.remove(FileHandler.joinPaths(this.generatedDataPath, recordName));
        for(let image of mapsImages){
            FileHandler.remove(FileHandler.joinPaths(this.generatedDataPath, image));
            FileHandler.remove(
                FileHandler.joinPaths(
                    this.generatedDataPath,
                    'original-map-images',
                    image.replace('.png', '-original.png')
                )
            );
        }
    }

    /**
     * @param {string} mapName
     * @param {string} mapTitle
     * @returns {string}
     */
    fetchRoomTitle(mapName, mapTitle)
    {
        let mapJson = this.mapsJson[mapName];
        if(sc.isArray(mapJson.properties)){
            for(let property of mapJson.properties){
                if('mapTitle' === property.name){
                    return property.value;
                }
            }
        }
        return mapTitle;
    }

    /**
     * @param {Array<string>} fileNames
     * @returns {Promise<boolean>}
     */
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

    /**
     * @param {string} mapName
     * @param {string} mapFileName
     * @returns {boolean}
     */
    mergeImportedMapForPublish(mapName, mapFileName)
    {
        let recordPath = FileHandler.joinPaths(this.generatedDataPath, mapName + '-room-map-elements.json');
        if(!FileHandler.exists(recordPath)){
            return true;
        }
        return new PublishedMapMerger(this.config).mergeAndPublish(
            this.mapsJson[mapName],
            FileHandler.fetchFileJson(recordPath),
            FileHandler.joinPaths(this.themeManager.projectAssetsPath, 'maps', mapFileName),
            FileHandler.joinPaths(this.themeManager.assetsDistPath, 'maps', mapFileName)
        );
    }

}

module.exports.MapsImporter = MapsImporter;
