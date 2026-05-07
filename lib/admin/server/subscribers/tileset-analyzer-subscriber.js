/**
 *
 * Reldens - TilesetAnalyzerSubscriber
 *
 */

let { Requirements, TilesetAnalyzerServer, MapsWizardConfigBuilder } = require('@reldens/tileset-to-tilemap');
let { FileHandler } = require('@reldens/server-utils');
let { Logger, EnvVar, sc } = require('@reldens/utils');

class TilesetAnalyzerSubscriber
{
    constructor(adminManager, configManager, themeManager)
    {
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
            let showAiControls = EnvVar.boolean(process.env, 'RELDENS_TILESET_SHOW_AI_CONTROLS', false);
            let requirements = new Requirements(this.buildRequirementsOptions());
            let aiProviders = await requirements.resolveAiProviders();
            let pageContent = await this.render(
                event.adminManager.adminFilesContents.tilesetAnalyzer,
                {
                    showAiControls: showAiControls ? '1' : '0',
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

    async setupRoutes(adminManager)
    {
        FileHandler.createFolder(FileHandler.joinPaths(this.storageDir, 'input'));
        FileHandler.createFolder(FileHandler.joinPaths(this.storageDir, 'output'));
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
        let requirements = new Requirements(this.buildRequirementsOptions());
        let aiProviders = await requirements.resolveAiProviders();
        let skipAi = EnvVar.boolean(process.env, 'RELDENS_TILESET_SKIP_AI', false);
        let showAiControls = EnvVar.boolean(process.env, 'RELDENS_TILESET_SHOW_AI_CONTROLS', false);
        let tilesetServer = new TilesetAnalyzerServer(
            this.storageDir,
            this.buildAnalyzerOptions({aiProviders, skipAi, showAiControls, skipIndex: true})
        );
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
                return res.json(new MapsWizardConfigBuilder().buildPartialGeneratorData(config));
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

    buildRequirementsOptions()
    {
        return {
            ollamaHost: EnvVar.string(process.env, 'RELDENS_TILESET_OLLAMA_HOST', ''),
            ollamaModel: EnvVar.string(process.env, 'RELDENS_TILESET_OLLAMA_MODEL', 'qwen2.5vl:7b'),
            ollamaAvailableModels: EnvVar.string(process.env, 'RELDENS_TILESET_OLLAMA_AVAILABLE_MODELS', ''),
            anthropicApiKey: EnvVar.string(process.env, 'ANTHROPIC_API_KEY', null),
            geminiApiKey: EnvVar.string(process.env, 'GEMINI_API_KEY', null)
        };
    }

    buildAnalyzerOptions(extra)
    {
        let base = {
            claudeModel: EnvVar.string(process.env, 'RELDENS_TILESET_CLAUDE_MODEL', 'claude-sonnet-4-6'),
            claudeMaxTokens: EnvVar.number(process.env, 'RELDENS_TILESET_CLAUDE_MAX_TOKENS', 512),
            claudeMaxTokensDetection: EnvVar.number(process.env, 'RELDENS_TILESET_CLAUDE_MAX_TOKENS_DETECTION', 4096),
            geminiModel: EnvVar.string(process.env, 'RELDENS_TILESET_GEMINI_MODEL', 'gemini-2.0-flash-preview-image-generation'),
            geminiMaxTokens: EnvVar.number(process.env, 'RELDENS_TILESET_GEMINI_MAX_TOKENS', 512),
            geminiMaxTokensDetection: EnvVar.number(process.env, 'RELDENS_TILESET_GEMINI_MAX_TOKENS_DETECTION', 4096),
            ollamaHost: EnvVar.string(process.env, 'RELDENS_TILESET_OLLAMA_HOST', ''),
            ollamaNumCtx: EnvVar.number(process.env, 'RELDENS_TILESET_OLLAMA_NUM_CTX', 8192),
            ollamaNumPredict: EnvVar.number(process.env, 'RELDENS_TILESET_OLLAMA_NUM_PREDICT', 2000),
            minClusterTiles: EnvVar.number(process.env, 'RELDENS_TILESET_MIN_CLUSTER_TILES', 1),
            maxClusterTiles: EnvVar.number(process.env, 'RELDENS_TILESET_MAX_CLUSTER_TILES', 30),
            clusterColorDistance: EnvVar.number(process.env, 'RELDENS_TILESET_CLUSTER_COLOR_DISTANCE', 30),
            clusterVarianceThreshold: EnvVar.number(process.env, 'RELDENS_TILESET_CLUSTER_VARIANCE_THRESHOLD', 600),
            clusterMinTileFillPct: EnvVar.number(process.env, 'RELDENS_TILESET_CLUSTER_MIN_TILE_FILL_PCT', 10),
            clusterSplitByGap: EnvVar.number(process.env, 'RELDENS_TILESET_CLUSTER_SPLIT_BY_GAP', 1),
            elementBorderColorDistance: EnvVar.number(process.env, 'RELDENS_TILESET_ELEMENT_BORDER_COLOR_DISTANCE', 20),
            validatePass: EnvVar.boolean(process.env, 'RELDENS_TILESET_VALIDATE_PASS', false)
        };
        Object.assign(base, extra);
        return base;
    }
}

module.exports.TilesetAnalyzerSubscriber = TilesetAnalyzerSubscriber;
