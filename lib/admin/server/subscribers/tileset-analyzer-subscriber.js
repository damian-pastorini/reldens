/**
 *
 * Reldens - TilesetAnalyzerSubscriber
 *
 */

const { Requirements, TilesetAnalyzerServer, MapsWizardConfigBuilder } = require('@reldens/tileset-to-tilemap');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class TilesetAnalyzerSubscriber
{
    constructor(adminManager, configManager, themeManager, tilesetAnalyzerConfig)
    {
        this.skipAi = sc.get(tilesetAnalyzerConfig, 'skipAi', false);
        this.showAiControls = sc.get(tilesetAnalyzerConfig, 'showAiControls', false);
        this.requirementsOptions = sc.get(tilesetAnalyzerConfig, 'requirements', {});
        this.analyzerOptions = sc.get(tilesetAnalyzerConfig, 'analyzer', {});
        this.tilesetAnalyzerPath = '/tileset-analyzer';
        this.rootPath = '';
        this.themeManager = themeManager;
        this.events = adminManager.events;
        this.storageDir = FileHandler.joinPaths(
            themeManager.projectGenerateDataPath,
            'tileset-sessions'
        );
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        this.render = adminManager.contentsBuilder.render.bind(adminManager.contentsBuilder);
        this.renderRoute = adminManager.contentsBuilder.renderRoute.bind(adminManager.contentsBuilder);
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on TilesetAnalyzerSubscriber.');
            return false;
        }
        this.events.on('reldens.setupAdminManagers', async (event) => {
            this.rootPath = event.adminManager.rootPath;
            await this.setupRoutes(event.adminManager);
        });
        this.events.on('reldens.eventBuildSideBarBefore', async (event) => {
            if(!event.navigationContents['Wizards']){
                event.navigationContents['Wizards'] = {};
            }
            let label = event.adminManager.translations.labels['tilesetAnalyzer'];
            event.navigationContents['Wizards'][label] = await this.render(
                event.adminManager.adminFilesContents.sideBarItem,
                {name: label, path: event.adminManager.rootPath+this.tilesetAnalyzerPath+'/'}
            );
        });
        this.events.on('reldens.buildAdminContentsAfter', async (event) => {
            let requirements = new Requirements(this.requirementsOptions);
            let aiProviders = await requirements.resolveAiProviders();
            let pageContent = await this.render(
                event.adminManager.adminFilesContents.tilesetAnalyzer,
                {
                    showAiControls: this.showAiControls ? '1' : '0',
                    activeProviders: aiProviders.join(','),
                    mapsWizardPath: event.adminManager.rootPath+'/maps-wizard'
                }
            );
            event.adminManager.contentsBuilder.adminContents.tilesetAnalyzer = await this.renderRoute(
                pageContent,
                event.adminManager.contentsBuilder.adminContents.sideBar
            );
        });
    }

    overrideSavedStrategies(config, savedStrategies, configBuilder)
    {
        let strategies = {};
        for(let strategyKey of Object.keys(savedStrategies)){
            let savedData = sc.toJson(savedStrategies[strategyKey]) || {};
            let generated = configBuilder.buildPartialGeneratorData(
                Object.assign({}, config, {generatorType: strategyKey})
            );
            delete generated.partialData.automaticallyExtrudeMaps;
            strategies[strategyKey] = sc.toJsonString(Object.assign(savedData, generated.partialData), null, 2);
        }
        return strategies;
    }

    async setupRoutes(adminManager)
    {
        FileHandler.createFolder(FileHandler.joinPaths(this.storageDir, 'input'));
        FileHandler.createFolder(FileHandler.joinPaths(this.storageDir, 'output'));
        FileHandler.createFolder(FileHandler.joinPaths(this.storageDir, '..', 'generated'));
        let adminRouter = adminManager.router.adminRouter;
        let express = require('express');
        adminRouter.use(
            this.tilesetAnalyzerPath+'/tileset-image',
            this.isAuthenticated,
            express.static(FileHandler.joinPaths(this.storageDir, 'input'))
        );
        adminRouter.use(
            this.tilesetAnalyzerPath+'/output',
            this.isAuthenticated,
            express.static(FileHandler.joinPaths(this.storageDir, 'output'))
        );
        let requirements = new Requirements(this.requirementsOptions);
        let aiProviders = await requirements.resolveAiProviders();
        let tilesetServer = new TilesetAnalyzerServer(this.storageDir, {
            ...this.analyzerOptions,
            aiProviders,
            skipAi: this.skipAi,
            showAiControls: this.showAiControls,
            skipIndex: true
        });
        adminRouter.get(
            this.tilesetAnalyzerPath+'/api/session-wizard-config',
            this.isAuthenticated,
            (req, res) => {
                let sessionId = sc.get(req.query, 'sessionId', '');
                let safeSessionId = sessionId.replace(/[^a-zA-Z0-9-]/g, '');
                if(!safeSessionId){
                    return res.status(400).json({error: 'Missing sessionId'});
                }
                let configPath = FileHandler.joinPaths(this.storageDir, 'output', safeSessionId, 'map-generator-config.json');
                if(!FileHandler.exists(configPath)){
                    return res.status(404).json({error: 'Config not found'});
                }
                let content = FileHandler.readFile(configPath);
                if(!content){
                    return res.status(500).json({error: 'Failed to read config'});
                }
                let config = sc.toJson(content);
                if(!config){
                    return res.status(500).json({error: 'Invalid config'});
                }
                let saved = sc.get(config, 'savedWizardConfig', null);
                let configBuilder = new MapsWizardConfigBuilder();
                if(saved && saved.currentStrategy && saved.strategies){
                    let strategies = this.overrideSavedStrategies(config, saved.strategies, configBuilder);
                    return res.json({
                        strategy: saved.currentStrategy,
                        partialData: sc.toJson(sc.get(strategies, saved.currentStrategy, '{}')) || {},
                        savedStrategies: strategies
                    });
                }
                return res.json(configBuilder.buildPartialGeneratorData(config));
            }
        );
        let tilesetRouter = express.Router();
        tilesetServer.registerRoutes(tilesetRouter, this.isAuthenticated);
        adminRouter.use(this.tilesetAnalyzerPath, tilesetRouter);
        adminRouter.get(
            this.tilesetAnalyzerPath+'/',
            this.isAuthenticated,
            async (req, res) => {
                return res.send(
                    await this.render(adminManager.contentsBuilder.adminContents.tilesetAnalyzer)
                );
            }
        );
    }

}

module.exports.TilesetAnalyzerSubscriber = TilesetAnalyzerSubscriber;
