/**
 *
 * Reldens - SelectedMapsImportRunner
 *
 * Owns the maps wizard import request: maps the wizard form data into the importer payload, runs the import,
 * clears the backups of the imported maps and resolves the redirect path (the newly created room view when the
 * import succeeds, the wizard with the proper result code otherwise).
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../import/server/maps-importer').MapsImporter} MapsImporter
 * @typedef {import('./map-elements-backup-archive').MapElementsBackupArchive} MapElementsBackupArchive
 * @typedef {import('express').Request} ExpressRequest
 */
class SelectedMapsImportRunner
{

    /**
     * @param {MapsImporter} mapsImporter
     * @param {MapElementsBackupArchive} backupArchive
     */
    constructor(mapsImporter, backupArchive)
    {
        /** @type {MapsImporter} */
        this.mapsImporter = mapsImporter;
        /** @type {MapElementsBackupArchive} */
        this.backupArchive = backupArchive;
    }

    /**
     * @param {ExpressRequest} req
     * @param {Object} paths
     * @returns {Promise<string>}
     */
    async run(req, paths)
    {
        let sessionSuffix = this.buildSessionSuffix(sc.get(req.body, 'tilesetSessionId', ''));
        let generatedMapData = this.mapGeneratedMapsDataForImport(req.body);
        if(!generatedMapData){
            return paths.rootPath+paths.mapsWizardPath+'?result=mapsWizardImportDataError'+sessionSuffix;
        }
        let importResult = await this.mapsImporter.import(generatedMapData);
        if(!importResult){
            let errorCode = this.mapsImporter.errorCode || 'mapsWizardImportError';
            return paths.rootPath+paths.mapsWizardPath+'?result='+errorCode+sessionSuffix;
        }
        this.clearImportedBackups();
        let importedRoomId = this.fetchImportedRoomId(sc.get(req.body, 'selectedMaps', []));
        if(importedRoomId){
            return paths.rootPath+'/rooms'+paths.viewPath+'?id='+importedRoomId+'&result=success';
        }
        return paths.rootPath+paths.mapsWizardPath+'?result=success'+sessionSuffix;
    }

    clearImportedBackups()
    {
        for(let mapName of Object.keys(this.mapsImporter.createdRooms)){
            this.backupArchive.clearBackups(mapName);
        }
    }

    fetchImportedRoomId(selectedMaps)
    {
        if(!sc.isNotEmptyArray(selectedMaps)){
            return false;
        }
        let importedRoom = this.mapsImporter.createdRooms[selectedMaps[0]];
        if(!importedRoom){
            return false;
        }
        return importedRoom.id;
    }

    buildSessionSuffix(tilesetSessionId)
    {
        if(!sc.isString(tilesetSessionId)){
            return '';
        }
        let safeSessionId = tilesetSessionId.replace(/[^a-zA-Z0-9-]/g, '');
        if(!safeSessionId){
            return '';
        }
        return '&tilesetSessionId='+safeSessionId;
    }

    /**
     * @param {Object} data
     * @returns {Object|false}
     */
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

module.exports.SelectedMapsImportRunner = SelectedMapsImportRunner;
