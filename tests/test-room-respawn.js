/**
 *
 * Reldens - Test Room Respawn
 *
 */

const { BaseTest } = require('./base-test');
const { RoomRespawn } = require('../lib/respawn/server/room-respawn');

class TestRoomRespawn extends BaseTest
{

    createRespawnRepository(respawnDefinitions, loadedFilters)
    {
        return {
            load: async (filters) => {
                loadedFilters.push(filters);
                return respawnDefinitions;
            }
        };
    }

    createRoomRespawn(layerObjects, respawnDefinitions, loadedFilters, createdInstances)
    {
        let respawnRepository = this.createRespawnRepository(respawnDefinitions, loadedFilters);
        let roomRespawn = new RoomRespawn({
            events: {on: () => true, emit: async () => true},
            config: {getWithoutLogs: (path, defaultValue) => defaultValue},
            dataServer: {getEntity: () => respawnRepository},
            layer: {name: 'respawn-area-e2e'},
            world: {
                pathFinder: false,
                mapJson: {tilewidth: 32, tileheight: 32},
                objectsManager: {roomObjectsByLayer: {'respawn-area-e2e': layerObjects}}
            }
        });
        roomRespawn.parseMapForRespawnTiles = () => true;
        roomRespawn.createNewObjectInstance = async (respawnArea, multipleObj, objClass, tilewidth, tileheight, qty) => {
            createdInstances.push([respawnArea.object_id, qty, objClass, tilewidth, tileheight]);
        };
        return roomRespawn;
    }

    async testDisabledRespawnObjectCreatesNoInstances()
    {
        await this.test('a disabled respawn object creates no instances and an enabled one creates its instances limit', async () => {
            let EnabledClass = class {};
            let DisabledClass = class {};
            let loadedFilters = [];
            let createdInstances = [];
            let roomRespawn = this.createRoomRespawn(
                {
                    10: {shouldRespawn: true, objProps: {enabled: 0}, classInstance: DisabledClass},
                    20: {shouldRespawn: true, objProps: {enabled: 1}, classInstance: EnabledClass}
                },
                [{object_id: 10, instances_limit: 3}, {object_id: 20, instances_limit: 2}],
                loadedFilters,
                createdInstances
            );
            await roomRespawn.activateObjectsRespawn();
            this.assert.deepStrictEqual(loadedFilters, [{
                layer: 'respawn-area-e2e',
                object_id: {operator: 'IN', value: ['10', '20']}
            }]);
            this.assert.deepStrictEqual(createdInstances, [[20, 0, EnabledClass, 32, 32], [20, 1, EnabledClass, 32, 32]]);
        });
    }

    async testInvalidRespawnDefinitionsAreSkipped()
    {
        await this.test('a definition of an object not in the layer, without shouldRespawn or without a class creates nothing', async () => {
            let createdInstances = [];
            let roomRespawn = this.createRoomRespawn(
                {
                    30: {objProps: {enabled: 1}, classInstance: class {}},
                    40: {shouldRespawn: true, objProps: {enabled: 1}, classInstance: false}
                },
                [
                    {object_id: 99, instances_limit: 1},
                    {object_id: 30, instances_limit: 1},
                    {object_id: 40, instances_limit: 1}
                ],
                [],
                createdInstances
            );
            await roomRespawn.activateObjectsRespawn();
            this.assert.deepStrictEqual(createdInstances, []);
        });
    }

    async testLayerWithoutObjectsLoadsNothing()
    {
        await this.test('a respawn layer without room objects loads no definitions', async () => {
            let loadedFilters = [];
            let roomRespawn = this.createRoomRespawn(null, [], loadedFilters, []);
            this.assert.deepStrictEqual([await roomRespawn.activateObjectsRespawn(), loadedFilters], [false, []]);
        });
    }

}

module.exports.TestRoomRespawn = TestRoomRespawn;
