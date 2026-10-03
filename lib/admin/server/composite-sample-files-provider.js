/**
 *
 * Reldens - CompositeSampleFilesProvider
 *
 * Resolves a composite elements file missing from the generation root folder by copying it, and the
 * tileset images it requires, from the tile-map-generator package examples, so it is reused later.
 *
 * The associated maps generation loads one composite per association, named by the "compositeFileNames" layer
 * property and resolved from the same root folder, so every composite referenced that way is provided too. The
 * associations are checked even when the main composite is already present, otherwise a second run would keep
 * missing them.
 *
 */

const { SampleFileCopier } = require('./sample-file-copier');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class CompositeSampleFilesProvider
{

    constructor(themeManager)
    {
        this.sampleFileCopier = new SampleFileCopier(themeManager);
        this.packageExamplesPath = FileHandler.joinPaths(
            this.sampleFileCopier.examplesPath,
            'layer-elements-composite'
        );
        this.associatedCompositesProperties = [
            'compositeFileNames',
            'downFloorCompositeFileNames',
            'upperFloorCompositeFileNames'
        ];
    }

    copyTilesetImages(compositeJson, rootFolder)
    {
        for(let tileset of sc.get(compositeJson, 'tilesets', [])){
            this.sampleFileCopier.copy(
                this.packageExamplesPath,
                rootFolder,
                String(sc.get(tileset, 'image', '')).split('/').pop()
            );
        }
    }

    appendCompositeNames(compositeNames, propertyValue)
    {
        for(let compositeName of String(propertyValue).split(',')){
            if('' === compositeName || -1 !== compositeNames.indexOf(compositeName)){
                continue;
            }
            compositeNames.push(compositeName);
        }
        return compositeNames;
    }

    appendLayerCompositeNames(compositeNames, layer)
    {
        for(let property of sc.get(layer, 'properties', [])){
            if(-1 !== this.associatedCompositesProperties.indexOf(sc.get(property, 'name', ''))){
                this.appendCompositeNames(compositeNames, sc.get(property, 'value', ''));
            }
        }
        return compositeNames;
    }

    fetchAssociatedCompositeNames(compositeJson)
    {
        let compositeNames = [];
        for(let layer of sc.get(compositeJson, 'layers', [])){
            this.appendLayerCompositeNames(compositeNames, layer);
        }
        return compositeNames;
    }

    provideCompositeJson(rootFolder, compositeElementsFile)
    {
        let targetFilePath = FileHandler.joinPaths(rootFolder, compositeElementsFile);
        let existingCompositeJson = FileHandler.fetchFileJson(targetFilePath);
        if(existingCompositeJson){
            this.copyTilesetImages(existingCompositeJson, rootFolder);
            return existingCompositeJson;
        }
        let sampleFilePath = FileHandler.joinPaths(this.packageExamplesPath, compositeElementsFile);
        let compositeJson = FileHandler.fetchFileJson(sampleFilePath);
        if(!compositeJson){
            Logger.error('Composite elements file not found: '+compositeElementsFile, sampleFilePath);
            return false;
        }
        FileHandler.createFolder(rootFolder);
        if(!FileHandler.copyFile(sampleFilePath, targetFilePath)){
            Logger.error('Composite elements file could not be copied: '+compositeElementsFile, targetFilePath);
            return false;
        }
        this.copyTilesetImages(compositeJson, rootFolder);
        Logger.info('Composite sample file copied for reuse: '+compositeElementsFile, rootFolder);
        return compositeJson;
    }

    ensureAssociatedComposites(rootFolder, compositeJson, ensuredFiles)
    {
        let associatedEnsured = true;
        for(let compositeName of this.fetchAssociatedCompositeNames(compositeJson)){
            if(!this.ensureCompositeFile(rootFolder, compositeName+'.json', ensuredFiles)){
                associatedEnsured = false;
            }
        }
        return associatedEnsured;
    }

    ensureCompositeFile(rootFolder, compositeElementsFile, ensuredFiles = {})
    {
        if(!compositeElementsFile){
            return false;
        }
        if(sc.hasOwn(ensuredFiles, compositeElementsFile)){
            return true;
        }
        ensuredFiles[compositeElementsFile] = true;
        let compositeJson = this.provideCompositeJson(rootFolder, compositeElementsFile);
        if(!compositeJson){
            return false;
        }
        return this.ensureAssociatedComposites(rootFolder, compositeJson, ensuredFiles);
    }

}

module.exports.CompositeSampleFilesProvider = CompositeSampleFilesProvider;
