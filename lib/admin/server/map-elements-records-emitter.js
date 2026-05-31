/**
 *
 * Reldens - MapElementsRecordsEmitter
 *
 * Walks the in-memory output of a MapsWizardRunner after generation completes and writes
 * the {mapName}-room-map-elements.json record for every produced map (the main map, any
 * multi-map siblings, and any associated sub-maps).
 *
 */

const { RoomMapElementsBuilder } = require('./room-map-elements-builder');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/server/theme-manager').ThemeManager} ThemeManager
 * @typedef {import('./subscribers/maps-wizard-runner').MapsWizardRunner} MapsWizardRunner
 */
class MapElementsRecordsEmitter
{

    /**
     * @param {ThemeManager} themeManager
     */
    constructor(themeManager)
    {
        /** @type {ThemeManager} */
        this.themeManager = themeManager;
        /** @type {RoomMapElementsBuilder} */
        this.elementsBuilder = new RoomMapElementsBuilder();
    }

    /**
     * @param {MapsWizardRunner} runner
     * @param {string} tilesetSessionId
     */
    emitForRunner(runner, tilesetSessionId)
    {
        let context = {
            generatedFolder: this.themeManager.projectGeneratedDataPath,
            generatedAt: sc.getCurrentDate(),
            generatedBy: sc.get(runner, 'selectedHandler', ''),
            tilesetSessionId: tilesetSessionId
        };
        this.emitMain(runner, context);
        this.emitMultiMaps(runner, context);
        this.emitSubMaps(runner, context);
    }

    /**
     * @param {MapsWizardRunner} runner
     * @param {Object} context
     */
    emitMain(runner, context)
    {
        if(!runner.generatedMap){
            return;
        }
        if(!runner.generatorWithData){
            return;
        }
        this.writeRecord(
            runner.generatorWithData.mapName,
            this.ensureJsonExt(runner.generatorWithData.mapFileName),
            runner.generatedMap,
            context
        );
    }

    /**
     * @param {MapsWizardRunner} runner
     * @param {Object} context
     */
    emitMultiMaps(runner, context)
    {
        if(!runner.generatorWithData){
            return;
        }
        if(!runner.generatorWithData.generators){
            return;
        }
        if(!runner.generatorWithData.generatedMaps){
            return;
        }
        for(let i of Object.keys(runner.generatorWithData.generators)){
            let generator = runner.generatorWithData.generators[i];
            this.writeRecord(
                generator.mapName,
                this.ensureJsonExt(generator.mapFileName),
                runner.generatorWithData.generatedMaps[generator.mapName],
                context
            );
        }
    }

    /**
     * @param {MapsWizardRunner} runner
     * @param {Object} context
     */
    emitSubMaps(runner, context)
    {
        if(!runner.mainGenerator){
            return;
        }
        if(!runner.mainGenerator.associatedMaps){
            return;
        }
        for(let i of Object.keys(runner.mainGenerator.associatedMaps)){
            this.emitSubMapsForAssoc(runner.mainGenerator.associatedMaps[i], context);
        }
    }

    /**
     * @param {Object} associatedMap
     * @param {Object} context
     */
    emitSubMapsForAssoc(associatedMap, context)
    {
        if(!associatedMap){
            return;
        }
        if(!associatedMap.generatedSubMaps){
            return;
        }
        if(!associatedMap.generators){
            return;
        }
        for(let i of Object.keys(associatedMap.generatedSubMaps)){
            let subGen = associatedMap.generators[i];
            if(!subGen){
                continue;
            }
            this.writeRecord(
                subGen.mapName,
                this.ensureJsonExt(subGen.mapFileName),
                associatedMap.generatedSubMaps[i],
                context
            );
        }
    }

    /**
     * @param {string} mapName
     * @param {string} mapFileName
     * @param {Object} mapJson
     * @param {Object} context
     */
    writeRecord(mapName, mapFileName, mapJson, context)
    {
        if(!mapName){
            return;
        }
        if(!mapJson){
            return;
        }
        let record = this.elementsBuilder.build({
            mapJson,
            mapName,
            mapFileName,
            tilesetSessionId: context.tilesetSessionId,
            generatedBy: context.generatedBy,
            generatedAt: context.generatedAt
        });
        if(!record){
            return;
        }
        let path = FileHandler.joinPaths(context.generatedFolder, this.elementsBuilder.elementsFileName(mapName));
        if(!FileHandler.writeFile(path, sc.toJsonString(record))){
            Logger.error('Could not write elements record.', path);
        }
    }

    /**
     * @param {string} fileName
     * @returns {string}
     */
    ensureJsonExt(fileName)
    {
        if(!fileName){
            return fileName;
        }
        if(sc.contains(fileName, '.json')){
            return fileName;
        }
        return fileName+'.json';
    }
}

module.exports.MapElementsRecordsEmitter = MapElementsRecordsEmitter;
