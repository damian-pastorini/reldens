/**
 *
 * Reldens - Test Animations Defaults Merger
 *
 */

const { BaseTest } = require('./base-test');
const { SceneDataFilter } = require('../lib/rooms/server/scene-data-filter');
const { AnimationsDefaultsMerger } = require('../lib/game/client/animations-defaults-merger');
const { sc } = require('@reldens/utils');

class TestAnimationsDefaultsMerger extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.sceneDataFilter = new SceneDataFilter({config: {getWithoutLogs: (path, defaultValue) => defaultValue}});
    }

    filterAndMergeRoomData(roomData)
    {
        let result = {filteredData: this.sceneDataFilter.filterRoomData(roomData)};
        result.mergedData = AnimationsDefaultsMerger.mergeDefaults(sc.deepJsonClone(result.filteredData));
        return result;
    }

    createEnemiesRoomData()
    {
        return {
            preloadAssets: {
                enemyTreeAsset: {
                    asset_type: 'spritesheet',
                    asset_key: 'enemy_forest_1',
                    asset_file: 'monster-treant.png',
                    extra_params: '{"frameWidth":47,"frameHeight":50}'
                },
                enemyGolemAsset: {
                    asset_type: 'spritesheet',
                    asset_key: 'enemy_forest_2',
                    asset_file: 'monster-golem2.png',
                    extra_params: '{"frameWidth":47,"frameHeight":50}'
                }
            },
            objectsAnimationsData: {
                enemyTreeFirst: {key: 'enemy_tree_first', asset_key: 'enemy_forest_1', x: 10, y: 20, enabled: true},
                enemyTreeSecond: {key: 'enemy_tree_second', asset_key: 'enemy_forest_1', x: 30, y: 40, enabled: true}
            }
        };
    }

    async testTheSharedSpritesheetParamsAreRestoredOnTheClient()
    {
        await this.test('the spritesheet params shared by every room asset are restored on the client', async () => {
            let roomData = this.createEnemiesRoomData();
            let result = this.filterAndMergeRoomData(roomData);
            this.assert.strictEqual(sc.hasOwn(result.filteredData.preloadAssets.enemyTreeAsset, 'extra_params'), false);
            this.assert.deepStrictEqual(result.mergedData.preloadAssets, roomData.preloadAssets);
            this.assert.strictEqual(sc.hasOwn(result.mergedData, 'preloadAssetsDefaults'), false);
        });
    }

    async testTheSharedAnimationPropertiesAreRestoredOnTheClient()
    {
        await this.test('the animation properties shared by same asset objects are restored on the client', async () => {
            let roomData = this.createEnemiesRoomData();
            let result = this.filterAndMergeRoomData(roomData);
            this.assert.deepStrictEqual(result.mergedData.objectsAnimationsData, roomData.objectsAnimationsData);
            this.assert.strictEqual(sc.hasOwn(result.mergedData, 'animationsDefaults'), false);
        });
    }

    async testTheUniqueSpritesheetParamsAreKept()
    {
        await this.test('the spritesheet params that differ between room assets are kept on each asset', async () => {
            let roomData = this.createEnemiesRoomData();
            roomData.preloadAssets.enemyGolemAsset.extra_params = '{"frameWidth":64,"frameHeight":64}';
            let result = this.filterAndMergeRoomData(roomData);
            this.assert.strictEqual(sc.hasOwn(result.filteredData.preloadAssets.enemyTreeAsset, 'extra_params'), true);
            this.assert.deepStrictEqual(result.mergedData.preloadAssets, roomData.preloadAssets);
        });
    }

}

module.exports.TestAnimationsDefaultsMerger = TestAnimationsDefaultsMerger;
