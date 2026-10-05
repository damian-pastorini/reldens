/**
 *
 * Reldens - Test Room Map Change Points Layer Writer
 *
 */

const { BaseTest } = require('./base-test');
const { RoomMapChangePointsLayerWriter } = require('../lib/admin/server/room-map-change-points-layer-writer');

class TestRoomMapChangePointsLayerWriter extends BaseTest
{

    createLayer(name, tiles)
    {
        let layerData = [];
        for(let i = 0; i < 9; i++){
            let tileGid = tiles[i];
            layerData.push(tileGid ? tileGid : 0);
        }
        return {data: layerData, height: 3, name, opacity: 1, type: 'tilelayer', visible: true, width: 3, x: 0, y: 0};
    }

    createSetup(layers)
    {
        let setup = {writer: new RoomMapChangePointsLayerWriter(false, false)};
        setup.mapJson = {width: 3, height: 3, tilewidth: 32, tileheight: 32, nextlayerid: 5, layers};
        return setup;
    }

    async testTheChangePointsLayerIsCreatedWithTheVisibleTile()
    {
        await this.test('the change points layer is created marking the tile visible in that position', async () => {
            let setup = this.createSetup([
                this.createLayer('ground', {4: 7}),
                this.createLayer('path', {4: 12})
            ]);
            this.assert.strictEqual(setup.writer.applyChangePoint(setup.mapJson, 4, 'reldens-house-1'), true);
            this.assert.strictEqual(setup.mapJson.layers.length, 3);
            let createdLayer = setup.mapJson.layers[2];
            this.assert.strictEqual(createdLayer.name, 'change-points');
            this.assert.strictEqual(createdLayer.type, 'tilelayer');
            this.assert.strictEqual(createdLayer.data.length, 9);
            this.assert.strictEqual(createdLayer.data[4], 12);
            this.assert.strictEqual(createdLayer.id, 5);
            this.assert.strictEqual(setup.mapJson.nextlayerid, 6);
        });
    }

    async testTheChangePointIsSavedAsLayerProperty()
    {
        await this.test('the change point is saved as a layer property for the next room', async () => {
            let setup = this.createSetup([this.createLayer('ground', {4: 7})]);
            setup.writer.applyChangePoint(setup.mapJson, 4, 'reldens-house-1');
            this.assert.deepStrictEqual(setup.mapJson.layers[1].properties, [
                {name: 'change-point-for-reldens-house-1', type: 'int', value: 4}
            ]);
        });
    }

    async testTheExistingChangePointsLayerIsReused()
    {
        await this.test('an existing change points layer is reused instead of creating another one', async () => {
            let setup = this.createSetup([
                this.createLayer('ground', {4: 7, 5: 8}),
                this.createLayer('return-to-main-map-change-points', {5: 8})
            ]);
            this.assert.strictEqual(setup.writer.applyChangePoint(setup.mapJson, 4, 'reldens-town'), true);
            this.assert.strictEqual(setup.mapJson.layers.length, 2);
            this.assert.strictEqual(setup.mapJson.layers[1].data[4], 7);
            this.assert.strictEqual(setup.mapJson.layers[1].data[5], 8);
        });
    }

    async testTheSamePropertyIsNotDuplicated()
    {
        await this.test('the same change point property is not saved twice', async () => {
            let setup = this.createSetup([this.createLayer('ground', {4: 7})]);
            setup.writer.applyChangePoint(setup.mapJson, 4, 'reldens-house-1');
            setup.writer.applyChangePoint(setup.mapJson, 4, 'reldens-house-1');
            this.assert.strictEqual(setup.mapJson.layers[1].properties.length, 1);
        });
    }

    async testTheChangePointsLayerTilesAreNotUsedAsVisibleTile()
    {
        await this.test('the tiles already in a change points layer are not used as the visible tile', async () => {
            let setup = this.createSetup([
                this.createLayer('ground', {4: 7}),
                this.createLayer('change-points', {4: 99})
            ]);
            setup.writer.applyChangePoint(setup.mapJson, 4, 'reldens-town');
            this.assert.strictEqual(setup.mapJson.layers[1].data[4], 7);
        });
    }

    async testEmptyTilePositionsAreRejected()
    {
        await this.test('a tile position without any tile in the map is rejected', async () => {
            let setup = this.createSetup([this.createLayer('ground', {4: 7})]);
            this.assert.strictEqual(setup.writer.applyChangePoint(setup.mapJson, 8, 'reldens-town'), false);
            this.assert.strictEqual(setup.mapJson.layers.length, 1);
        });
    }

    async testTileIndexesOutOfTheMapAreRejected()
    {
        await this.test('a tile index out of the map is rejected', async () => {
            let setup = this.createSetup([this.createLayer('ground', {4: 7})]);
            this.assert.strictEqual(setup.writer.applyChangePoint(setup.mapJson, 9, 'reldens-town'), false);
            this.assert.strictEqual(setup.writer.applyChangePoint(setup.mapJson, -1, 'reldens-town'), false);
            this.assert.strictEqual(setup.writer.applyChangePoint(setup.mapJson, 'x', 'reldens-town'), false);
            this.assert.strictEqual(setup.mapJson.layers.length, 1);
        });
    }

    async testWriteRequiresTheMapFileName()
    {
        await this.test('the write is rejected without a map file name', async () => {
            let setup = this.createSetup([this.createLayer('ground', {4: 7})]);
            this.assert.strictEqual(setup.writer.write('', 4, 'reldens-town'), false);
        });
    }

}

module.exports.TestRoomMapChangePointsLayerWriter = TestRoomMapChangePointsLayerWriter;
