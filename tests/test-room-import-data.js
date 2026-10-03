/**
 *
 * Reldens - Test Room Import Data
 *
 */

const { BaseTest } = require('./base-test');
const { RoomImportData } = require('../lib/import/server/room-import-data');
const { RoomCustomData } = require('../lib/rooms/server/room-custom-data');
const { sc } = require('@reldens/utils');

class TestRoomImportData extends BaseTest
{

    applyRoomData(rawRoomData)
    {
        let roomCustomData = new RoomCustomData({});
        roomCustomData.set('enabled', false);
        let roomCreateData = {
            name: 'reldens-new-age-town',
            title: 'New Age Town',
            map_filename: 'reldens-new-age-town.json',
            scene_images: 'reldens-new-age-town.png',
            customData: roomCustomData.toJsonString()
        };
        let roomImportData = new RoomImportData(rawRoomData);
        roomImportData.applyTo(roomCreateData, roomCustomData, 'reldens-new-age-town', 'New Age Town');
        return roomCreateData;
    }

    async testCustomDataEnabledOverridesImporterDefault()
    {
        await this.test('customData enabled true overrides the importer disabled default', async () => {
            let roomCreateData = this.applyRoomData({allRooms: {customData: {enabled: true}}});
            this.assert.strictEqual(sc.toJson(roomCreateData.customData).enabled, true);
        });
    }

    async testDirectFieldsAreAssigned()
    {
        await this.test('primitive room fields are assigned directly', async () => {
            let roomCreateData = this.applyRoomData({
                allRooms: {server_url: 'https://some-server-url', room_class_key: 'custom-room'}
            });
            this.assert.strictEqual(roomCreateData.server_url, 'https://some-server-url');
            this.assert.strictEqual(roomCreateData.room_class_key, 'custom-room');
        });
    }

    async testMapPropertiesOverrideAllRooms()
    {
        await this.test('rooms properties override allRooms properties', async () => {
            let roomCreateData = this.applyRoomData({
                allRooms: {server_url: 'https://all-rooms-url', customData: {enabled: false, allowGuest: true}},
                rooms: {'reldens-new-age-town': {server_url: 'https://map-url', customData: {enabled: true}}}
            });
            let savedCustomData = sc.toJson(roomCreateData.customData);
            this.assert.strictEqual(roomCreateData.server_url, 'https://map-url');
            this.assert.strictEqual(savedCustomData.enabled, true);
            this.assert.strictEqual(savedCustomData.allowGuest, true);
        });
    }

    async testMapPropertiesMatchedByTitle()
    {
        await this.test('rooms properties are matched by map title when the map name is absent', async () => {
            let roomCreateData = this.applyRoomData({rooms: {'New Age Town': {server_url: 'https://title-url'}}});
            this.assert.strictEqual(roomCreateData.server_url, 'https://title-url');
        });
    }

    async testUnknownFieldIsIgnored()
    {
        await this.test('a key that is not a room field is ignored and not stored in customData', async () => {
            let roomCreateData = this.applyRoomData({allRooms: {notARoomField: 'value'}});
            this.assert.strictEqual(sc.hasOwn(roomCreateData, 'notARoomField'), false);
            this.assert.strictEqual(sc.hasOwn(sc.toJson(roomCreateData.customData), 'notARoomField'), false);
        });
    }

    async testNonPrimitiveFieldValueIsIgnored()
    {
        await this.test('a non primitive value for a room field is ignored', async () => {
            let roomCreateData = this.applyRoomData({allRooms: {server_url: {nested: true}}});
            this.assert.strictEqual(sc.hasOwn(roomCreateData, 'server_url'), false);
        });
    }

    async testCustomDataMustBeAnObject()
    {
        await this.test('a customData value that is not an object is ignored and keeps the defaults', async () => {
            let roomCreateData = this.applyRoomData({allRooms: {customData: 'enabled'}});
            this.assert.strictEqual(sc.toJson(roomCreateData.customData).enabled, false);
        });
    }

    async testRoomDataAcceptsJsonString()
    {
        await this.test('roomData is parsed when it arrives as a JSON string', async () => {
            let roomCreateData = this.applyRoomData('{"allRooms":{"customData":{"enabled":true}}}');
            this.assert.strictEqual(sc.toJson(roomCreateData.customData).enabled, true);
        });
    }

    async testEmptyRoomDataKeepsImporterDefaults()
    {
        await this.test('an empty roomData keeps the importer defaults untouched', async () => {
            let roomCreateData = this.applyRoomData({});
            this.assert.strictEqual(sc.toJson(roomCreateData.customData).enabled, false);
            this.assert.strictEqual(roomCreateData.name, 'reldens-new-age-town');
        });
    }

}

module.exports.TestRoomImportData = TestRoomImportData;
