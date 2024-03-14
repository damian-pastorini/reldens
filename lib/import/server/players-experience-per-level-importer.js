
class PlayersExperiencePerLevelImporter
{

    constructor(serverManager)
    {
        this.serverManager = serverManager;
    }

    import(data, levelSetId)
    {
        for (let key of data) {
            let levelsRepository = this.serverManager.dataServer.getEntity('levels');
            levelsRepository.create({
                key,
                label: key,
                required_experience: data.exp,
                levels_set_id: levelSetId
            });
        }
    }

}

module.exports.PlayersExperiencePerLevelImporter = PlayersExperiencePerLevelImporter;
