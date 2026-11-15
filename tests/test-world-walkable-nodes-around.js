/**
 *
 * Reldens - Test World Walkable Nodes Around
 *
 * Tests the walkable nodes around a body (the death drops positions) on a real path finder grid: the tile comes from the
 * body position on the path finder world, so a dead player body already removed from the world and a body that walked
 * after its last automatic move get the nodes around the tile they stand on; the blocked tiles are skipped and a missing
 * body or path finder gives no nodes.
 *
 */

const { RandomMovementBaseTest } = require('./fixtures/random-movement-base-test');
const { WorldWalkableNodesAroundProvider } = require('../lib/world/server/world-walkable-nodes-around-provider');

class TestWorldWalkableNodesAround extends RandomMovementBaseTest
{

    tileCenter(tile)
    {
        return tile * this.tileSize + this.tileSize / 2;
    }

    nodesAround(column, row, blockedTiles)
    {
        let nodes = [{x: this.tileCenter(column), y: this.tileCenter(row)}];
        for(let i = -1; i <= 1; i++){
            for(let j = -1; j <= 1; j++){
                if(blockedTiles.some(tile => tile[0] === column + i && tile[1] === row + j)){
                    continue;
                }
                nodes.push({x: this.tileCenter(column + i), y: this.tileCenter(row + j)});
            }
        }
        return nodes;
    }

    async testRemovedBodyGetsTheNodesAroundItsTile()
    {
        await this.test('a body removed from the world gets the nodes around its tile on the given path finder', async () => {
            let body = this.bodyBuilder.build();
            let pathFinder = body.world.pathFinder;
            body.world = null;
            this.assert.deepStrictEqual(
                WorldWalkableNodesAroundProvider.generateWalkableNodesAround(body, pathFinder),
                this.nodesAround(this.originalTile, this.originalTile, [])
            );
        });
    }

    async testWalkedBodyGetsTheNodesAroundItsCurrentTile()
    {
        await this.test('a body that walked after its last automatic move gets the nodes around its current tile', async () => {
            let body = this.bodyBuilder.build();
            body.updateCurrentPoints();
            let walkedTile = this.originalTile + 4;
            body.position = [this.tileCenter(walkedTile), this.tileCenter(walkedTile)];
            this.assert.deepStrictEqual(
                WorldWalkableNodesAroundProvider.generateWalkableNodesAround(body, body.world.pathFinder),
                this.nodesAround(walkedTile, walkedTile, [])
            );
            this.assert.deepStrictEqual([body.currentCol, body.currentRow], [this.originalTile, this.originalTile]);
        });
    }

    async testBodyPathFinderSkipsTheBlockedTiles()
    {
        await this.test('a body with no given path finder uses its world path finder and skips the blocked tiles', async () => {
            let body = this.bodyBuilder.build();
            let blockedTile = [this.originalTile + 1, this.originalTile + 1];
            body.world.pathFinder.grid.setWalkableAt(blockedTile[0], blockedTile[1], false);
            this.assert.deepStrictEqual(
                WorldWalkableNodesAroundProvider.generateWalkableNodesAround(body),
                this.nodesAround(this.originalTile, this.originalTile, [blockedTile])
            );
        });
    }

    async testMissingBodyOrPathFinderGivesNoNodes()
    {
        await this.test('a missing body or a removed body with no path finder gives no nodes', async () => {
            let body = this.bodyBuilder.build();
            body.world = null;
            this.assert.deepStrictEqual(
                [
                    WorldWalkableNodesAroundProvider.generateWalkableNodesAround(false),
                    WorldWalkableNodesAroundProvider.generateWalkableNodesAround(body)
                ],
                [[], []]
            );
        });
    }

}

module.exports.TestWorldWalkableNodesAround = TestWorldWalkableNodesAround;
