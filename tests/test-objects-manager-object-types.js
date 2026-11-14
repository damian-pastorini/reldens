/**
 *
 * Reldens - Test Objects Manager Object Types
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectsManager } = require('../lib/objects/server/manager');
const { ObjectTypesClasses } = require('../lib/objects/server/object/object-types-classes');
const { ObjectTypes } = require('../lib/objects/server/object/object-types');
const { BaseObject } = require('../lib/objects/server/object/type/base-object');

class TestObjectsManagerObjectTypes extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.baseClassType = {model: {id: ObjectTypes.BASE, key: 'base'}, classInstance: ObjectTypesClasses[ObjectTypes.BASE]};
        this.serverConfig = {objectsClassTypes: {[ObjectTypes.BASE]: this.baseClassType}};
        this.objectsConfig = {configList: {server: this.serverConfig}, getWithoutLogs: (path, defaultValue) => defaultValue};
    }

    async testBaseTypeRowLoadsABaseObject()
    {
        await this.test('an object row of the base type without a custom class loads a base object in the room', async () => {
            let emittedEvents = [];
            let objectsManager = new ObjectsManager({
                config: this.objectsConfig,
                events: {emit: (eventName) => emittedEvents.push(eventName)},
                dataServer: {}
            });
            objectsManager.roomObjectsData = [{
                id: 50,
                room_id: 41,
                layer_name: 'ground',
                tile_index: 3500,
                class_type: ObjectTypes.BASE,
                object_class_key: 'base_1',
                client_key: 'base_object_1',
                title: null,
                private_params: '{}',
                client_params: '{}',
                enabled: 1
            }];
            await objectsManager.generateObjects();
            let created = objectsManager.roomObjects.ground3500;
            this.assert.strictEqual(created.constructor, BaseObject);
            this.assert.deepStrictEqual(Object.keys(objectsManager.roomObjects), ['ground3500']);
            this.assert.deepStrictEqual([created.key, created.id], ['base_object_1', 50]);
            this.assert.strictEqual(objectsManager.roomObjectsByLayer.ground[50], created);
            this.assert.deepStrictEqual(objectsManager.objectsAnimationsData, {});
            this.assert.deepStrictEqual(emittedEvents, ['reldens.afterRunAdditionalSetup']);
        });
    }

}

module.exports.TestObjectsManagerObjectTypes = TestObjectsManagerObjectTypes;
