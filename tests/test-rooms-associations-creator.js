/**
 *
 * Reldens - Test Rooms Associations Creator
 *
 * Tests the RoomsAssociationsCreator with the real sample maps and recording repositories: the return point properties
 * of reldens-forest-level-1 create its return point on the tile of their x and y properties with their position as
 * direction (the default marker of its return-point-for-default property is lost, ISSUE #405, so is_default and
 * from_room_id are not checked); and the change-point-for properties of reldens-new-age-town-house-01 create one change
 * point per property to the room found by name.
 *
 */

const { BaseTest } = require('./base-test');
const { RoomsAssociationsCreator } = require('../lib/import/server/rooms-associations-creator');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestRoomsAssociationsCreator extends BaseTest
{

    loadMap(mapName)
    {
        let mapJson = sc.parseJson(FileHandler.readFile(
            FileHandler.joinPaths(process.cwd(), 'theme', 'default', 'assets', 'maps', mapName+'.json')
        ));
        let properties = [];
        for(let layer of mapJson.layers){
            properties.push(...sc.get(layer, 'properties', []));
        }
        return {mapJson, properties};
    }

    createCreator(mapName, mapJson, recorded, existingRooms)
    {
        return new RoomsAssociationsCreator({
            roomsRepository: {loadOneBy: async (field, value) => sc.get(existingRooms, value, null)},
            roomsReturnPointsRepository: {create: async (data) => recorded.returnPoints.push(data) && {id: 1}},
            roomsChangePointsRepository: {create: async (data) => recorded.changePoints.push(data) && {id: 2}},
            createdRooms: {},
            mapsJson: {[mapName]: mapJson},
            importAssociationsForChangePoints: false
        });
    }

    async testTheMapReturnPointPropertiesCreateTheReturnPoint()
    {
        await this.test('the map return point properties create the return point on their tile with their direction', async () => {
            let mapName = 'reldens-forest-level-1';
            let {mapJson, properties} = this.loadMap(mapName);
            let propertyValue = (name) => properties.find(property => name === property.name).value;
            let recorded = {returnPoints: [], changePoints: []};
            let creator = this.createCreator(mapName, mapJson, recorded, {[mapName]: {id: 5, name: mapName}});
            await creator.createRoomsReturnPoints({id: 5, name: mapName});
            this.assert.deepStrictEqual(
                recorded.returnPoints.map(point => [point.room_id, point.direction, point.x, point.y]),
                [[
                    5,
                    propertyValue('return-point-position-'+mapName),
                    propertyValue('return-point-x-'+mapName) * mapJson.tilewidth + mapJson.tilewidth / 2,
                    propertyValue('return-point-y-'+mapName) * mapJson.tileheight + mapJson.tileheight
                ]]
            );
        });
    }

    async testTheMapChangePointPropertiesCreateTheChangePoints()
    {
        await this.test('the map change point properties create one change point per property to the found room', async () => {
            let mapName = 'reldens-new-age-town-house-01';
            let {mapJson, properties} = this.loadMap(mapName);
            let changePointsProperties = properties.filter(property => 0 === property.name.indexOf('change-point-for-'));
            this.assert.ok(0 < changePointsProperties.length, 'The house map holds change point properties');
            let nextRoomName = changePointsProperties[0].name.replace('change-point-for-', '');
            let recorded = {returnPoints: [], changePoints: []};
            let creator = this.createCreator(mapName, mapJson, recorded, {[nextRoomName]: {id: 9, name: nextRoomName}});
            this.assert.strictEqual(await creator.createRoomsChangePoints(mapName, {id: 5, name: mapName}), true);
            this.assert.deepStrictEqual(
                recorded.changePoints,
                changePointsProperties.map(property => ({room_id: 5, tile_index: property.value, next_room_id: 9}))
            );
        });
    }

}

module.exports.TestRoomsAssociationsCreator = TestRoomsAssociationsCreator;
