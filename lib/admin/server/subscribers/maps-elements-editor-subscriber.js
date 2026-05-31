/**
 *
 * Reldens - MapsElementsEditorSubscriber
 *
 * Hosts the admin routes for the map element editor: save, list/restore/delete backups,
 * and build-elements-from-layers (the layer-name fallback parser exposed for the client).
 *
 */

const { MapElementsBackupArchive } = require('../map-elements-backup-archive');
const { RoomMapElementsBuilder } = require('../room-map-elements-builder');
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
        /** @type {RoomMapElementsBuilder} */
        this.elementsBuilder = new RoomMapElementsBuilder();
        this.listenEvents();
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
        let backupInfo = this.backupArchive.writeBackupPair(mapName);
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
        return res.json({success: true, preRestoreBackup: result.preRestoreBackup});
    }

    handleDeleteBackup(req, res, pair)
    {
        Logger.info('Backup deleted.', pair.mapName, pair.backupTimestamp);
        return res.json({
            success: true,
            removed: this.backupArchive.deletePair(pair.mapName, pair.backupTimestamp)
        });
    }

    handleBuildFromLayers(req, res, extracted)
    {
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
