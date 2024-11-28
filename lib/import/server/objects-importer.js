/**
 *
 * Reldens - ObjectsImporter
 *
 */

const { Logger, sc } = require('@reldens/utils');

class ObjectsImporter
{

    constructor(serverManager)
    {
        this.serverManager = serverManager;
        this.statsRepository = this.serverManager?.dataServer?.getEntity('stats');
        this.roomsRepository = this.serverManager?.dataServer?.getEntity('rooms');
        this.objectsRepository = this.serverManager?.dataServer?.getEntity('objects');
        this.objectsStatsRepository = this.serverManager?.dataServer?.getEntity('objectsStats');
        this.objectsAssetsRepository = this.serverManager?.dataServer?.getEntity('objectsAssets');
        this.respawnRepository = this.serverManager?.dataServer?.getEntity('respawn');
        this.statsById = {};
        this.statsIdsByKeys = {};
        // @TODO - BETA - Improve importer to only load required rooms once.
        // this.roomsById = {};
        // this.roomsIdsByNames = {};
        this.defaults = {};
    }

    async import(data)
    {
        if(!data){
            Logger.critical('Import data not found.');
            return false;
        }
        if(!sc.isArray(data.objects)){
            Logger.critical('Import Objects data not found.', data);
            return false;
        }
        if(!this.validRepositories([
            'statsRepository',
            'roomsRepository',
            'objectsRepository',
            'objectsStatsRepository',
            'objectsAssetsRepository',
            'respawnRepository'
        ])){
            return false;
        }
        await this.loadStats();
        this.defaults = sc.get(data, 'defaults', {});
        for(let objectData of data.objects){
            let objectDataWithDefaults = Object.assign({}, this.defaults, objectData);
            await this.createObjectPerRoom(objectDataWithDefaults);
        }
    }

    validRepositories(repositoriesKey)
    {
        for(let repositoryKey of repositoriesKey){
            if(!this[repositoryKey]){
                Logger.critical('Repository "' + repositoryKey + '" not found.');
                return false;
            }
        }
        return true;
    }

    async loadStats()
    {
        let statsModels = await this.statsRepository.loadAll();
        if(!sc.isArray(statsModels) || 0 === statsModels.length){
            return false;
        }
        for(let stat of statsModels){
            this.statsById[stat.id] = stat;
            this.statsIdsByKeys[stat.key] = stat.id;
        }
    }

    async createObjectPerRoom(objectData)
    {
        let objectRoomsIds = sc.get(objectData, 'roomsId');
        let objectRooms = [];
        if(sc.isArray(objectRoomsIds) && 0 < objectRoomsIds.length){
            objectRooms = await this.fetchRoomsBy('id', objectRoomsIds);
        }
        let objectRoomsNames = sc.get(objectData, 'roomsNames');
        if(sc.isArray(objectRoomsNames) && 0 < objectRoomsNames.length){
            objectRooms = await this.fetchRoomsBy('name', objectRoomsNames);
        }
        if(0 === objectRooms.length){
            return false;
        }
        // @TODO - BETA - Improve importer to only load required rooms once.
        // this.mapRooms(objectRooms);
        for(let room of objectRooms){
            objectData.objectClassKey = room.name+'_'+sc.get(objectData, 'clientKey', '');
            await this.createObjectForRoom(objectData, room.id);
        }
    }

    // @TODO - BETA - Improve importer to only load required rooms once.
    /*
    mapRooms(loadedRooms)
    {
        if(!sc.isArray(loadedRooms) || 0 === loadedRooms.length){
            return [];
        }
        let objectRoomsIds = [];
        for(let room of loadedRooms){
            this.roomsById[room.id] = room;
            this.roomsIdsByNames[room.name] = room.id;
            objectRoomsIds.push(room.id);
        }
        return objectRoomsIds;
    }
    */

    async createObjectForRoom(objectData, roomId)
    {
        try {
            let createdObject = await this.objectsRepository.create({
                room_id: roomId,
                layer_name: objectData['layer'],
                tile_index: objectData['tileIndex'],
                class_type: objectData['classType'],
                object_class_key: objectData['objectClassKey'],
                client_key: objectData['clientKey'],
                title: objectData['title'],
                private_params: objectData['privateParams'],
                client_params: objectData['clientParams'],
                enabled: objectData['enabled']
            });
            await this.createObjectAssets(createdObject.id, objectData);
            await this.createObjectStats(createdObject.id, objectData);
            await this.createObjectRespawn(createdObject.id, objectData);
        } catch (error) {
            Logger.warning('Create object for room error.', error.message, {roomId, objectData});
        }
    }

    async createObjectAssets(createdObjectId, objectData)
    {
        if(!sc.isArray(objectData.assets) || 0 === objectData.assets.length){
            return false;
        }
        try {
            for(let asset of objectData.assets){
                await this.objectsAssetsRepository.create({
                    object_id: createdObjectId,
                    asset_type: asset['assetType'],
                    asset_key: asset['assetKey'],
                    asset_file: asset['assetFile'],
                    extra_params: asset['extraParams'],
                });
            }
        } catch (error){
            Logger.warning('Create object asset error.', error.message, {createdObjectId, objectData});
        }
    }

    async createObjectStats(createdObjectId, objectData)
    {
        if(!sc.isObject(objectData.stats)){
            return false;
        }
        try {
            let statsKeys = Object.keys(objectData.stats);
            for(let statKey of statsKeys){
                let statId = sc.get(this.statsIdsByKeys, statKey);
                if(!statId){
                    Logger.error('Create Object stats, stat ID not found by key "'+statKey+'".', objectData);
                    continue;
                }
                let statValue = objectData.stats[statKey];
                await this.objectsStatsRepository.create({
                    object_id: createdObjectId,
                    stat_id: statId,
                    base_value: statValue,
                    value: statValue
                });
            }
        } catch (error){
            Logger.warning('Create object stats error.', error.message, {createdObjectId, objectData});
        }
    }

    async createObjectRespawn(createdObjectId, objectData)
    {
        if(!sc.isObject(objectData.respawn)){
            return false;
        }
        try {
            let layer = String(sc.get(objectData.respawn, 'layer', objectData.layer));
            await this.respawnRepository.create({
                object_id: createdObjectId,
                respawn_time: sc.get(objectData.respawn, 'respawnTime', 1000),
                instances_limit: sc.get(objectData.respawn, 'instancesLimit', 1),
                layer
            });
        } catch (error){
            Logger.warning('Create object respawn area error.', error.message, {createdObjectId, objectData});
        }
    }

    async fetchRoomsBy(field, objectRoomsNames)
    {
        let loadResult = await this.roomsRepository.load({[field]: {operator: 'IN', value: objectRoomsNames}});
        if(!sc.isArray(loadResult)){
            return [];
        }
        return loadResult;
    }

}

module.exports.ObjectsImporter = ObjectsImporter;
