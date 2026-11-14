/**
 *
 * Reldens - Test Random Player State
 *
 * Tests the random join place of a room: every place it can pick (Math.random forced on each walkable node index) is
 * the center of a walkable tile of the room grid, the blocked tiles are never picked (the grid extra column and row
 * outside the map are still picked, see ISSUE #343), the room without walkable tiles
 * keeps the stored place, and the stored place on the room starting point is kept unless the always random options
 * apply to the player or the guest.
 *
 */

const { BaseTest } = require('./base-test');
const { RandomPlayerState } = require('../lib/rooms/server/random-player-state');
const { PathFinder } = require('../lib/world/server/path-finder');

class TestRandomPlayerState extends BaseTest
{

    static TILE_SIZE = 32;
    static MAP_SIZE = 4;
    static BLOCKED_TILES = [[0, 0], [1, 2], [3, 3]];

    buildRandomState(roomOptions, blockAll)
    {
        let mapJson = {
            tilewidth: TestRandomPlayerState.TILE_SIZE,
            tileheight: TestRandomPlayerState.TILE_SIZE,
            width: TestRandomPlayerState.MAP_SIZE,
            height: TestRandomPlayerState.MAP_SIZE
        };
        let pathFinder = Object.assign(new PathFinder(), {world: {mapJson}});
        pathFinder.createGridFromMap();
        for(let node of pathFinder.grid.nodes.flat()){
            if(blockAll || TestRandomPlayerState.BLOCKED_TILES.some(tile => tile[0] === node.x && tile[1] === node.y)){
                pathFinder.grid.setWalkableAt(node.x, node.y, false);
            }
        }
        return new RandomPlayerState(Object.assign({
            roomWorld: {mapJson, pathFinder},
            joinInRandomPlaceAlways: false,
            joinInRandomPlaceGuestAlways: false,
            roomData: {returnPointDefault: {x: 16, y: 16}}
        }, roomOptions));
    }

    pickPlace(randomState, randomValue, startPosition, isGuest)
    {
        let player = {state: {x: startPosition.x, y: startPosition.y}};
        let originalRandom = Math.random;
        Math.random = () => randomValue;
        try {
            return [randomState.randomizeLocation(player, isGuest), player.state.x, player.state.y];
        } finally {
            Math.random = originalRandom;
        }
    }

    async testEveryRandomPlaceIsOnAWalkableTile()
    {
        await this.test('every random join place is the center of a walkable tile, never a blocked one', async () => {
            let randomState = this.buildRandomState({}, false);
            let tileSize = TestRandomPlayerState.TILE_SIZE;
            let pickedTiles = [];
            let nodesCount = randomState.walkableNodes.length;
            for(let nodeIndex = 0; nodeIndex < nodesCount; nodeIndex++){
                let [, x, y] = this.pickPlace(randomState, (nodeIndex + 0.5) / nodesCount, {x: 500, y: 500}, false);
                pickedTiles.push([(x - tileSize / 2) / tileSize, (y - tileSize / 2) / tileSize]);
            }
            this.assert.strictEqual(pickedTiles.length, randomState.grid.nodes.flat().length - 3);
            this.assert.deepStrictEqual(
                pickedTiles.filter(tile => !randomState.grid.isWalkableAt(tile[0], tile[1])),
                []
            );
            this.assert.deepStrictEqual(
                pickedTiles.filter(tile => TestRandomPlayerState.BLOCKED_TILES.some(
                    blocked => blocked[0] === tile[0] && blocked[1] === tile[1]
                )),
                []
            );
        });
    }

    async testTheRoomWithoutWalkableTilesKeepsTheStoredPlace()
    {
        await this.test('a room without walkable tiles keeps the stored place', async () => {
            this.assert.deepStrictEqual(
                this.pickPlace(this.buildRandomState({joinInRandomPlaceAlways: true}, true), 0.5, {x: 80, y: 80}, false),
                [false, 80, 80]
            );
        });
    }

    async testTheStartingPointIsKeptUnlessAlwaysRandomApplies()
    {
        await this.test('the stored place on the starting point is kept unless the always random option applies', async () => {
            let movedPlace = [undefined, 48, 16];
            let placeCases = [
                [{}, false, [false, 16, 16]],
                [{}, true, [false, 16, 16]],
                [{joinInRandomPlaceAlways: true}, false, movedPlace],
                [{joinInRandomPlaceAlways: true}, true, [false, 16, 16]],
                [{joinInRandomPlaceGuestAlways: true}, true, movedPlace],
                [{joinInRandomPlaceGuestAlways: true}, false, [false, 16, 16]]
            ];
            for(let [roomOptions, isGuest, expectedPlace] of placeCases){
                this.assert.deepStrictEqual(
                    this.pickPlace(this.buildRandomState(roomOptions, false), 0, {x: 16, y: 16}, isGuest),
                    expectedPlace
                );
            }
        });
    }

    async testAStoredPlaceAwayFromTheStartingPointIsRandomized()
    {
        await this.test('a stored place away from the starting point gets a random place', async () => {
            this.assert.deepStrictEqual(
                this.pickPlace(this.buildRandomState({}, false), 0, {x: 80, y: 80}, false),
                [undefined, 48, 16]
            );
        });
    }

}

module.exports.TestRandomPlayerState = TestRandomPlayerState;
