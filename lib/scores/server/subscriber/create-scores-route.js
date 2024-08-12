/**
 *
 * Reldens - CreateScoresRoute
 *
 */

const { ScoresProvider } = require('../scores-provider');

class CreateScoresRoute
{

    constructor(props)
    {
        this.scoresProvider = new ScoresProvider(props);
    }

    async execute(event, scoresPath)
    {
        event?.serverManager?.app?.get(scoresPath, async (req, res) => {
            res.json(await this.scoresProvider.fetchTopScoresMappedData());
        });
    }

}

module.exports.CreateScoresRoute = CreateScoresRoute;
