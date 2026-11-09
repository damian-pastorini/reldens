/**
 *
 * Reldens - Test Rc1 Sql Update
 *
 */

const { BaseTest } = require('./base-test');
const { Utils } = require('./utils');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestRc1SqlUpdate extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.updateFilePath = FileHandler.joinPaths(process.cwd(), 'migrations', 'development', 'rc.1-sql-update.sql');
        this.treeFilters = {object_class_key: 'enemy_1', client_key: 'enemy_forest_1'};
        this.teleportFilters = {object_class_key: 'teleport_1'};
        this.primaryKeys = {objects_assets: 'object_asset_id'};
        this.generatedValues = {id: null, object_asset_id: null, object_id: null, created_at: null, updated_at: null};
        this.updatedTables = [
            'features',
            'objects_types',
            'config',
            'items_group',
            'items_item',
            'items_item_modifiers',
            'ads',
            'ads_event_video',
            'objects',
            'objects_assets',
            'skills_levels_set',
            'audio_markers'
        ];
    }

    async connectDataServer()
    {
        let dataServer = Utils.createDataServer(this.config);
        await dataServer.connect();
        return dataServer;
    }

    async runUpdateBetween(dataServer, applyChange, readResult, restoreChange)
    {
        await applyChange();
        await dataServer.rawQuery(FileHandler.readFile(this.updateFilePath, {encoding: 'utf8'}));
        let result = await readResult();
        await restoreChange();
        await dataServer.disconnect();
        return result;
    }

    async loadRows(dataServer, tableName, filters = {}, replacedValues = {})
    {
        return (await dataServer.knex(tableName).where(filters).orderBy(sc.get(this.primaryKeys, tableName, 'id')))
            .map(row => Object.assign({}, row, replacedValues));
    }

    async loadOneRow(dataServer, tableName, filters)
    {
        return [...await this.loadRows(dataServer, tableName, filters)].shift();
    }

    async loadUpdatedTables(dataServer)
    {
        let tablesRows = {};
        for(let tableName of this.updatedTables){
            tablesRows[tableName] = await this.loadRows(dataServer, tableName);
        }
        return tablesRows;
    }

    async runUpdateOnTreeSettings(treeSettings)
    {
        let dataServer = await this.connectDataServer();
        let originalTree = await this.loadOneRow(dataServer, 'objects', this.treeFilters);
        let updatedTree = await this.runUpdateBetween(
            dataServer,
            async () => await dataServer.knex('objects').where(this.treeFilters).update({
                private_params: sc.toJsonString(treeSettings(sc.toJson(originalTree.private_params, {})))
            }),
            async () => await this.loadOneRow(dataServer, 'objects', this.treeFilters),
            async () => await dataServer.knex('objects').where(this.treeFilters).update({
                private_params: originalTree.private_params
            })
        );
        return {original: sc.toJson(originalTree.private_params, {}), updated: sc.toJson(updatedTree.private_params, {})};
    }

    async testUpdateOnAnUpdatedDatabaseChangesNoRow()
    {
        await this.test('the update run on an updated database changes no row of the updated tables', async () => {
            let dataServer = await this.connectDataServer();
            let rowsBefore = await this.loadUpdatedTables(dataServer);
            let rowsAfter = await this.runUpdateBetween(
                dataServer,
                async () => false,
                async () => await this.loadUpdatedTables(dataServer),
                async () => false
            );
            this.assert.deepStrictEqual(rowsAfter, rowsBefore);
        });
    }

    async testDisabledFeatureStaysDisabled()
    {
        await this.test('a feature disabled by the game owner stays disabled after the update', async () => {
            let dataServer = await this.connectDataServer();
            let featureFilters = {code: 'teams'};
            let originalFeature = await this.loadOneRow(dataServer, 'features', featureFilters);
            let updatedFeatures = await this.runUpdateBetween(
                dataServer,
                async () => await dataServer.knex('features').where(featureFilters).update({is_enabled: 0}),
                async () => await this.loadRows(dataServer, 'features', featureFilters),
                async () => await dataServer.knex('features').where(featureFilters).update({
                    is_enabled: originalFeature.is_enabled
                })
            );
            this.assert.strictEqual(originalFeature.is_enabled, 1);
            this.assert.deepStrictEqual(updatedFeatures, [Object.assign({}, originalFeature, {is_enabled: 0})]);
        });
    }

    async testMissingFeatureIsAddedEnabled()
    {
        await this.test('a missing feature is added enabled by the update', async () => {
            let dataServer = await this.connectDataServer();
            let featureFilters = {code: 'quests'};
            let originalFeature = await this.loadOneRow(dataServer, 'features', featureFilters);
            let addedFeatures = await this.runUpdateBetween(
                dataServer,
                async () => await dataServer.knex('features').where(featureFilters).delete(),
                async () => await this.loadRows(dataServer, 'features', featureFilters, {id: null}),
                async () => await dataServer.knex('features').where(featureFilters).update({id: originalFeature.id})
            );
            this.assert.deepStrictEqual(
                addedFeatures,
                [{id: null, code: 'quests', title: 'Quests', is_enabled: 1}]
            );
        });
    }

    async testExistingSampleItemKeepsItsContent()
    {
        await this.test('an existing item with a sample key keeps its content after the update', async () => {
            let dataServer = await this.connectDataServer();
            let itemFilters = {key: 'restoration_scroll'};
            let originalItem = await this.loadOneRow(dataServer, 'items_item', itemFilters);
            let customContent = {label: 'Custom Scroll', customData: '{"canBeDropped":true}'};
            let updatedItems = await this.runUpdateBetween(
                dataServer,
                async () => await dataServer.knex('items_item').where(itemFilters).update(customContent),
                async () => await this.loadRows(dataServer, 'items_item', itemFilters, this.generatedValues),
                async () => await dataServer.knex('items_item').where(itemFilters).update({
                    label: originalItem.label,
                    customData: originalItem.customData
                })
            );
            this.assert.deepStrictEqual(
                updatedItems,
                [Object.assign({}, originalItem, customContent, this.generatedValues)]
            );
        });
    }

    async testMissingRelatedRowsAreAddedByTheirKeys()
    {
        await this.test('the missing item modifier and ad event are added for the rows found by their keys', async () => {
            let dataServer = await this.connectDataServer();
            let sword = await this.loadOneRow(dataServer, 'items_item', {key: 'growing_sword'});
            let resurrectionAd = await this.loadOneRow(dataServer, 'ads', {key: 'resurrection-video'});
            let modifierFilters = {item_id: sword.id};
            let eventFilters = {ads_id: resurrectionAd.id};
            let originalModifiers = await this.loadRows(dataServer, 'items_item_modifiers', modifierFilters);
            let originalEvents = await this.loadRows(dataServer, 'ads_event_video', eventFilters);
            let addedRows = await this.runUpdateBetween(
                dataServer,
                async () => {
                    await dataServer.knex('items_item_modifiers').where(modifierFilters).delete();
                    await dataServer.knex('ads_event_video').where(eventFilters).delete();
                },
                async () => ({
                    modifiers: await this.loadRows(dataServer, 'items_item_modifiers', modifierFilters, {id: null}),
                    events: await this.loadRows(dataServer, 'ads_event_video', eventFilters, {id: null})
                }),
                async () => {
                    await dataServer.knex('items_item_modifiers').where(modifierFilters).delete();
                    await dataServer.knex('ads_event_video').where(eventFilters).delete();
                    await dataServer.knex('items_item_modifiers').insert(originalModifiers);
                    await dataServer.knex('ads_event_video').insert(originalEvents);
                }
            );
            this.assert.strictEqual(originalModifiers.length, 1);
            this.assert.strictEqual(originalEvents.length, 1);
            this.assert.deepStrictEqual(addedRows, {
                modifiers: originalModifiers.map(modifier => Object.assign({}, modifier, {id: null})),
                events: originalEvents.map(adEvent => Object.assign({}, adEvent, {id: null}))
            });
        });
    }

    async testTreeKillScoreIsAddedWhenMissing()
    {
        await this.test('the Tree kill score is added to its settings when it has none', async () => {
            let settingsWithoutScore = {};
            let treeSettings = await this.runUpdateOnTreeSettings((originalSettings) => {
                settingsWithoutScore = Object.assign({}, originalSettings);
                delete settingsWithoutScore.killScore;
                return settingsWithoutScore;
            });
            this.assert.strictEqual(treeSettings.original.killScore, 8);
            this.assert.deepStrictEqual(treeSettings.updated, Object.assign({}, settingsWithoutScore, {killScore: 8}));
        });
    }

    async testTreeCustomKillScoreIsKept()
    {
        await this.test('a custom Tree kill score is kept by the update', async () => {
            let treeSettings = await this.runUpdateOnTreeSettings(
                (originalSettings) => Object.assign({}, originalSettings, {killScore: 3})
            );
            this.assert.deepStrictEqual(treeSettings.updated, Object.assign({}, treeSettings.original, {killScore: 3}));
        });
    }

    async testTeleportNpcIsNotAddedOnAUsedTile()
    {
        await this.test('the teleport NPC is not added when its town tile is used by another object', async () => {
            let dataServer = await this.connectDataServer();
            let originalTeleport = await this.loadOneRow(dataServer, 'objects', this.teleportFilters);
            let teleportIdFilters = {id: originalTeleport.id};
            let originalAssets = await this.loadRows(dataServer, 'objects_assets');
            let updatedRows = await this.runUpdateBetween(
                dataServer,
                async () => await dataServer.knex('objects').where(teleportIdFilters).update({
                    object_class_key: 'custom_npc'
                }),
                async () => ({
                    teleports: await this.loadRows(dataServer, 'objects', this.teleportFilters),
                    tileObjects: await this.loadRows(dataServer, 'objects', {
                        room_id: originalTeleport.room_id,
                        layer_name: originalTeleport.layer_name,
                        tile_index: originalTeleport.tile_index
                    }),
                    assets: await this.loadRows(dataServer, 'objects_assets')
                }),
                async () => await dataServer.knex('objects').where(teleportIdFilters).update({
                    object_class_key: originalTeleport.object_class_key
                })
            );
            this.assert.deepStrictEqual(updatedRows.teleports, []);
            this.assert.deepStrictEqual(updatedRows.tileObjects.map(tileObject => tileObject.id), [originalTeleport.id]);
            this.assert.deepStrictEqual(updatedRows.assets, originalAssets);
        });
    }

    async testTeleportNpcIsAddedWhenItsKeyAndTileAreFree()
    {
        await this.test('the teleport NPC and its asset are added when its key and its town tile are free', async () => {
            let dataServer = await this.connectDataServer();
            let originalTeleport = await this.loadOneRow(dataServer, 'objects', this.teleportFilters);
            let originalAssets = await this.loadRows(dataServer, 'objects_assets', {object_id: originalTeleport.id});
            let addedRows = await this.runUpdateBetween(
                dataServer,
                async () => await this.deleteObjectWithAssets(dataServer, originalTeleport.id),
                async () => await this.loadAddedTeleports(dataServer),
                async () => {
                    for(let addedTeleport of await this.loadRows(dataServer, 'objects', this.teleportFilters)){
                        await this.deleteObjectWithAssets(dataServer, addedTeleport.id);
                    }
                    await dataServer.knex('objects').insert(originalTeleport);
                    await dataServer.knex('objects_assets').insert(originalAssets);
                }
            );
            this.assert.strictEqual(originalAssets.length, 1);
            this.assert.deepStrictEqual(addedRows.assetsOwners, addedRows.teleportsIds);
            this.assert.deepStrictEqual(addedRows.teleports, [Object.assign({}, originalTeleport, this.generatedValues)]);
            this.assert.deepStrictEqual(
                addedRows.assets,
                originalAssets.map(asset => Object.assign({}, asset, this.generatedValues))
            );
        });
    }

    async deleteObjectWithAssets(dataServer, objectId)
    {
        await dataServer.knex('objects_assets').where({object_id: objectId}).delete();
        await dataServer.knex('objects').where({id: objectId}).delete();
    }

    async loadAddedTeleports(dataServer)
    {
        let addedTeleports = await this.loadRows(dataServer, 'objects', this.teleportFilters);
        let addedAssets = [];
        for(let addedTeleport of addedTeleports){
            addedAssets.push(...await this.loadRows(dataServer, 'objects_assets', {object_id: addedTeleport.id}));
        }
        return {
            teleportsIds: addedTeleports.map(teleport => teleport.id),
            assetsOwners: addedAssets.map(asset => asset.object_id),
            teleports: addedTeleports.map(teleport => Object.assign({}, teleport, this.generatedValues)),
            assets: addedAssets.map(asset => Object.assign({}, asset, this.generatedValues))
        };
    }

}

module.exports.TestRc1SqlUpdate = TestRc1SqlUpdate;
