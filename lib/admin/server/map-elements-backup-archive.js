/**
 *
 * Reldens - MapElementsBackupArchive
 *
 * Owns the backups folder under generate-data/generated/backups/. Writes timestamped backup
 * pairs (map JSON + elements sidecar) before each save, lists existing backups, restores
 * a chosen backup, and deletes backup pairs.
 *
 */

const { MapElementsBuilder } = require('./map-elements-builder');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/server/theme-manager').ThemeManager} ThemeManager
 */
class MapElementsBackupArchive
{

    /**
     * @param {ThemeManager} themeManager
     */
    constructor(themeManager)
    {
        /** @type {ThemeManager} */
        this.themeManager = themeManager;
        /** @type {MapElementsBuilder} */
        this.elementsBuilder = new MapElementsBuilder();
        /** @type {string} */
        this.mapSuffix = '-back.json';
        /** @type {string} */
        this.elementsSuffix = '-back'+this.elementsBuilder.elementsFileSuffix;
        /** @type {string} */
        this.liveElementsSuffix = this.elementsBuilder.elementsFileSuffix;
        /** @type {string} */
        this.backupsFolderName = 'backups';
        /** @type {string} */
        this.mapsFolderName = 'maps';
        /** @type {Object<string, string>} */
        this.pathRoots = {
            generated: 'projectGeneratedDataPath',
            assets: 'projectAssetsPath',
            dist: 'assetsDistPath'
        };
    }

    /**
     * @param {string} folder
     * @param {string} [mapName]
     * @param {string} [timestamp]
     * @returns {string}
     */
    path(folder, mapName, timestamp)
    {
        if('backupsFolder' === folder){
            return this.joinFrom('generated', [this.backupsFolderName]);
        }
        if('live' === folder){
            return this.joinFrom('generated', [mapName+'.json']);
        }
        if('liveElements' === folder){
            return this.joinFrom('generated', [mapName+this.liveElementsSuffix]);
        }
        if('assets' === folder){
            return this.joinFrom('assets', [this.mapsFolderName, mapName+'.json']);
        }
        if('dist' === folder){
            return this.joinFrom('dist', [this.mapsFolderName, mapName+'.json']);
        }
        if('assetsElements' === folder){
            return this.joinFrom('assets', [this.mapsFolderName, mapName+this.liveElementsSuffix]);
        }
        if('distElements' === folder){
            return this.joinFrom('dist', [this.mapsFolderName, mapName+this.liveElementsSuffix]);
        }
        if('mapBackup' === folder){
            return this.joinFrom('generated', [this.backupsFolderName, mapName+'-'+timestamp+this.mapSuffix]);
        }
        if('elementsBackup' === folder){
            return this.joinFrom('generated', [this.backupsFolderName, mapName+'-'+timestamp+this.elementsSuffix]);
        }
        return '';
    }

    /**
     * @param {string} rootKey
     * @param {Array<string>} parts
     * @returns {string}
     */
    joinFrom(rootKey, parts)
    {
        return FileHandler.joinPaths(this.themeManager[this.pathRoots[rootKey]], ...parts);
    }

    /**
     * @param {string} mapName
     * @returns {Object}
     */
    writeBackupPair(mapName)
    {
        FileHandler.createFolder(this.path('backupsFolder'));
        let timestamp = sc.getDateForFileName();
        let backupFiles = [];
        let mapBackup = this.path('mapBackup', mapName, timestamp);
        if(FileHandler.copyFile(this.path('live', mapName), mapBackup)){
            backupFiles.push(mapBackup);
        }
        let elementsBackup = this.path('elementsBackup', mapName, timestamp);
        if(FileHandler.copyFile(this.path('liveElements', mapName), elementsBackup)){
            backupFiles.push(elementsBackup);
        }
        return {timestamp, backupFiles};
    }

    /**
     * @param {string} mapName
     * @returns {boolean}
     */
    ensureLiveFromRuntime(mapName)
    {
        let livePath = this.path('live', mapName);
        if(FileHandler.exists(livePath)){
            return true;
        }
        let assetsPath = this.path('assets', mapName);
        if(!FileHandler.exists(assetsPath)){
            return false;
        }
        return FileHandler.copyFile(assetsPath, livePath);
    }

