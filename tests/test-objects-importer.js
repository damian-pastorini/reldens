/**
 *
 * Reldens - Test Objects Importer
 *
 * Tests the ObjectsImporter (the administration objects import) against the test database with the sample data of the
 * administration objects import page (theme/admin/js/objects-import-bindings.js, client keys prefixed to keep them
 * apart from the sample objects): every sample object is created in the sample room with the import defaults, and the
 * room ObjectsManager loads it with its class key, data, asset, respawn area and stats (every sample stat key is a stored
 * stat, so every one of them is imported).
 * The imported objects and their relations are deleted after the test.
 *
 */

const { BaseTest } = require('./base-test');
const { Utils } = require('./utils');
const { AdminBrowserScriptLoader } = require('./fixtures/admin-browser-script-loader');
const { ObjectsImporter } = require('../lib/import/server/objects-importer');
const { ObjectsManager } = require('../lib/objects/server/manager');
const { sc } = require('@reldens/utils');

class TestObjectsImporter extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.isIntegration = true;
        this.objectRelations = ['objectsAssets', 'objectsAnimations', 'objectsStats', 'respawn', 'rewards'];
    }

    async deleteObjectRelations(dataServer, objectId)
    {
        for(let entityKey of this.objectRelations){
            await dataServer.getEntity(entityKey).delete({object_id: objectId});
        }
    }

    async deleteImportedObjects(dataServer, objectClassKeys)
    {
        for(let objectClassKey of objectClassKeys){
            let object = await dataServer.getEntity('objects').loadOneBy('object_class_key', objectClassKey);
            if(!object){
                continue;
            }
            await this.deleteObjectRelations(dataServer, object.id);
            await dataServer.getEntity('objects').deleteById(object.id);
        }
    }

    loadedObjectValues(loadedObject, respawnArea)
    {
        return {
            object_class_key: loadedObject.object_class_key,
            client_key: loadedObject.client_key,
            title: loadedObject.title,
            layer_name: loadedObject.layer_name,
            class_type: loadedObject.class_type,
            enabled: loadedObject.enabled,
            private_params: loadedObject.private_params,
            client_params: loadedObject.client_params,
            assets: loadedObject.related_objects_assets.map(asset => [asset.asset_key, asset.asset_file, asset.extra_params]),
            stats: loadedObject.related_objects_stats
                .map(objectStat => [objectStat.related_stats.key, objectStat.base_value, objectStat.value])
                .sort((statA, statB) => statA[0].localeCompare(statB[0])),
            respawn: [respawnArea.respawn_time, respawnArea.instances_limit, respawnArea.layer]
        };
    }

    expectedObjectValues(objectData, sampleData)
    {
        let defaults = sampleData.defaults;
        return {
            object_class_key: defaults.roomsNames[0]+'_'+objectData.clientKey,
            client_key: objectData.clientKey,
            title: objectData.title,
            layer_name: defaults.layer,
            class_type: defaults.classType,
            enabled: defaults.enabled,
            private_params: objectData.privateParams,
            client_params: defaults.clientParams,
            assets: objectData.assets.map(asset => [asset.assetKey, asset.assetFile, asset.extraParams]),
            stats: Object.keys(defaults.stats).sort().map(statKey => [statKey, defaults.stats[statKey], defaults.stats[statKey]]),
            respawn: [defaults.respawn.respawnTime, defaults.respawn.instancesLimit, defaults.layer]
        };
    }

    async testTheSampleObjectsAreImportedIntoTheirRoom()
    {
        await this.test('the sample objects are imported and loaded by their room with their data, asset, respawn and stats', async () => {
            let dataServer = Utils.createDataServer(this.config);
            await dataServer.connect();
            dataServer.generateEntities();
            let sampleData = AdminBrowserScriptLoader.loadObjectsSampleData();
            sampleData.objects = sampleData.objects.map(
                objectData => Object.assign({}, objectData, {clientKey: 'import_test_'+objectData.clientKey})
            );
            let roomName = sampleData.defaults.roomsNames[0];
            let objectClassKeys = sampleData.objects.map(objectData => roomName+'_'+objectData.clientKey);
            await this.deleteImportedObjects(dataServer, objectClassKeys);
            let room = await dataServer.getEntity('rooms').loadOneBy('name', roomName);
            let imported = await new ObjectsImporter({dataServer, themeManager: {}}).import(sc.deepJsonClone(sampleData));
            let objectsManager = new ObjectsManager({config: {}, events: {on: () => true}, dataServer, roomId: room.id, roomName});
            await objectsManager.loadObjectsByRoomId(room.id);
            let loadedValues = [];
            for(let loadedObject of objectsManager.roomObjectsData){
                if(-1 === objectClassKeys.indexOf(loadedObject.object_class_key)){
                    continue;
                }
                let respawnArea = await dataServer.getEntity('respawn').loadOneBy('object_id', loadedObject.id);
                loadedValues.push(this.loadedObjectValues(loadedObject, respawnArea));
            }
            let storedStatsKeys = (await dataServer.getEntity('stats').loadAll()).map(stat => stat.key);
            await this.deleteImportedObjects(dataServer, objectClassKeys);
            this.assert.strictEqual(imported, true);
            this.assert.deepStrictEqual(
                Object.keys(sampleData.defaults.stats).filter(statKey => -1 === storedStatsKeys.indexOf(statKey)),
                []
            );
            this.assert.deepStrictEqual(
                loadedValues,
                sampleData.objects.map(objectData => this.expectedObjectValues(objectData, sampleData))
            );
        });
    }

}

module.exports.TestObjectsImporter = TestObjectsImporter;
