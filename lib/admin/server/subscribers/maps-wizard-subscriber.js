/**
 *
 * Reldens - MapsWizardSubscriber
 *
 */

const { MapsImporter } = require('../../../import/server/maps-importer');
const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const {
    RandomMapGenerator,
    LayerElementsObjectLoader,
    LayerElementsCompositeLoader,
    MultipleByLoaderGenerator,
    MultipleWithAssociationsByLoaderGenerator
} = require('@reldens/tile-map-generator');
const { Logger, sc } = require('@reldens/utils');

class MapsWizardSubscriber
{

    constructor(adminManager, configManager, themeManager)
    {
        this.mapsWizardPath = '/maps-wizard';
        this.rootPath = '';
        this.themeManager = themeManager;
        this.events = adminManager.events;
        this.mapsImporter = new MapsImporter({configManager, dataServer: adminManager.dataServer, themeManager});
        this.fields = [{name: 'generatorImages'}, {name: 'generatorJsonFiles'}];
        this.buckets = {
            generatorImages: this.themeManager.projectGenerateDataPath,
            generatorJsonFiles: this.themeManager.projectGenerateDataPath
        };
        this.allowedFileTypes = {
            generatorImages: AllowedFileTypes.IMAGE,
            generatorJsonFiles: AllowedFileTypes.TEXT
        };
        this.uploader = adminManager.uploaderFactory.createUploader(this.fields, this.buckets, this.allowedFileTypes);
        this.render = adminManager.contentsBuilder.render.bind(adminManager.contentsBuilder);
        this.renderRoute = adminManager.contentsBuilder.renderRoute.bind(adminManager.contentsBuilder);
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        this.mapsWizardHandlers = {
            'elements-object-loader': LayerElementsObjectLoader,
            'elements-composite-loader': LayerElementsCompositeLoader,
            'multiple-by-loader': MultipleByLoaderGenerator,
            'multiple-with-association-by-loader': MultipleWithAssociationsByLoaderGenerator
        };
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on MapsWizardSubscriber.');
            return false;
        }
        this.events.on('reldens.setupAdminManagers', async (event) => {
            this.setupRoutes(event.adminManager);
        });
        this.events.on('reldens.eventBuildSideBarBefore', async (event) => {
            if(!event.navigationContents['Wizards']){
                event.navigationContents['Wizards'] = {};
            }
            let translatedLabel = event.adminManager.translations.labels['mapsWizard'];
            event.navigationContents['Wizards'][translatedLabel] = await event.adminManager.contentsBuilder.render(
                event.adminManager.adminFilesContents.sideBarItem,
                {name: translatedLabel, path: event.adminManager.rootPath+this.mapsWizardPath}
            );
        });
        this.events.on('reldens.buildAdminContentsAfter', async (event) => {
            let pageContent = await this.render(
                event.adminManager.adminFilesContents.mapsWizard,
                {actionPath: event.adminManager.rootPath+this.mapsWizardPath}
            );
            event.adminManager.contentsBuilder.adminContents.mapsWizard = await this.renderRoute(
                pageContent,
                event.adminManager.contentsBuilder.adminContents.sideBar
            );
        });
    }

    setupRoutes(adminManager)
    {
        if('' === this.rootPath){
            this.rootPath = adminManager.rootPath;
        }
        adminManager.router.adminRouter.get(this.mapsWizardPath, this.isAuthenticated, async (req, res) => {
            return res.send(await this.render(adminManager.contentsBuilder.adminContents.mapsWizard));
        });
        adminManager.router.adminRouter.post(
            this.mapsWizardPath,
            this.isAuthenticated,
            this.uploader,
            async (req, res) => {
                if('generate' === req?.body?.mainAction){
                    return await this.generateMaps(req, res, adminManager);
                }
                if('import' === req?.body?.mainAction){
                    return res.redirect(await this.importSelectedMaps(req));
                }
            }
        );
    }

    async generateMaps(req, res, adminManager)
    {
        let selectedHandler = req?.body?.mapsWizardAction;
        if(!selectedHandler){
            return this.mapsWizardRedirect(res, 'mapsWizardMissingActionError');
        }
        let generatorData = req?.body?.generatorData;
        if(!generatorData){
            return this.mapsWizardRedirect(res, 'mapsWizardMissingDataError');
        }
        let mapData = sc.toJson(generatorData);
        if(!mapData){
            return this.mapsWizardRedirect(res, 'mapsWizardWrongJsonDataError');
        }
        let handler = this.mapsWizardHandlers[selectedHandler];
        if(!handler){
            return this.mapsWizardRedirect(res, 'mapsWizardMissingHandlerError');
        }
        let mainGenerator = false;
        let generatorWithData = false;
        let generatedMap = false;
        let handlerParams = {mapData, rootFolder: this.themeManager.projectGenerateDataPath};
        try {
            if('elements-object-loader' === selectedHandler){
                mainGenerator = new handler(handlerParams);
                await mainGenerator.load();
                let generator = new RandomMapGenerator(mainGenerator.mapData);
                generatedMap = await generator.generate();
                generatorWithData = generator;
            }
            if('elements-composite-loader' === selectedHandler){
                mainGenerator = new handler(handlerParams);
                await mainGenerator.load();
                let generator = new RandomMapGenerator();
                await generator.fromElementsProvider(mainGenerator.mapData);
                generatedMap = await generator.generate();
                generatorWithData = generator;
            }
            if('multiple-by-loader' === selectedHandler){
                mainGenerator = new MultipleByLoaderGenerator({loaderData: handlerParams});
                await mainGenerator.generate();
                generatorWithData = mainGenerator;
            }
            if('multiple-with-association-by-loader' === selectedHandler){
                mainGenerator = new MultipleWithAssociationsByLoaderGenerator({loaderData: handlerParams});
                await mainGenerator.generate();
                generatorWithData = mainGenerator;
            }
        } catch (error) {
            Logger.error('Maps generator error.', selectedHandler, generatorData, error);
            return this.mapsWizardRedirect(res, 'mapsWizardGeneratorError');
        }
        if(!generatorWithData){
            Logger.error('Maps not generated, incompatible selected handler.', selectedHandler, generatorData);
            return this.mapsWizardRedirect(res, 'mapsWizardSelectedHandlerError');
        }
        let mapsData = {
            maps: [],
            actionPath: this.rootPath+this.mapsWizardPath,
            generatedMapsHandler: selectedHandler,
            importAssociationsForChangePoints: Number(mapData.importAssociationsForChangePoints || 0),
            importAssociationsRecursively: Number(mapData.importAssociationsRecursively || 0),
            verifyTilesetImage: Number(mapData.verifyTilesetImage || 1),
            automaticallyExtrudeMaps: Number(mapData.automaticallyExtrudeMaps || 1),
            handlerParams: generatorData
        };
        if(generatedMap){
            let tileWidth = generatedMap.tilewidth;
            let tileHeight = generatedMap.tileheight;
            let mapFileName = generatorWithData.mapFileName;
            if(-1 === mapFileName.indexOf('json')){
                mapFileName = mapFileName+'.json';
            }
            mapsData.maps.push({
                key: generatorWithData.mapName,
                mapWidth: generatedMap.width * tileWidth,
                mapHeight: generatedMap.height * tileHeight,
                tileWidth,
                tileHeight,
                mapImage: this.rootPath+'/generated/'+generatorWithData.tileSheetName,
                mapJson: this.rootPath+'/generated/'+mapFileName
            });
        }
        if(generatorWithData.generators && generatorWithData.generatedMaps){
            for(let i of Object.keys(generatorWithData.generators)){
                let generator = generatorWithData.generators[i];
                let generatedMap = generatorWithData.generatedMaps[generator.mapName];
                let tileWidth = generatedMap.tilewidth;
                let tileHeight = generatedMap.tileheight;
                let mapFileName = generator.mapFileName;
                if(-1 === mapFileName.indexOf('json')){
                    mapFileName = mapFileName+'.json';
                }
                let associatedMap = sc.get(mainGenerator.associatedMaps, i, {});
                let subMaps = this.mapSubMapsData(
                    sc.get(associatedMap, 'generatedSubMaps'),
                    sc.get(associatedMap, 'generators'),
                    tileWidth,
                    tileHeight
                );
                mapsData.maps.push({
                    key: generator.mapName,
                    mapWidth: generatedMap.width * tileWidth,
                    mapHeight: generatedMap.height * tileHeight,
                    tileWidth,
                    tileHeight,
                    mapImage: this.rootPath+'/generated/'+generator.tileSheetName,
                    mapJson: this.rootPath+'/generated/'+mapFileName,
                    hasSubMaps: 0 < subMaps.length,
                    subMaps
                });
            }
        }
        if(0 === mapsData.maps.length){
            return this.mapsWizardRedirect(res, 'mapsWizardMapsNotGeneratedError');
        }
        return this.mapsWizardMapsSelection(res, mapsData, adminManager);
    }

    mapSubMapsData(generatedSubMaps, generators, tileWidth, tileHeight)
    {
        if(!generatedSubMaps){
            return [];
        }
        let subMapsData = [];
        for(let i of Object.keys(generatedSubMaps)) {
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
                mapImage: this.rootPath + '/generated/' + generator.tileSheetName,
                mapJson: this.rootPath + '/generated/' + mapFileName
            });
        }
        return subMapsData;
    }

    mapsWizardRedirect(res, result)
    {
        return res.redirect(this.rootPath + this.mapsWizardPath + '?result='+result);
    }

    async mapsWizardMapsSelection(res, data, adminManager)
    {
        let renderedView = await this.render(adminManager.adminFilesContents.mapsWizardMapsSelection, data);
        return res.send(await this.renderRoute(renderedView, adminManager.contentsBuilder.adminContents.sideBar));
    }

    async importSelectedMaps(req)
    {
        let generatedMapData = this.mapGeneratedMapsDataForImport(req.body);
        if(!generatedMapData){
            return this.rootPath+this.mapsWizardPath+'?result=mapsWizardImportDataError';
        }
        let importResult = await this.mapsImporter.import(generatedMapData);
        if(!importResult){
            let errorCode = this.mapsImporter.errorCode || 'mapsWizardImportError';
            return this.rootPath+this.mapsWizardPath+'?result='+errorCode;
        }
        return this.rootPath+this.mapsWizardPath+'?result=success';
    }

    mapGeneratedMapsDataForImport(data)
    {
        let selectedMaps = sc.get(data, 'selectedMaps', false);
        if(!selectedMaps){
            return false;
        }
        let importAssociations = 'multiple-with-association-by-loader' === data.generatedMapsHandler;
        let mappedData = {
            importAssociationsForChangePoints: importAssociations,
            importAssociationsRecursively: importAssociations,
            automaticallyExtrudeMaps: data.automaticallyExtrudeMaps,
            verifyTilesetImage: data.verifyTilesetImage,
            handlerParams: sc.toJson(data.handlerParams),
            relativeGeneratedDataPath: 'generate-data/generated',
            maps: {}
        };
        for(let mapKey of selectedMaps){
            mappedData.maps[data['map-title-'+mapKey]] = mapKey;
        }
        return mappedData;
    }

}

module.exports.MapsWizardSubscriber = MapsWizardSubscriber;
