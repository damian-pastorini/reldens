/**
 *
 * Reldens - Test Maps Wizard Generate
 *
 * Tests the maps wizard generate action with the "multiple by loader" strategy and the tile-map-generator sample data
 * with names (map-composite-data-with-names.json, three map names on the sample town composite) in a root folder in
 * test-results: the sample composite and its tilesets images are provided in the root folder, every named map is
 * generated with its JSON and its image in the generated folder, and the maps selection page gets one preview per map
 * with the size of its generated JSON and the generated paths of its image and JSON, without any error redirect.
 *
 */

const { MapsWizardBaseTest } = require('./fixtures/maps-wizard-base-test');
const { FileHandler } = require('@reldens/server-utils');

class TestMapsWizardGenerate extends MapsWizardBaseTest
{

    constructor(config)
    {
        super(config, 'maps-wizard-generate');
    }

    expectedMapPreview(mapName, generatedMap)
    {
        return {
            key: mapName,
            mapWidth: generatedMap.width * generatedMap.tilewidth,
            mapHeight: generatedMap.height * generatedMap.tileheight,
            tileWidth: generatedMap.tilewidth,
            tileHeight: generatedMap.tileheight,
            mapImage: '/generated/'+mapName+'.png',
            mapJson: '/generated/'+mapName+'.json',
            hasSubMaps: false,
            subMaps: []
        };
    }

    async testTheSampleMapsAreGeneratedAndPreviewed()
    {
        await this.test('the multiple by loader strategy generates every sample map and previews it for the import', async () => {
            let sampleData = FileHandler.fetchFileJson(
                FileHandler.joinPaths(this.compositeExamplesPath, 'map-composite-data-with-names.json')
            );
            let generation = await this.generateSampleMaps('multiple-by-loader', 'map-composite-data-with-names.json');
            let generatedFiles = FileHandler.readFolder(this.themeManager.projectGeneratedDataPath);
            this.assert.deepStrictEqual([generation.redirects, generation.sent], [[], 1]);
            this.assert.strictEqual(
                FileHandler.exists(FileHandler.joinPaths(this.rootFolder, sampleData.compositeElementsFile)),
                true
            );
            for(let mapName of sampleData.mapNames){
                this.assert.ok(-1 !== generatedFiles.indexOf(mapName+'.json'), 'Generated JSON of '+mapName);
                this.assert.ok(-1 !== generatedFiles.indexOf(mapName+'.png'), 'Generated image of '+mapName);
            }
            this.assert.deepStrictEqual(
                generation.rendered[0].maps,
                sampleData.mapNames.map(mapName => this.expectedMapPreview(mapName, FileHandler.fetchFileJson(
                    FileHandler.joinPaths(this.themeManager.projectGeneratedDataPath, mapName+'.json')
                )))
            );
            FileHandler.remove(this.testFolder);
        });
    }

}

module.exports.TestMapsWizardGenerate = TestMapsWizardGenerate;
