/**
 *
 * Reldens - PlayersExperiencePerLevelImporter
 *
 * Imports player experience requirements per level. Creates level records with experience
 * thresholds required to reach each level within the given level set, or within a new level set when none is given
 * (the npx reldens-import players-experience-per-level command), and returns the level set ID used.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/server/manager').ServerManager} ServerManager
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 */
class PlayersExperiencePerLevelImporter
{

    /**
     * @param {ServerManager} serverManager
     */
    constructor(serverManager)
    {
        /** @type {ServerManager} */
        this.serverManager = serverManager;
        /** @type {BaseDriver} */
        this.levelsRepository = this.serverManager.dataServer.getEntity('skillsLevels');
        /** @type {BaseDriver} */
        this.levelsSetRepository = this.serverManager.dataServer.getEntity('skillsLevelsSet');
    }

    /**
     * @param {Object<string, Object>} data
     * @param {number} [levelSetId]
     * @returns {Promise<number|boolean>}
     */
    async import(data, levelSetId)
    {
        if(!sc.isObject(data)){
            Logger.critical('Invalid experience per level import data.');
            return false;
        }
        let importLevelSetId = levelSetId;
        if(!importLevelSetId){
            let createdLevelSet = await this.levelsSetRepository.create({autoFillRanges: 0});
            importLevelSetId = createdLevelSet?.id;
        }
        if(!importLevelSetId){
            Logger.critical('Level set for the experience per level import could not be created.');
            return false;
        }
        for(let key of Object.keys(data)){
            await this.levelsRepository.create({
                key,
                label: key,
                required_experience: sc.parseNumber(sc.get(data[key], 'req', 0)) || 0,
                level_set_id: importLevelSetId
            });
        }
        return importLevelSetId;
    }

}

module.exports.PlayersExperiencePerLevelImporter = PlayersExperiencePerLevelImporter;
