
class PlayersExperiencePerLevelImporter
{

    constructor(serverManager)
    {
        this.serverManager = serverManager;
        this.levelsRepository = this.serverManager.dataServer.getEntity('level');
    }

    async import(data, levelSetId)
    {
        for (let key of Object.keys(data)) {
            await this.levelsRepository.create({
                key,
                label: key,
                required_experience: data[key].exp,
                level_set_id: levelSetId
            });
        }
    }

}

module.exports.PlayersExperiencePerLevelImporter = PlayersExperiencePerLevelImporter;
