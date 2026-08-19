/**
 *
 * Reldens - Test Storage Change Points Creator
 *
 */

const { BaseTest } = require('./base-test');
const { StorageChangePointsCreator } = require('../lib/world/server/storage-change-points-creator');
const { sc } = require('@reldens/utils');

class TestStorageChangePointsCreator extends BaseTest
{

    createPathFinder(isWalkable, markedPositions)
    {
        return {
            grid: {
                isWalkableAt: () => isWalkable,
                setWalkableAt: (col, row, walkable) => {
                    markedPositions.push({col, row, walkable});
                }
            }
        };
    }

    createChangePointBody(changePoints, tileIndex, options)
    {
        if(false === options.bodyCreated){
            return false;
        }
        return {changeScenePoint: changePoints[tileIndex]};
    }

    createWorld(changePoints, options = {})
    {
        let createdBodies = [];
        let markedPositions = [];
        let usePathFinder = true === options.usePathFinder;
        return {
            world: {
                changePoints,
                createdChangePoints: options.createdChangePoints ? options.createdChangePoints : {},
                usePathFinder,
                pathFinder: usePathFinder
                    ? this.createPathFinder(false !== options.isWalkable, markedPositions)
                    : false,
                mapJson: {width: 10, height: 10, tilewidth: 32, tileheight: 32},
                fetchPositionFromTileIndex: (tileIndex) => {
                    return {col: tileIndex % 10, row: Math.floor(tileIndex / 10)};
                },
                createChangePoint: (tileIndex, tileWidth, tileHeight, col, row) => {
                    createdBodies.push({tileIndex, tileWidth, tileHeight, col, row});
                    return this.createChangePointBody(changePoints, tileIndex, options);
                }
            },
            createdBodies,
            markedPositions
        };
    }

    async testChangePointsAreCreatedOnMapsWithoutChangePointsLayer()
    {
        await this.test('storage change points are created when the map has no change points layer', async () => {
            let creator = new StorageChangePointsCreator();
            let setup = this.createWorld({12: 'reldens-house-1'});
            let createdCount = creator.createMissingChangePoints(setup.world);
            this.assert.strictEqual(createdCount, 1);
            this.assert.strictEqual(setup.createdBodies.length, 1);
            this.assert.deepStrictEqual(
                [...setup.createdBodies].shift(),
                {tileIndex: '12', tileWidth: 32, tileHeight: 32, col: 2, row: 1}
            );
        });
    }

    async testCreatedChangePointsAreRegisteredInTheWorld()
    {
        await this.test('created change points are registered on the world created change points', async () => {
            let creator = new StorageChangePointsCreator();
            let setup = this.createWorld({12: 'reldens-house-1'});
            creator.createMissingChangePoints(setup.world);
            this.assert.deepStrictEqual(
                setup.world.createdChangePoints['12'],
                {changeScenePoint: 'reldens-house-1'}
            );
        });
    }

    async testChangePointsAlreadyCreatedFromTheMapAreSkipped()
    {
        await this.test('change points already created from the map layer are skipped', async () => {
            let creator = new StorageChangePointsCreator();
            let setup = this.createWorld(
                {12: 'reldens-house-1'},
                {createdChangePoints: {12: {changeScenePoint: 'reldens-house-1'}}}
            );
            let createdCount = creator.createMissingChangePoints(setup.world);
            this.assert.strictEqual(createdCount, 0);
            this.assert.strictEqual(setup.createdBodies.length, 0);
        });
    }

    async testChangePointsOnNotWalkablePositionsAreSkipped()
    {
        await this.test('change points on not walkable positions are skipped', async () => {
            let creator = new StorageChangePointsCreator();
            let setup = this.createWorld({12: 'reldens-house-1'}, {usePathFinder: true, isWalkable: false});
            let createdCount = creator.createMissingChangePoints(setup.world);
            this.assert.strictEqual(createdCount, 0);
            this.assert.strictEqual(setup.createdBodies.length, 0);
        });
    }

    async testWalkablePositionsAreMarkedForThePathFinder()
    {
        await this.test('the created change point position is marked as not walkable', async () => {
            let creator = new StorageChangePointsCreator();
            let setup = this.createWorld({12: 'reldens-house-1'}, {usePathFinder: true});
            creator.createMissingChangePoints(setup.world);
            this.assert.strictEqual(setup.createdBodies.length, 1);
            this.assert.deepStrictEqual(
                [...setup.markedPositions].shift(),
                {col: 2, row: 1, walkable: false}
            );
        });
    }

    async testChangePointsAreCreatedWithThePathFinderDisabled()
    {
        await this.test('change points are created when the path finder is disabled', async () => {
            let creator = new StorageChangePointsCreator();
            let setup = this.createWorld({5: 'reldens-town'});
            let createdCount = creator.createMissingChangePoints(setup.world);
            this.assert.strictEqual(createdCount, 1);
            this.assert.strictEqual(setup.markedPositions.length, 0);
        });
    }

    async testFailedBodyCreationDoesNotBlockTheTile()
    {
        await this.test('a change point body that could not be created does not block the tile', async () => {
            let creator = new StorageChangePointsCreator();
            let setup = this.createWorld(
                {12: 'reldens-house-1'},
                {usePathFinder: true, bodyCreated: false}
            );
            let createdCount = creator.createMissingChangePoints(setup.world);
            this.assert.strictEqual(createdCount, 0);
            this.assert.strictEqual(setup.markedPositions.length, 0);
            this.assert.strictEqual(false, sc.hasOwn(setup.world.createdChangePoints, '12'));
        });
    }

    async testNoneChangePointsCreatesNothing()
    {
        await this.test('none stored change points creates nothing', async () => {
            let creator = new StorageChangePointsCreator();
            let setup = this.createWorld({});
            let createdCount = creator.createMissingChangePoints(setup.world);
            this.assert.strictEqual(createdCount, 0);
            this.assert.strictEqual(setup.createdBodies.length, 0);
        });
    }

}

module.exports.TestStorageChangePointsCreator = TestStorageChangePointsCreator;
