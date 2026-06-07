/**
 *
 * Reldens - MapsElementsEditorSubscriber
 *
 * Hosts the admin routes for the map element editor: save, list/restore/delete backups,
 * and build-elements-from-layers (the layer-name fallback parser exposed for the client).
 *
 */

const { MapElementsBackupArchive } = require('../map-elements-backup-archive');
const { MapElementsBuilder } = require('../map-elements-builder');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('../../../game/server/theme-manager').ThemeManager} ThemeManager
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('express').Response} ExpressResponse
 */
class MapsElementsEditorSubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {ThemeManager} themeManager
     */
    constructor(adminManager, themeManager)
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
        /** @type {Array<string>} */
        this.requiredTiledFields = ['width', 'height', 'tilewidth', 'tileheight', 'layers', 'tilesets'];
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {ThemeManager} */
        this.themeManager = themeManager;
        /** @type {Function} */
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        /** @type {MapElementsBackupArchive} */
        this.backupArchive = new MapElementsBackupArchive(themeManager);
        /** @type {MapElementsBuilder} */
        this.elementsBuilder = new MapElementsBuilder();
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

    extractSafe(req, source, field)
    {
        return sc.get(req[source], field, '').replace(/[^a-zA-Z0-9-]/g, '');
    }

    extractValidFields(req, res, source, fields, errorCode)
    {
        let result = {};
        for(let field of fields){
            let value = this.extractSafe(req, source, field);
            if(!value){
                res.status(400).json({error: errorCode});
                return null;
            }
            result[field] = value;
        }
        return result;
    }

    validateMapJson(mapJson)
    {
        if(!sc.isObject(mapJson)){
            return 'mapJsonMissing';
        }
        for(let field of this.requiredTiledFields){
            if(!sc.hasOwn(mapJson, field)){
                return 'mapJsonFieldMissing:'+field;
            }
        }
        return '';
    }

    async handleSaveMapEdit(req, res, extracted)
    {
        let mapName = extracted.mapName;
        let mapJson = sc.get(req.body, 'mapJson', null);
        let validation = this.validateMapJson(mapJson);
        if(validation){
            return res.status(400).json({error: validation});
        }
        if(!FileHandler.writeFile(this.backupArchive.path('live', mapName), sc.toJsonString(mapJson))){
            Logger.error('Could not write map JSON.', mapName);
            return res.status(500).json({error: 'mapWriteError'});
        }
        let mapElements = sc.get(req.body, 'mapElements', null);
        if(mapElements){
            FileHandler.writeFile(this.backupArchive.path('liveElements', mapName), sc.toJsonString(mapElements));
        }
        if('room' === sc.get(req.body, 'context', 'wizard')){
            this.backupArchive.syncRuntimeCopies(mapName);
        }
        let backupInfo = this.backupArchive.writeBackupPair(mapName);
        Logger.info('Map edit saved.', mapName, backupInfo.timestamp);
        return res.json({success: true, backupFiles: backupInfo.backupFiles, timestamp: backupInfo.timestamp});
    }

    handleListBackups(req, res, extracted)
    {
        return res.json({backups: this.backupArchive.listBackups(extracted.mapName)});
    }

    handleRestoreBackup(req, res, pair)
    {
        let result = this.backupArchive.restore(pair.mapName, pair.backupTimestamp);
        if(!result.success){
            return res.status(400).json({error: result.error});
        }
        if('room' === sc.get(req.body, 'context', 'wizard')){
            this.backupArchive.syncRuntimeCopies(pair.mapName);
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
        let parsed = this.elementsBuilder.buildFromLayers(mapJson);
        Logger.warning('Layer-name detection used.', extracted.mapName);
        return res.json({mapElements: parsed, warnings: parsed.warnings});
    }

}

module.exports.MapsElementsEditorSubscriber = MapsElementsEditorSubscriber;