    /**
     * @param {string} mapName
     * @returns {Array<Object>}
     */
    listBackups(mapName)
    {
        let folder = this.path('backupsFolder');
        if(!FileHandler.exists(folder)){
            return [];
        }
        let list = [];
        for(let file of FileHandler.getFilesInFolder(folder, ['.json'])){
            this.collectBackupFile(list, folder, file, mapName);
        }
        list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        return list;
    }

    /**
     * @param {Array<Object>} list
     * @param {string} folder
     * @param {string} file
     * @param {string} mapName
     */
    collectBackupFile(list, folder, file, mapName)
    {
        let parsed = this.parseBackupFilename(file, mapName);
        if(!parsed){
            return;
        }
        let pair = sc.fetchByProperty(list, 'timestamp', parsed.timestamp);
        if(!pair){
            pair = {
                timestamp: parsed.timestamp,
                mapJsonPath: null,
                elementsFilePath: null,
                sizeBytes: 0
            };
            list.push(pair);
        }
        let fullPath = FileHandler.joinPaths(folder, file);
        if(parsed.isElements){
            pair.elementsFilePath = fullPath;
        }
        if(!parsed.isElements){
            pair.mapJsonPath = fullPath;
        }
        let stats = FileHandler.getFileStats(fullPath);
        if(stats){
            pair.sizeBytes += stats.size;
        }
    }

    /**
     * @param {string} file
     * @param {string} mapName
     * @returns {Object|null}
     */
    parseBackupFilename(file, mapName)
    {
        let prefix = mapName+'-';
        if(!sc.startsWith(file, prefix)){
            return null;
        }
        if(file.endsWith(this.elementsSuffix)){
            return {
                timestamp: file.slice(prefix.length, file.length - this.elementsSuffix.length),
                isElements: true
            };
        }
        if(file.endsWith(this.mapSuffix)){
            return {
                timestamp: file.slice(prefix.length, file.length - this.mapSuffix.length),
                isElements: false
            };
        }
        return null;
    }

    /**
     * @param {string} mapName
     * @param {string} backupTimestamp
     * @returns {Object}
     */
    restore(mapName, backupTimestamp)
    {
        if(!FileHandler.copyFile(this.path('mapBackup', mapName, backupTimestamp), this.path('live', mapName))){
            Logger.error('Could not restore map JSON.', mapName, backupTimestamp, FileHandler.error);
            return {success: false, error: 'restoreCopyError'};
        }
        if(!FileHandler.copyFile(
            this.path('elementsBackup', mapName, backupTimestamp),
            this.path('liveElements', mapName)
        )){
            Logger.warning('Elements sidecar not restored (may not exist for this backup).', mapName, backupTimestamp);
        }
        return {success: true};
    }

    /**
     * @param {string} mapName
     * @param {string} backupTimestamp
     * @returns {Array<string>}
     */
    deleteBackup(mapName, backupTimestamp)
    {
        let removed = [];
        let mapBackup = this.path('mapBackup', mapName, backupTimestamp);
        if(FileHandler.remove(mapBackup)){
            removed.push(mapBackup);
        }
        let elementsBackup = this.path('elementsBackup', mapName, backupTimestamp);
        if(FileHandler.remove(elementsBackup)){
            removed.push(elementsBackup);
        }
        return removed;
    }

    /**
     * @param {string} mapName
     * @returns {number}
     */
    clearBackups(mapName)
    {
        let backups = this.listBackups(mapName);
        for(let backup of backups){
            this.deleteBackup(mapName, backup.timestamp);
        }
        return backups.length;
    }


    /**
     * @param {string} mapName
     * @returns {boolean}
     */
    syncRuntimeCopies(mapName)
    {
        let livePath = this.path('live', mapName);
        if(!FileHandler.copyFile(livePath, this.path('assets', mapName))){
            return false;
        }
        if(!FileHandler.copyFile(livePath, this.path('dist', mapName))){
            return false;
        }
        let liveElementsPath = this.path('liveElements', mapName);
        FileHandler.copyFile(liveElementsPath, this.path('assetsElements', mapName));
        FileHandler.copyFile(liveElementsPath, this.path('distElements', mapName));
        return true;
    }
}

module.exports.MapElementsBackupArchive = MapElementsBackupArchive;
