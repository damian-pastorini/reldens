/**
 *
 * Reldens - Test Maps Importer File Names
 *
 */

const { BaseTest } = require('./base-test');
const { MapsImporter } = require('../lib/import/server/maps-importer');
const { MapTilesetsImagesValidator } = require('../lib/import/server/map-tilesets-images-validator');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestMapsImporterFileNames extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.parentFolder = '..';
        this.testFolder = FileHandler.joinPaths(process.cwd(), 'test-results', 'maps-importer-file-names');
        this.generatedFolder = FileHandler.joinPaths(this.testFolder, 'generated');
        this.assetsFolder = FileHandler.joinPaths(this.testFolder, 'assets');
        this.distFolder = FileHandler.joinPaths(this.testFolder, 'dist');
    }

    resetTestFolders()
    {
        FileHandler.remove(this.testFolder);
        for(let folder of [this.generatedFolder, this.assetsFolder, this.distFolder]){
            FileHandler.createFolder(FileHandler.joinPaths(folder, 'maps'));
        }
    }

    writeMap(folder, mapName, images)
    {
        FileHandler.writeFile(
            FileHandler.joinPaths(folder, mapName+'.json'),
            sc.toJsonString({tilesets: images.map(image => ({image})), layers: []})
        );
        for(let image of images){
            FileHandler.writeFile(FileHandler.joinPaths(folder, image), 'image');
        }
    }

    createImporter(createdRooms)
    {
        let roomsRepository = {
            loadOneBy: async () => false,
            create: async (roomData) => createdRooms.push(roomData) && {id: createdRooms.length, ...roomData}
        };
        let importer = new MapsImporter({
            configManager: {getWithoutLogs: (path, defaultValue) => defaultValue},
            dataServer: {getEntity: () => roomsRepository},
            themeManager: {
                projectRoot: this.testFolder,
                projectGeneratedDataPath: this.generatedFolder,
                projectAssetsPath: this.assetsFolder,
                assetsDistPath: this.distFolder
            }
        });
        importer.verifyTilesetImage = true;
        return importer;
    }

    async testTilesetsImagesValidatorReturnsEveryImageOnce()
    {
        await this.test('the tilesets images validator returns every existent image file name once', async () => {
            this.resetTestFolders();
            this.writeMap(this.generatedFolder, 'town', ['town.png', 'doors.png']);
            let validator = new MapTilesetsImagesValidator();
            let mapJson = {tilesets: [{image: 'town.png'}, {image: 'doors.png'}, {image: 'town.png'}]};
            this.assert.deepStrictEqual(
                validator.fetchValidImages('town', mapJson, this.generatedFolder),
                ['town.png', 'doors.png']
            );
            this.assert.strictEqual(validator.errorCode, '');
        });
    }

    async testTilesetsImagesValidatorRejectsEveryInvalidTileset()
    {
        await this.test('the tilesets images validator rejects the missing, folder and not found images', async () => {
            this.resetTestFolders();
            FileHandler.writeFile(FileHandler.joinPaths(this.testFolder, 'outside.png'), 'image');
            let outsideImage = FileHandler.joinPaths(this.parentFolder, 'outside.png');
            let cases = [
                {mapJson: {}, errorCode: 'mapJsonMissingTileset'},
                {mapJson: {tilesets: []}, errorCode: 'mapJsonMissingTileset'},
                {mapJson: {tilesets: [{}]}, errorCode: 'mapJsonMissingTilesetImage'},
                {mapJson: {tilesets: [{image: outsideImage}]}, errorCode: 'mapTilesetImageInvalidFileName'},
                {mapJson: {tilesets: [{image: 'missing.png'}]}, errorCode: 'mapTilesetImageNotFound'}
            ];
            for(let invalidCase of cases){
                let validator = new MapTilesetsImagesValidator();
                this.assert.strictEqual(
                    validator.fetchValidImages('town', invalidCase.mapJson, this.generatedFolder),
                    false
                );
                this.assert.strictEqual(validator.errorCode, invalidCase.errorCode);
            }
        });
    }

    async testMapNameWithFoldersIsNeverLoaded()
    {
        await this.test('a map name with folders, selected or from a change point, is never loaded', async () => {
            this.resetTestFolders();
            this.writeMap(this.testFolder, 'outside', ['outside.png']);
            let outsideName = FileHandler.joinPaths(this.parentFolder, 'outside');
            let importer = this.createImporter([]);
            importer.maps = {'Outside': outsideName};
            this.assert.strictEqual(importer.loadMapByTitle('Outside'), false);
            this.assert.strictEqual(importer.errorCode, 'mapInvalidFileName');
            importer.errorCode = '';
            this.assert.strictEqual(importer.loadMapByTitle(outsideName, true), false);
            this.assert.strictEqual(importer.errorCode, 'mapInvalidFileName');
            this.assert.deepStrictEqual(importer.mapsJson, {});
            this.assert.deepStrictEqual(importer.mapsImages, {});
        });
    }

    async testTilesetImageWithFoldersIsNeverCopied()
    {
        await this.test('a map with a tileset image with folders is not loaded and never copied', async () => {
            this.resetTestFolders();
            FileHandler.writeFile(FileHandler.joinPaths(this.testFolder, 'outside.png'), 'image');
            FileHandler.writeFile(
                FileHandler.joinPaths(this.generatedFolder, 'crafted.json'),
                sc.toJsonString({tilesets: [{image: FileHandler.joinPaths(this.parentFolder, 'outside.png')}]})
            );
            let createdRooms = [];
            let importer = this.createImporter(createdRooms);
            let importData = {maps: {'Crafted': 'crafted'}, verifyTilesetImage: 1};
            this.assert.strictEqual(await importer.import(importData), false);
            this.assert.strictEqual(importer.errorCode, 'mapTilesetImageInvalidFileName');
            this.assert.deepStrictEqual(createdRooms, []);
            this.assert.deepStrictEqual(FileHandler.readFolder(FileHandler.joinPaths(this.assetsFolder, 'maps')), []);
            this.assert.deepStrictEqual(FileHandler.readFolder(FileHandler.joinPaths(this.distFolder, 'maps')), []);
        });
    }

    async testValidMapIsImported()
    {
        await this.test('a map and its tileset images with file names are copied and the room created', async () => {
            this.resetTestFolders();
            this.writeMap(this.generatedFolder, 'town', ['town.png']);
            let createdRooms = [];
            let importer = this.createImporter(createdRooms);
            this.assert.strictEqual(await importer.import({maps: {'Town': 'town'}, verifyTilesetImage: 1}), true);
            this.assert.deepStrictEqual(createdRooms.map(room => [room.name, room.map_filename, room.scene_images]), [
                ['town', 'town.json', 'town.png']
            ]);
            this.assert.deepStrictEqual(
                FileHandler.readFolder(FileHandler.joinPaths(this.assetsFolder, 'maps')).sort(),
                ['town.json', 'town.png']
            );
            FileHandler.remove(this.testFolder);
        });
    }

}

module.exports.TestMapsImporterFileNames = TestMapsImporterFileNames;
