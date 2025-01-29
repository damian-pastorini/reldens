/**
 *
 * Reldens - ObjectsImporter
 *
 */

const { FileHandler } = require('../../game/server/file-handler');
const { Logger, sc } = require('@reldens/utils');

class ObjectsImporter
{

    constructor(serverManager)
    {
        this.serverManager = serverManager;
        this.objectTypesRepository = this.serverManager?.dataServer?.getEntity('objectsTypes');
        this.statsRepository = this.serverManager?.dataServer?.getEntity('stats');
        this.roomsRepository = this.serverManager?.dataServer?.getEntity('rooms');
        this.objectsRepository = this.serverManager?.dataServer?.getEntity('objects');
        this.objectsStatsRepository = this.serverManager?.dataServer?.getEntity('objectsStats');
        this.objectsAssetsRepository = this.serverManager?.dataServer?.getEntity('objectsAssets');
        this.objectsAnimationsRepository = this.serverManager?.dataServer?.getEntity('objectsAnimations');
        this.respawnRepository = this.serverManager?.dataServer?.getEntity('respawn');
        this.rewardsRepository = this.serverManager?.dataServer?.getEntity('rewards');
        this.statsById = {};
        this.statsIdsByKeys = {};
        this.objectTypesIdByName = {};
        // @TODO - BETA - Improve importer to only load required rooms once.
        // this.roomsById = {};
        // this.roomsIdsByNames = {};
        this.defaults = {};
        this.attributesPerLevelFile = '';
        this.experiencePerLevelFile = '';
        this.attributesPerLevel = {};
        this.experiencePerLevel = {};
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
            'objectTypesRepository',
            'statsRepository',
            'roomsRepository',
            'objectsRepository',
            'objectsStatsRepository',
            'objectsAssetsRepository',
            'objectsAnimationsRepository',
            'respawnRepository',
            'rewardsRepository'
        ])){
            return false;
        }
        await this.loadObjectTypes();
        await this.loadStats();
        this.attributesPerLevelFile = sc.get(data, 'attributesPerLevelFile', '');
        this.experiencePerLevelFile = sc.get(data, 'experiencePerLevelFile', '');
        this.attributesPerLevel = sc.get(
            this.loadDataFromJsonFile(this.attributesPerLevelFile),
            'statsByVariation',
            {}
        );
        this.experiencePerLevel = this.loadDataFromJsonFile(this.experiencePerLevelFile);
        this.defaults = sc.get(data, 'defaults', {});
        for(let objectData of data.objects){
            await this.createObjectPerRoom(
                this.enrichObjectData(objectData)
            );
        }
    }

    enrichObjectData(objectData)
    {
        let enrichedObjectData = sc.deepMergeProperties(sc.deepJsonClone(this.defaults), objectData);
        let level = String(sc.get(enrichedObjectData, 'level', '1'));
        let attributes = this.fetchAttributes(enrichedObjectData, level);
        if(attributes){
            enrichedObjectData.stats = attributes;
        }
        enrichedObjectData.experience = this.fetchExperience(enrichedObjectData, level);
        return enrichedObjectData;
    }

    fetchAttributes(enrichedObjectData, level)
    {
        if(0 === Object.keys(this.attributesPerLevel).length){
            Logger.debug('No "attributesPerLevel" found.');
            return false;
        }
        let attributesKey = sc.get(enrichedObjectData, 'attributesKey', false);
        if(!attributesKey){
            Logger.debug('No "attributesKey" found.');
            return false;
        }
        let subKey = sc.get(enrichedObjectData, 'attributesSubTypeKey', false);
        if(!subKey){
            Logger.debug('No "subKey" found.');
            return false;
        }
        let attributesByKey = sc.get(this.attributesPerLevel, attributesKey, false);
        if(!attributesByKey){
            Logger.debug('No "attributesByKey" found.');
            return false;
        }
        let attributesByKeyAndLevel = sc.get(attributesByKey, level, false);
        if(!attributesByKeyAndLevel){
            Logger.debug('No "attributesByKeyAndLevel" found.');
            return false;
        }
        return attributesByKeyAndLevel[subKey];
    }

    fetchExperience(enrichedObjectData, level)
    {
        let experiencePerLevel = sc.get(this.experiencePerLevel, level, false);
        if(!experiencePerLevel){
            Logger.debug('No "experiencePerLevel" found.');
            return false;
        }
        let experienceKey = sc.get(enrichedObjectData, 'experienceKey', false);
        if(!experienceKey){
            Logger.debug('No "experienceKey" found.');
            return false;
        }
        let experiencePerLevelAndKey = sc.get(experiencePerLevel, experienceKey, false);
        if(!experiencePerLevelAndKey){
            Logger.debug('No "experiencePerLevelAndKey" found.');
            return false;
        }
        return experiencePerLevelAndKey.exp;
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

    async loadObjectTypes()
    {
        let objectTypesModels = await this.objectTypesRepository.loadAll();
        if(!sc.isArray(objectTypesModels) || 0 === objectTypesModels.length){
            return false;
        }
        for(let objectType of objectTypesModels){
            this.objectTypesIdByName[objectType.key] = objectType.id;
        }
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

    loadDataFromJsonFile(filePath)
    {
        if('' === filePath){
            return {};
        }
        return FileHandler.fetchFileJson(FileHandler.joinPaths(
            this.serverManager.themeManager.projectGenerateDataPath,
            filePath
        ));
    }

    async createObjectPerRoom(objectData)
    {
        let objectRooms = await this.fetchRooms(objectData);
        if(0 === objectRooms.length){
            return false;
        }
        // @TODO - BETA - Improve importer to only load required rooms once.
        // this.mapRooms(objectRooms);
        for(let room of objectRooms){
            let clientKey = sc.get(objectData, 'clientKey', '');
            objectData.objectClassKey = room.name+'_'+ clientKey;
            await this.createObjectForRoom(objectData, room.id);
            Logger.info('Generated object "'+clientKey+'" in room "'+room.name+'".');
        }
    }

    async fetchRooms(objectData)
    {
        let objectRoomsIds = sc.get(objectData, 'roomsId');
        let objectRooms = [];
        if(sc.isArray(objectRoomsIds) && 0 < objectRoomsIds.length){
            objectRooms = await this.fetchRoomsBy('id', objectRoomsIds);
        }
        let objectRoomsNames = sc.get(objectData, 'roomsNames');
        if (sc.isArray(objectRoomsNames) && 0 < objectRoomsNames.length) {
            objectRooms = await this.fetchRoomsBy('name', objectRoomsNames);
        }
        return objectRooms;
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
                class_type: this.fetchClassTypeId(objectData['classType']),
                object_class_key: objectData['objectClassKey'],
                client_key: objectData['clientKey'],
                title: objectData['title'],
                private_params: this.convertToJsonString(objectData['privateParams']),
                client_params: this.convertToJsonString(objectData['clientParams']),
                enabled: objectData['enabled']
            });
            await this.createObjectAssets(createdObject.id, objectData);
            await this.createObjectAnimations(createdObject.id, objectData);
            await this.createObjectStats(createdObject.id, objectData);
            await this.createObjectRespawn(createdObject.id, objectData);
            await this.createObjectExperienceReward(createdObject.id, objectData);
        } catch (error) {
            Logger.warning('Create object for room error.', error.message, {roomId, objectData});
        }
    }

    fetchClassTypeId(classType)
    {
        if(!classType){
            return this.objectTypesIdByName['base'];
        }
        if(sc.isString(classType) && this.objectTypesIdByName[classType]){
            return this.objectTypesIdByName[classType];
        }
        return classType;
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
                    asset_type: sc.get(asset, 'assetType', 'spritesheet'),
                    asset_key: asset['assetKey'],
                    asset_file: asset['assetFile'],
                    extra_params: this.convertToJsonString(asset['extraParams']),
                });
            }
        } catch (error){
            Logger.warning('Create object asset error.', error.message, {createdObjectId, objectData});
        }
    }

    async createObjectAnimations(createdObjectId, objectData)
    {
        if(!sc.isObject(objectData.animations)){
            return false;
        }
        let animationsKeys = Object.keys(objectData.animations);
        if(0 === animationsKeys.length){
            return false;
        }
        try {
            for(let key of animationsKeys){
                await this.objectsAnimationsRepository.create({
                    object_id: createdObjectId,
                    animationKey: objectData.layer+'_'+createdObjectId+'_'+key,
                    animationData: this.convertToJsonString(objectData.animations[key])
                });
            }
        } catch (error){
            Logger.warning('Create object animation error.', error.message, {createdObjectId, objectData});
        }
    }

    convertToJsonString(data)
    {
        if(!data){
            return '{}';
        }
        if(sc.isString(data)){
            return data;
        }
        if(sc.isString(data['childObjectType'])){
            data['childObjectType'] = this.fetchClassTypeId(data.childObjectType);
        }
        return JSON.stringify(data);
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

    async createObjectExperienceReward(createdObjectId, objectData)
    {
        if(!sc.isNumber(objectData.experience)){
            Logger.debug('Object data "experience" is not a number.');
            return false;
        }
        try {
            await this.rewardsRepository.create({
                object_id: createdObjectId,
                experience: objectData.experience,
                drop_rate: 100,
                drop_quantity: 1
            });
        } catch (error){
            Logger.warning('Create object respawn area error.', error.message, {createdObjectId, objectData});
        }
    }

    async fetchRoomsBy(field, objectRoomsDataSet)
    {
        let loadResult = await this.roomsRepository.load({[field]: {operator: 'IN', value: objectRoomsDataSet}});
        if(!sc.isArray(loadResult)){
            return [];
        }
        return loadResult;
    }

}

module.exports.ObjectsImporter = ObjectsImporter;
