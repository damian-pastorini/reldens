/**
 *
 * Reldens - MapResizePersister
 *
 * Owns the resize-map request: reads the live map JSON and its elements record through the shared
 * MapElementsBackupArchive, runs the package MapResizer, writes the resized live map and record back, triggers
 * publishing through the provided callback and answers the response.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./map-elements-backup-archive').MapElementsBackupArchive} MapElementsBackupArchive
 * @typedef {import('@reldens/tile-map-generator').MapResizer} MapResizer
 * @typedef {import('@reldens/tile-map-generator').ElementsFromLayersLoader} ElementsFromLayersLoader
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('express').Response} ExpressResponse
 */
class MapResizePersister
{

    /**
     * @param {MapElementsBackupArchive} backupArchive
     * @param {MapResizer} mapResizer
     * @param {ElementsFromLayersLoader} layersLoader
     */
    constructor(backupArchive, mapResizer, layersLoader)
    {
        /** @type {MapElementsBackupArchive} */
        this.backupArchive = backupArchive;
        /** @type {MapResizer} */
        this.mapResizer = mapResizer;
        /** @type {ElementsFromLayersLoader} */
        this.layersLoader = layersLoader;
    }

    /**
     * @param {ExpressRequest} req
     * @param {ExpressResponse} res
     * @param {Object} extracted
     * @param {Function} publish
     * @returns {ExpressResponse}
     */
    handle(req, res, extracted, publish)
    {
        let mapName = extracted.mapName;
        this.backupArchive.ensureLiveFromRuntime(mapName);
        let livePath = this.backupArchive.path('live', mapName);
        let originalLiveMapContents = FileHandler.fetchFileContents(livePath);
        let liveMap = FileHandler.fetchFileJson(livePath);
        if(!liveMap){
            return res.status(500).json({error: 'mapJsonParseError'});
        }
        let elementsPath = this.backupArchive.path('liveElements', mapName);
        let mapElements = this.resolveElements(elementsPath, liveMap);
        let result = this.mapResizer.resize(liveMap, mapElements, this.resizeParams(req));
        if(!result.success){
            return res.json({
                success: false,
                offending: sc.get(result, 'offending', []),
                error: sc.get(result, 'error', '')
            });
        }
        if(!FileHandler.writeFile(livePath, sc.toJsonString(liveMap))){
            Logger.error('Resized map file could not be saved.', mapName, FileHandler.error);
            return res.status(500).json({error: 'mapWriteError'});
        }
        if(!FileHandler.writeFile(elementsPath, sc.toJsonString(mapElements))){
            Logger.error('Resized map elements file could not be saved.', mapName, FileHandler.error);
            this.restoreLiveMap(livePath, originalLiveMapContents, mapName);
            return res.status(500).json({error: 'mapElementsWriteError'});
        }
        publish(req.body, mapName);
        this.backupArchive.writeBackupPair(mapName);
        Logger.info('Map resized.', mapName, liveMap.width+'x'+liveMap.height);
        return res.json({success: true, width: liveMap.width, height: liveMap.height});
    }

    /**
     * @param {string} livePath
     * @param {string} originalLiveMapContents
     * @param {string} mapName
     * @returns {boolean}
     */
    restoreLiveMap(livePath, originalLiveMapContents, mapName)
    {
        if(!originalLiveMapContents){
            Logger.error('Map could not be restored, the original contents are missing.', mapName);
            return false;
        }
        if(!FileHandler.writeFile(livePath, originalLiveMapContents)){
            Logger.error('Map could not be restored after the elements save error.', mapName, FileHandler.error);
            return false;
        }
        Logger.info('Map restored after the elements save error.', mapName);
        return true;
    }

    resolveElements(elementsPath, liveMap)
    {
        let record = FileHandler.fetchFileJson(elementsPath);
        if(record && sc.isArray(record.elements)){
            return record;
        }
        return this.layersLoader.load(liveMap);
    }

    resizeParams(req)
    {
        return {
            anchor: sc.get(req.body, 'anchor', 'center'),
            removeHorizontal: sc.get(req.body, 'removeHorizontal', 0),
            removeVertical: sc.get(req.body, 'removeVertical', 0),
            force: true === sc.get(req.body, 'force', false)
        };
    }

}

module.exports.MapResizePersister = MapResizePersister;
