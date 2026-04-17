/**
 *
 * Reldens - MapsWizardRunner
 *
 */

let {
    RandomMapGenerator,
    LayerElementsObjectLoader,
    LayerElementsCompositeLoader,
    MultipleByLoaderGenerator,
    MultipleWithAssociationsByLoaderGenerator
} = require('@reldens/tile-map-generator');
let { Logger } = require('@reldens/utils');

class MapsWizardRunner
{
    constructor(rootFolder, rootPath)
    {
        this.rootFolder = rootFolder;
        this.rootPath = rootPath;
        this.mainGenerator = false;
        this.generatorWithData = false;
        this.generatedMap = false;
    }

    async run(selectedHandler, handlerParams)
    {
        try {
            if('elements-object-loader' === selectedHandler){
                this.mainGenerator = new LayerElementsObjectLoader(handlerParams);
                if(false === await this.mainGenerator.load()){
                    Logger.error('MapsWizardRunner - elements-object-loader load failed.', selectedHandler);
                    return false;
                }
                let generator = new RandomMapGenerator(this.mainGenerator.mapData);
                this.generatedMap = await generator.generate();
                this.generatorWithData = generator;
            }
            if('elements-composite-loader' === selectedHandler){
                this.mainGenerator = new LayerElementsCompositeLoader(handlerParams);
                if(false === await this.mainGenerator.load()){
                    Logger.error('MapsWizardRunner - elements-composite-loader load failed.', selectedHandler);
                    return false;
                }
                let generator = new RandomMapGenerator();
                await generator.fromElementsProvider(this.mainGenerator.mapData);
                this.generatedMap = await generator.generate();
                this.generatorWithData = generator;
            }
            if('multiple-by-loader' === selectedHandler){
                this.mainGenerator = new MultipleByLoaderGenerator({loaderData: handlerParams});
                await this.mainGenerator.generate();
                this.generatorWithData = this.mainGenerator;
            }
            if('multiple-with-association-by-loader' === selectedHandler){
                this.mainGenerator = new MultipleWithAssociationsByLoaderGenerator({loaderData: handlerParams});
                await this.mainGenerator.generate();
                this.generatorWithData = this.mainGenerator;
            }
        } catch(error) {
            Logger.error('Maps generator error.', selectedHandler, error);
            return false;
        }
        return true;
    }

    mapSubMapsData(generatedSubMaps, generators, tileWidth, tileHeight)
    {
        if(!generatedSubMaps){
            return [];
        }
        let subMapsData = [];
        for(let i of Object.keys(generatedSubMaps)){
            let subMapData = generatedSubMaps[i];
            let generator = generators[i];
            let mapFileName = generator.mapFileName;
            if(-1 === mapFileName.indexOf('json')){
                mapFileName = mapFileName+'.json';
            }
            subMapsData.push({
                key: generator.mapName,
                mapWidth: subMapData.width * tileWidth,
                mapHeight: subMapData.height * tileHeight,
                tileWidth,
                tileHeight,
                mapImage: this.rootPath+'/generated/'+generator.tileSheetName,
                mapJson: this.rootPath+'/generated/'+mapFileName
            });
        }
        return subMapsData;
    }
}

module.exports.MapsWizardRunner = MapsWizardRunner;
