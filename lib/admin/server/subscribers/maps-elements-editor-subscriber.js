/**
 *
 * Reldens - MapsElementsEditorSubscriber
 *
 * Hosts the admin routes for the map element editor: save, list/restore/delete backups,
 * and build-elements-from-layers (the layer-name fallback parser exposed for the client).
 *
 */

const { MapElementsBackupArchive } = require('../map-elements-backup-archive');
const { PublishedMapMerger } = require('../../../import/server/published-map-merger');
const { ElementsFromLayersLoader, ElementsToLayersBuilder } = require('@reldens/tile-map-generator');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('../../../game/server/theme-manager').ThemeManager} ThemeManager
 * @typedef {import('../../../config/client/config-manager').ConfigManager} ConfigManager
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('express').Response} ExpressResponse
 */
class MapsElementsEditorSubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {ConfigManager} config
     * @param {ThemeManager} themeManager
     */
    constructor(adminManager, config, themeManager)
    {
        /** @type {string} */
        this.basePath = '/maps-elements-editor';
        /** @type {string} */
        this.savePath = this.basePath+'/api/save-map-edit';
        /** @type {string} */
        this.listBackupsPath = this.basePath+'/api/list-backups';
        /** @type {string} */
        this.restoreBackupPath = this.basePath+'/api/restore-backup';
        /** @type {string} */
        this.deleteBackupPath = this.basePath+'/api/delete-backup';
        /** @type {string} */
        this.buildFromLayersPath = this.basePath+'/api/build-elements-from-layers';
        /** @type {string} */
        this.ensureInitialBackupPath = this.basePath+'/api/ensure-initial-backup';
        /** @type {string} */
        this.scriptsVariablePlaceholder = '{{&mapsElementsEditorScripts}}';
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {ThemeManager} */
        this.themeManager = themeManager;
        /** @type {Function} */
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        /** @type {MapElementsBackupArchive} */
        this.backupArchive = new MapElementsBackupArchive(themeManager);
        /** @type {PublishedMapMerger} */
        this.publishedMapMerger = new PublishedMapMerger(config);
        /** @type {ElementsFromLayersLoader} */
        this.layersLoader = new ElementsFromLayersLoader();
        /** @type {ElementsToLayersBuilder} */
        this.elementsToLayersBuilder = new ElementsToLayersBuilder();
        /** @type {string} */
        this.serverStartTime = sc.getDateForFileName();
        this.injectScriptsVariableIntoRoomsSection(adminManager);
        this.listenEvents();
    }

    /**
     * @param {AdminManager} adminManager
     * @returns {boolean}
     */
    injectScriptsVariableIntoRoomsSection(adminManager)
    {
        let scripts = sc.get(adminManager.adminFilesContents, 'mapsElementsEditorScripts', '');
        if(!scripts){
            Logger.error('Map elements editor scripts template not found.');
            return false;
        }
        let roomsSection = sc.get(adminManager.adminFilesContents?.sections?.view, 'rooms', '');
        if(!roomsSection){
            Logger.error('Rooms admin section not found for maps elements editor scripts injection.');
            return false;
        }
        let placeholderPresent = roomsSection.includes(this.scriptsVariablePlaceholder);
        adminManager.adminFilesContents.sections.view.rooms = roomsSection.replaceAll(
            this.scriptsVariablePlaceholder,
            scripts
        );
        Logger.info(
            'Maps elements editor scripts injection done.',
            'placeholderPresent='+placeholderPresent,
            'scriptsLength='+scripts.length
        );
        return true;
    }

    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on MapsElementsEditorSubscriber.');
            return false;
        }
        this.events.on('reldens.setupAdminManagers', async (event) => {
            this.setupRoutes(event.adminManager);
        });
    }

    setupRoutes(adminManager)
    {
        let router = adminManager.router.adminRouter;
        this.routeWithFields(
            router.post.bind(router),
            this.savePath,
            'body',
            ['mapName'],
            'mapNameMissing',
            (req, res, extracted) => this.handleSaveMapEdit(req, res, extracted)
        );
        this.routeWithFields(
            router.get.bind(router),
            this.listBackupsPath,
            'query',
            ['mapName'],
            'mapNameMissing',
            (req, res, extracted) => this.handleListBackups(req, res, extracted)
        );
        this.routeWithFields(
            router.post.bind(router),
            this.restoreBackupPath,
            'body',
            ['mapName', 'backupTimestamp'],
            'mapNameOrTimestampMissing',
            (req, res, extracted) => this.handleRestoreBackup(req, res, extracted)
        );
        this.routeWithFields(
            router.post.bind(router),
            this.deleteBackupPath,
            'body',
            ['mapName', 'backupTimestamp'],
            'mapNameOrTimestampMissing',
            (req, res, extracted) => this.handleDeleteBackup(req, res, extracted)
        );
        this.routeWithFields(
            router.get.bind(router),
            this.buildFromLayersPath,
            'query',
            ['mapName'],
            'mapNameMissing',
            (req, res, extracted) => this.handleBuildFromLayers(req, res, extracted)
        );
        this.routeWithFields(
            router.post.bind(router),
            this.ensureInitialBackupPath,
            'body',
            ['mapName'],
            'mapNameMissing',
            (req, res, extracted) => this.handleEnsureInitialBackup(req, res, extracted)
        );
    }

    handleEnsureInitialBackup(req, res, extracted)
    {
        let mapName = extracted.mapName;
        let existing = this.backupArchive.listBackups(mapName);
        if(0 < existing.length){
            return res.json({success: true, created: false, existingCount: existing.length});
        }
        this.backupArchive.ensureLiveFromRuntime(mapName);
        let backupInfo = this.backupArchive.writeBackupPair(mapName);
        if(!backupInfo.backupFiles || 0 === backupInfo.backupFiles.length){
            return res.status(500).json({error: 'initialBackupWriteFailed'});
        }
        Logger.info('Initial backup created.', mapName, backupInfo.timestamp);
        return res.json({success: true, created: true, timestamp: backupInfo.timestamp});
    }

    routeWithFields(routeMethod, path, source, fields, errorCode, handler)
    {
        routeMethod(path, this.isAuthenticated, async (req, res) => {
            let extracted = this.extractValidFields(req, res, source, fields, errorCode);
            if(!extracted){
                return;
            }
            return handler(req, res, extracted);
        });
    }

    extractValidFields(req, res, source, fields, errorCode)
    {
        let result = {};
        for(let field of fields){
            let value = sc.get(req[source], field, '').replace(/[^a-zA-Z0-9-]/g, '');
            if(!value){
                res.status(400).json({error: errorCode});
                return null;
            }
            result[field] = value;
        }
        return result;
    }

    async handleSaveMapEdit(req, res, extracted)
    {
        let mapName = extracted.mapName;
        let mapElements = sc.get(req.body, 'mapElements', null);
        if(!mapElements || !sc.isArray(mapElements.elements)){
            return res.status(400).json({error: 'mapElementsMissing'});
        }
        this.backupArchive.ensureLiveFromRuntime(mapName);
        let livePath = this.backupArchive.path('live', mapName);
        let liveMap = FileHandler.fetchFileJson(livePath);
        if(!liveMap){
            return res.status(500).json({error: 'mapJsonParseError'});
        }
        let mapJson = this.elementsToLayersBuilder.apply(liveMap, mapElements);
        if(!FileHandler.writeFile(livePath, sc.toJsonString(mapJson))){
            Logger.error('Could not write map JSON.', mapName);
            return res.status(500).json({error: 'mapWriteError'});
        }
        FileHandler.writeFile(this.backupArchive.path('liveElements', mapName), sc.toJsonString(mapElements));
        if('room' === sc.get(req.body, 'context', 'wizard')){
            this.publishRoomRuntime(mapName);
        }
        let backupInfo = this.backupArchive.writeBackupPair(mapName);
        Logger.info('Map edit saved.', mapName, backupInfo.timestamp);
        return res.json({success: true, backupFiles: backupInfo.backupFiles, timestamp: backupInfo.timestamp});
    }

    /**
     * @param {string} mapName
     * @returns {boolean}
     */
    publishRoomRuntime(mapName)
    {
        this.backupArchive.syncRuntimeCopies(mapName);
        let recordPath = this.backupArchive.path('liveElements', mapName);
        if(!FileHandler.exists(recordPath)){
            return true;
        }
        return this.publishedMapMerger.mergeAndPublish(
            FileHandler.fetchFileJson(this.backupArchive.path('live', mapName)),
            FileHandler.fetchFileJson(recordPath),
            this.backupArchive.path('assets', mapName),
            this.backupArchive.path('dist', mapName)
        );
    }

    handleListBackups(req, res, extracted)
    {
        let backups = this.backupArchive.listBackups(extracted.mapName);
        return res.json({backups, publishedTimestamp: this.resolvePublishedTimestamp(backups)});
    }

    resolvePublishedTimestamp(backups)
    {
        for(let backup of backups){
            if(0 >= backup.timestamp.localeCompare(this.serverStartTime)){
                return backup.timestamp;
            }
        }
        if(0 === backups.length){
            return '';
        }
        return backups[backups.length - 1].timestamp;
    }

    handleRestoreBackup(req, res, pair)
    {
        let result = this.backupArchive.restore(pair.mapName, pair.backupTimestamp);
        if(!result.success){
            return res.status(400).json({error: result.error});
        }
        if('room' === sc.get(req.body, 'context', 'wizard')){
            this.publishRoomRuntime(pair.mapName);
        }
        Logger.info('Backup restored.', pair.mapName, pair.backupTimestamp);
        return res.json({success: true});
    }

    handleDeleteBackup(req, res, pair)
    {
        Logger.info('Backup deleted.', pair.mapName, pair.backupTimestamp);
        return res.json({
            success: true,
            removed: this.backupArchive.deleteBackup(pair.mapName, pair.backupTimestamp)
        });
    }

    handleBuildFromLayers(req, res, extracted)
    {
        this.backupArchive.ensureLiveFromRuntime(extracted.mapName);
        let mapPath = this.backupArchive.path('live', extracted.mapName);
        if(!FileHandler.exists(mapPath)){
            return res.status(404).json({error: 'mapFileNotFound'});
        }
        let mapJson = FileHandler.fetchFileJson(mapPath);
        if(!mapJson){
            return res.status(500).json({error: 'mapJsonParseError'});
        }
        let parsed = this.layersLoader.load(mapJson);
        Logger.warning('Layer-name detection used.', extracted.mapName);
        return res.json({mapElements: parsed, warnings: parsed.warnings});
    }

}

module.exports.MapsElementsEditorSubscriber = MapsElementsEditorSubscriber;
