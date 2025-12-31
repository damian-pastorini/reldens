/**
 *
 * Reldens - PlayersExperiencePerLevelImporter
 *
 * Imports player experience requirements per level. Creates level records with experience
 * thresholds required to reach each level within a given level set.
 *
 */

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
    }

    /**
     * @param {Object<string, Object>} data
     * @param {number} levelSetId
     * @returns {Promise<void>}
     */
    async import(data, levelSetId)
    {
        for(let key of Object.keys(data)){
            await this.levelsRepository.create({
                key,
                label: key,
                required_experience: data[key].req,
                level_set_id: levelSetId
            });
        }
    }

}

module.exports.PlayersExperiencePerLevelImporter = PlayersExperiencePerLevelImporter;
