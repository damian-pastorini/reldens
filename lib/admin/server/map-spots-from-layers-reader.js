/**
 *
 * Reldens - MapSpotsFromLayersReader
 *
 * Owns the build-spots-from-layers request: reads the live map JSON through the shared MapElementsBackupArchive,
 * runs the package SpotsFromLayersLoader over its layer names and answers the resulting spots record.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('./map-elements-backup-archive').MapElementsBackupArchive} MapElementsBackupArchive
 * @typedef {import('@reldens/tile-map-generator').SpotsFromLayersLoader} SpotsFromLayersLoader
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('express').Response} ExpressResponse
 */
class MapSpotsFromLayersReader
{

    /**
     * @param {MapElementsBackupArchive} backupArchive
     * @param {SpotsFromLayersLoader} spotsLoader
     */
    constructor(backupArchive, spotsLoader)
    {
        /** @type {MapElementsBackupArchive} */
        this.backupArchive = backupArchive;
        /** @type {SpotsFromLayersLoader} */
        this.spotsLoader = spotsLoader;
    }

    /**
     * @param {ExpressRequest} req
     * @param {ExpressResponse} res
     * @param {Object} extracted
     * @returns {ExpressResponse}
     */
    handle(req, res, extracted)
    {
        let mapName = extracted.mapName;
        this.backupArchive.ensureLiveFromRuntime(mapName);
        let mapJson = FileHandler.fetchFileJson(this.backupArchive.path('live', mapName));
        if(!mapJson){
            return res.status(500).json({error: 'mapJsonParseError'});
        }
        let mapSpots = this.spotsLoader.load(mapJson);
        Logger.info('Spots layer-name detection used.', mapName, mapSpots.spots.length);
        return res.json({mapSpots, warnings: mapSpots.warnings});
    }

}

module.exports.MapSpotsFromLayersReader = MapSpotsFromLayersReader;
