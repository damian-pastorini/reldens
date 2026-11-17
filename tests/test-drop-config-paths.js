/**
 *
 * Reldens - Test Drop Config Paths
 *
 */

const { BaseTest } = require('./base-test');
const { DropObject } = require('../lib/objects/server/object/type/drop-object');
const { RoomScene } = require('../lib/rooms/server/scene');

class TestDropConfigPaths extends BaseTest
{

    createConfig(configValues, requestedPaths)
    {
        return {
            get: () => 32,
            getWithoutLogs: (path, defaultValue) => {
                requestedPaths.push(path);
                return Object.keys(configValues).includes(path) ? configValues[path] : defaultValue;
            }
        };
    }

    createDropObject(configValues, requestedPaths)
    {
        return new DropObject({
            events: {},
            config: this.createConfig(configValues, requestedPaths),
            dataServer: {},
            client_key: 'coins',
            id: 1
        });
    }

    async testTheDropInteractionDistanceIsReadFromTheDropsConfig()
    {
        await this.test('the drop interaction distance is read from the objects drops config', async () => {
            let requestedPaths = [];
            let dropObject = this.createDropObject({'server/objects/drops/interactionsDistance': 64}, requestedPaths);
            this.assert.strictEqual(dropObject.interactionArea, 64);
            this.assert.strictEqual(requestedPaths.filter((path) => path.startsWith('server/rewards/')).length, 0);
        });
    }

    async testTheDropInteractionDistanceFallsBackToTheObjectsActions()
    {
        await this.test('without the drops value the drop uses the objects actions interaction distance', async () => {
            let dropObject = this.createDropObject({'server/objects/actions/interactionsDistance': 140}, []);
            this.assert.strictEqual(dropObject.interactionArea, 140);
        });
    }

    async testTheDropDisappearTimeIsReadFromTheDropsConfig()
    {
        await this.test('the drop disappear time is read from the objects drops config', async () => {
            let requestedPaths = [];
            let roomScene = Object.create(RoomScene.prototype, {
                config: {value: this.createConfig({'server/objects/drops/disappearTime': 1800000}, requestedPaths)}
            });
            let destroyTimer = roomScene.setObjectAutoDestroyTime({objectIndex: 'drop-1'});
            clearTimeout(destroyTimer);
            this.assert.notStrictEqual(destroyTimer, false);
            this.assert.deepStrictEqual(requestedPaths, ['server/objects/drops/disappearTime']);
        });
    }

}

module.exports.TestDropConfigPaths = TestDropConfigPaths;
