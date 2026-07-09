/**
 *
 * Reldens - RoomsEntitySubscriber
 *
 * Subscriber that handles room-specific admin panel operations including setting default rooms
 * and creating room transition links via change points and return points.
 *
 */

const { RoomMapTilesetsValidator } = require('../room-map-tilesets-validator');
const { RoomsFileUploadRenderer } = require('../rooms-file-upload-renderer');
const { RoomsMapDataProvider } = require('../rooms-map-data-provider');
const { MapElementsBuilder } = require('../map-elements-builder');
const { RoomCustomData } = require('../../../rooms/server/room-custom-data');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../../game/server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('express').Router} ExpressRouter
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('express').Response} ExpressResponse
 */
class RoomsEntitySubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {ConfigManager} config
     */
    constructor(adminManager, config)
    {
        /** @type {BaseDataServer} */
        this.dataServer = adminManager.dataServer;
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {ConfigManager} */
        this.config = config;
        /** @type {Function} */
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        /** @type {Function} */
        this.generateViewRouteContent = adminManager.routerContents.generateViewRouteContent.bind(
            adminManager.routerContents
        );
        this.setupRepositories();
        this.listenEvents();
    }

    /**
     * @returns {boolean|void}
     */
    setupRepositories()
    {
        if(!this.dataServer){
            Logger.error('Data server is not defined for RoomsEntitySubscriber.');
            return false;
        }
        /** @type {Object} */
        this.configRepository = this.dataServer.getEntity('config');
        /** @type {RoomsMapDataProvider} */
        this.roomsMapDataProvider = new RoomsMapDataProvider(this.dataServer);
        /** @type {Object} */
        this.roomsChangePointsRepository = this.dataServer.getEntity('roomsChangePoints');
        /** @type {Object} */
        this.roomsReturnPointsRepository = this.dataServer.getEntity('roomsReturnPoints');
        /** @type {RoomMapTilesetsValidator} */
        this.roomMapTilesetsValidator = new RoomMapTilesetsValidator(this.dataServer, this.config);
        /** @type {RoomsFileUploadRenderer} */
        this.fileUploadRenderer = new RoomsFileUploadRenderer();
        /** @type {MapElementsBuilder} */
        this.elementsBuilder = new MapElementsBuilder();
    }

    /**
     * @returns {boolean|void}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager is not defined for RoomsEntitySubscriber.');
            return false;
        }
        this.events.on('adminEntityExtraData', async (event) => {
            if('rooms' !== event.entityId){
                return;
            }
            event.entitySerializedData.extraData = {
                roomsList: await this.roomsMapDataProvider.loadRoomsMapList()
            };
            this.populateMapElementsExtra(event);
        });
        this.events.on('reldens.setupEntitiesRoutes', (event) => {
            if('rooms' !== event.entityPath){
                return;
            }
            this.setupRoomsSpecificRoutes(
                event.adminManager.router.adminRouter,
                event.adminManager.rootPath,
                event.adminManager.viewPath,
                event.entityRoute,
                event.driverResource
            );
        });
        this.events.on('reldens.adminAfterEntitySave', async (event) => {
            await this.roomMapTilesetsValidator.validate(event);
        });
        this.events.on('reldens.adminEditPropertiesPopulation', (event) => {
            if('rooms' !== event.entityId){
                return;
            }
            this.populateEditFormTilesetImages(event);
        });
        this.events.on('reldens.adminBeforeFieldRender', async (event) => {
            await this.fileUploadRenderer.renderFileUploadField(event);
        });
        this.events.on('reldens.adminBeforeEntityDelete', async (event) => {
            if('rooms' !== event.entityPath){
                return;
            }
            await this.preventRoomsDeleteWithPlayers(event);
        });
    }

    /**
     * @param {ExpressRouter} adminRouter
     * @param {string} rootPath
     * @param {string} viewPath
     * @param {string} entityRoute
     * @param {Object} driverResource
     * @returns {boolean|void}
     */
    setupRoomsSpecificRoutes(adminRouter, rootPath, viewPath, entityRoute, driverResource)
    {
        if(!this.dataServer){
            return false;
        }
        if(!adminRouter){
            Logger.error('Admin Router is not defined for RoomsEntitySubscriber.');
            return false;
        }
        adminRouter.post(entityRoute+viewPath, this.isAuthenticated, async (req, res) => {
            let routeContents = await this.generateViewRouteContent(req, driverResource, 'rooms');
            if('' === routeContents){
                return res.redirect(rootPath+'/rooms?result=errorView');
            }
            let roomId = req.query.id;
            if(!roomId){
                Logger.warning('Missing entity ID on POST.', req.query);
                return res.redirect(rootPath+'/rooms?result=errorId');
            }
            let setAsDefault = req.body.setAsDefault;
            if('1' === setAsDefault){
                let result = await this.configRepository.update(
                    {path: 'players/initialState/room_id'},
                    {value: roomId}
                );
                if(!result){
                    return res.redirect(
                        rootPath+'/rooms'+viewPath+'?id='+roomId+'&result=errorSaveDefault'
                    );
                }
                return res.redirect(rootPath+'/rooms'+viewPath+'?id='+roomId+'&result=success');
            }
            let createRoomsLink = req.body.createRoomsLink;
            if('1' === createRoomsLink){
                let currentRoomChangePointTileIndex = req.body.currentRoomChangePointTileIndex;
                if(!currentRoomChangePointTileIndex){
                    return res.redirect(
                        rootPath+'/rooms'+viewPath+'?id='+roomId+'&result=errorMissingTileIndex'
                    );
                }
                let nextRoomId = req.body.nextRoomSelector;
                if(!nextRoomId){
                    return res.redirect(
                        rootPath+'/rooms'+viewPath+'?id='+roomId+'&result=errorMissingNextRoom'
                    );
                }
                let nextRoomPositionX = req.body.nextRoomPositionX;
                if(!nextRoomPositionX){
                    return res.redirect(
                        rootPath+'/rooms'+viewPath+'?id='+roomId+'&result=errorMissingRoomX'
                    );
                }
                let nextRoomPositionY = req.body.nextRoomPositionY;
                if(!nextRoomPositionY){
                    return res.redirect(
                        rootPath+'/rooms'+viewPath+'?id='+roomId+'&result=errorMissingRoomY'
                    );
                }
                let nextRoomDirection = sc.get(req.body, 'nextRoomDirection', 'down');
                let nextRoomIsDefault = sc.get(req.body, 'nextRoomIsDefault', '0');
                let changePointResult = await this.roomsChangePointsRepository.create({
                    room_id: roomId,
                    tile_index: currentRoomChangePointTileIndex,
                    next_room_id: nextRoomId
                });
                if(!changePointResult){
                    return res.redirect(
                        rootPath+'/rooms'+viewPath+'?id='+roomId+'&result=errorSaveChangePoint'
                    );
                }
                let returnPointResult = await this.roomsReturnPointsRepository.create({
                    room_id: nextRoomId,
                    direction: nextRoomDirection,
                    x: nextRoomPositionX,
                    y: nextRoomPositionY,
                    is_default: '1' === nextRoomIsDefault,
                    from_room_id: roomId
                });
                if(!returnPointResult){
                    return res.redirect(
                        rootPath+'/rooms'+viewPath+'?id='+roomId+'&result=errorSaveReturnPoint'
                    );
                }
                return res.redirect(rootPath+'/rooms'+viewPath+'?id='+roomId+'&result=success');
            }
            let startingPointRedirect = await this.handleCreateDefaultReturnPoint(req, roomId, rootPath, viewPath);
            if(startingPointRedirect){
                return res.redirect(startingPointRedirect);
            }
            return res.send(routeContents);
        });
    }

    async handleCreateDefaultReturnPoint(req, roomId, rootPath, viewPath)
    {
        if('1' !== req.body.createDefaultReturnPoint){
            return null;
        }
        let startingPointX = req.body.roomStartingPointX;
        let startingPointY = req.body.roomStartingPointY;
        let baseRedirect = rootPath+'/rooms'+viewPath+'?id='+roomId;
        if(!startingPointX || !startingPointY){
            return baseRedirect+'&result=errorMissingStartingPoint';
        }
        let startingPointResult = await this.roomsReturnPointsRepository.create({
            room_id: roomId,
            direction: sc.get(req.body, 'roomStartingPointDirection', 'down'),
            x: startingPointX,
            y: startingPointY,
            is_default: true
        });
        if(!startingPointResult){
            return baseRedirect+'&result=errorSaveStartingPoint';
        }
        return baseRedirect+'&result=success';
    }

    async preventRoomsDeleteWithPlayers(event)
    {
        let control = sc.get(event, 'deleteControl', false);
        let roomIds = sc.get(event, 'ids', []);
        if(!control || !sc.isNotEmptyArray(roomIds)){
            return;
        }
        let playersStateRepository = this.dataServer.getEntity('playersState');
        if(!playersStateRepository){
            return;
        }
        let affectedStates = await this.fetchPlayerStatesInRooms(playersStateRepository, roomIds);
        if(!sc.isNotEmptyArray(affectedStates)){
            return;
        }
        let defaultRoomId = this.config.getWithoutLogs('server/players/initialState/room_id', false);
        if(!defaultRoomId || -1 !== roomIds.indexOf(String(defaultRoomId))){
            control.prevented = true;
            control.result = 'errorRoomDeleteHasPlayersNoDefault';
            return;
        }
        for(let playerState of affectedStates){
            await playersStateRepository.updateById(playerState.id, {room_id: defaultRoomId});
        }
    }

    async fetchPlayerStatesInRooms(playersStateRepository, roomIds)
    {
        let affectedStates = [];
        for(let roomId of roomIds){
            let playersInRoom = await playersStateRepository.loadBy('room_id', Number(roomId));
            if(sc.isNotEmptyArray(playersInRoom)){
                affectedStates = affectedStates.concat(playersInRoom);
            }
        }
        return affectedStates;
    }

    /**
     * @param {Object} event
     * @returns {boolean|void}
     */
    populateEditFormTilesetImages(event)
    {
        let overrideEnabled = this.config.getWithoutLogs('server/rooms/maps/overrideSceneImagesWithMapFile', true);
        if(!overrideEnabled){
            return false;
        }
        let entityData = sc.get(event, 'entityData', false);
        if(!entityData){
            return false;
        }
        let driverResource = sc.get(event, 'driverResource', false);
        if(!driverResource){
            return false;
        }
        let tilesetImages = this.roomMapTilesetsValidator.extractTilesetImagesFromEntity(entityData, driverResource);
        if(!tilesetImages || 0 === tilesetImages.length){
            return false;
        }
        let renderedEditProperties = sc.get(event, 'renderedEditProperties', false);
        if(!renderedEditProperties){
            return false;
        }
        renderedEditProperties.tilesetImages = tilesetImages;
        renderedEditProperties.overrideSceneImagesEnabled = overrideEnabled;
    }

    /**
     * @param {Object} event
     */
    populateMapElementsExtra(event)
    {
        let entityData = event.entitySerializedData;
        let mapName = sc.get(entityData, 'map_filename', '').replace(/\.json$/i, '');
        entityData.mapName = mapName;
        entityData.mapElementsFile = this.resolveMapElementsFile(entityData, mapName);
        entityData.firstSceneImage = this.resolveFirstSceneImage(entityData);
    }

    /**
     * @param {Object} entityData
     * @param {string} mapName
     * @returns {string}
     */
    resolveMapElementsFile(entityData, mapName)
    {
        let fromCustom = (new RoomCustomData(sc.get(entityData, 'customData', ''))).get('mapElementsFile', '');
        if(fromCustom){
            return fromCustom;
        }
        if(!mapName){
            return '';
        }
        return this.elementsBuilder.elementsFileName(mapName);
    }

    /**
     * @param {Object} entityData
     * @returns {string}
     */
    resolveFirstSceneImage(entityData)
    {
        let sceneImages = sc.get(entityData, 'scene_images', '');
        if(!sceneImages){
            return '';
        }
        let images = sc.splitToArray(sceneImages, ',');
        if(!sc.isNotEmptyArray(images)){
            return '';
        }
        return '/assets/maps/'+images.shift();
    }

}

module.exports.RoomsEntitySubscriber = RoomsEntitySubscriber;
