/**
 *
 * Reldens - Test Rooms Map Data Provider
 *
 */

const { BaseTest } = require('./base-test');
const { RoomsMapDataProvider } = require('../lib/admin/server/rooms-map-data-provider');

class TestRoomsMapDataProvider extends BaseTest
{

    createRoomsRepository(rooms)
    {
        return {
            tableName: 'rooms',
            loadAll: async () => rooms
        };
    }

    createConfig(loadedMaps)
    {
        return {
            getWithoutLogs: (path, defaultValue) => {
                if('server/maps' === path){
                    return loadedMaps;
                }
                return defaultValue;
            }
        };
    }

    createProvider(rooms, loadedMaps = false)
    {
        return new RoomsMapDataProvider(
            {getEntity: () => this.createRoomsRepository(rooms)},
            loadedMaps ? this.createConfig(loadedMaps) : false
        );
    }

    async testRoomsMapListIncludesTheMapLayersNames()
    {
        await this.test('the rooms map list includes the map layers names', async () => {
            let provider = this.createProvider(
                [{
                    id: 2,
                    name: 'reldens-house-1',
                    map_filename: 'reldens-house-1.json',
                    scene_images: 'reldens-house-1.png'
                }],
                {'reldens-house-1': {layers: [{name: 'ground'}, {name: 'collisions'}, {name: 'change-points'}]}}
            );
            let roomsMapList = await provider.loadRoomsMapList();
            this.assert.strictEqual(roomsMapList.length, 1);
            this.assert.deepStrictEqual([...roomsMapList].shift(), {
                id: 2,
                name: 'reldens-house-1',
                mapFile: 'reldens-house-1.json',
                mapImages: 'reldens-house-1.png',
                layers: ['ground', 'collisions', 'change-points']
            });
        });
    }

    async testLayersAreEmptyWhenTheMapIsNotLoaded()
    {
        await this.test('the layers are empty when the room map is not loaded in the configuration', async () => {
            let provider = this.createProvider(
                [{
                    id: 41,
                    name: 'reldens-new-age-town',
                    map_filename: 'random-map-2026-08-18-16-59-11.json',
                    scene_images: 'random-map-2026-08-18-16-59-11.png'
                }],
                {'reldens-house-1': {layers: [{name: 'ground'}]}}
            );
            let roomsMapList = await provider.loadRoomsMapList();
            this.assert.deepStrictEqual([...roomsMapList].shift().layers, []);
        });
    }

    async testLayersAreEmptyWithoutConfigurationManager()
    {
        await this.test('the layers are empty when the configuration manager is not available', async () => {
            let provider = this.createProvider([{
                id: 2,
                name: 'reldens-house-1',
                map_filename: 'reldens-house-1.json',
                scene_images: 'reldens-house-1.png'
            }]);
            let roomsMapList = await provider.loadRoomsMapList();
            this.assert.deepStrictEqual([...roomsMapList].shift().layers, []);
        });
    }

    async testLayersAreEmptyWithoutMapFileName()
    {
        await this.test('the layers are empty when the room has no map file', async () => {
            let provider = this.createProvider(
                [{id: 3, name: 'reldens-house-2', map_filename: '', scene_images: 'reldens-house-2.png'}],
                {'reldens-house-2': {layers: [{name: 'ground'}]}}
            );
            let roomsMapList = await provider.loadRoomsMapList();
            this.assert.deepStrictEqual([...roomsMapList].shift().layers, []);
        });
    }

    async testRoomsMapListIsEmptyWithoutRooms()
    {
        await this.test('the rooms map list is empty when the rooms could not be loaded', async () => {
            let provider = this.createProvider(false, {});
            let roomsMapList = await provider.loadRoomsMapList();
            this.assert.deepStrictEqual(roomsMapList, []);
        });
    }

}

module.exports.TestRoomsMapDataProvider = TestRoomsMapDataProvider;
