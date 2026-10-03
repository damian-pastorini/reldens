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
const { Logger } = require('@reldens/utils');

class MapsWizardRunner
{
    constructor(rootFolder, rootPath, generatedBasePath)
    {
        this.rootFolder = rootFolder;
        this.rootPath = rootPath;
        this.generatedBasePath = generatedBasePath || (rootPath+'/generated/');
        this.mainGenerator = false;
        this.generatorWithData = false;
        this.generatedMap = false;
        this.selectedHandler = '';
    }

    async run(selectedHandler, handlerParams)
    {
        this.selectedHandler = selectedHandler;
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
                if(false === this.generatedMap){
                    Logger.error('MapsWizardRunner - elements-object-loader generation failed.', selectedHandler);
                    return false;
                }
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
                if(false === this.generatedMap){
                    Logger.error('MapsWizardRunner - elements-composite-loader generation failed.', selectedHandler);
                    return false;
                }
            }
            if('multiple-by-loader' === selectedHandler){
                this.mainGenerator = new MultipleByLoaderGenerator({loaderData: handlerParams});
                let generatedMultipleMaps = await this.mainGenerator.generate();
                this.generatorWithData = this.mainGenerator;
                if(false === generatedMultipleMaps){
                    Logger.error('MapsWizardRunner - multiple-by-loader generation failed.', selectedHandler);
                    return false;
                }
            }
            if('multiple-with-association-by-loader' === selectedHandler){
                this.mainGenerator = new MultipleWithAssociationsByLoaderGenerator({loaderData: handlerParams});
                let generatedAssociatedMaps = await this.mainGenerator.generate();
                this.generatorWithData = this.mainGenerator;
                if(false === generatedAssociatedMaps){
                    Logger.error('MapsWizardRunner - associations generation failed.', selectedHandler);
                    return false;
                }
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
            if(!subMapData){
                Logger.warning('Sub map was not generated, it will not be offered for import.', i);
                continue;
            }
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
                mapImage: this.generatedBasePath+generator.tileSheetName,
                mapJson: this.generatedBasePath+mapFileName
            });
        }
        return subMapsData;
    }
}

module.exports.MapsWizardRunner = MapsWizardRunner;
