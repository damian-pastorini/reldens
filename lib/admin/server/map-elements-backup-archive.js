/**
 *
 * Reldens - MapElementsBackupArchive
 *
 * Owns the backups folder under generate-data/generated/backups/. Writes timestamped backup
 * pairs (map JSON + elements sidecar) before each save, lists existing backups, restores
 * a chosen backup, and deletes backup pairs.
 *
 */

const { RoomMapElementsBuilder } = require('./room-map-elements-builder');
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
        /** @type {RoomMapElementsBuilder} */
        this.elementsBuilder = new RoomMapElementsBuilder();
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
        let preRestoreBackup = this.writeBackupPair(mapName);
        if(!FileHandler.copyFile(this.path('mapBackup', mapName, backupTimestamp), this.path('live', mapName))){
            Logger.error('Could not restore map JSON.', mapName, backupTimestamp, FileHandler.error);
            return {success: false, error: 'restoreCopyError'};
        }
        FileHandler.copyFile(this.path('elementsBackup', mapName, backupTimestamp), this.path('liveElements', mapName));
        return {success: true, preRestoreBackup};
    }

    /**
     * @param {string} mapName
     * @param {string} backupTimestamp
     * @returns {Array<string>}
     */
    deletePair(mapName, backupTimestamp)
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
     * @returns {boolean}
     */
    syncRuntimeCopies(mapName)
    {
        let livePath = this.path('live', mapName);
        if(!FileHandler.copyFile(livePath, this.path('assets', mapName))){
            return false;
        }
        return FileHandler.copyFile(livePath, this.path('dist', mapName));
    }
}

module.exports.MapElementsBackupArchive = MapElementsBackupArchive;
