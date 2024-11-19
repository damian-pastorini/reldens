/**
 *
 * Reldens - SendInitialScoresData
 *
 */

const { ScoresProvider } = require('../scores-provider');
const { ScoresSender } = require('../scores-sender');

class SendInitialScoresData
{

    constructor(props)
    {
        this.scoresProvider = new ScoresProvider(props);
        this.scoresSender = new ScoresSender();
    }

    async execute(room, client, playerSchema)
    {
        let score = await this.scoresProvider.fetchPlayerScore(playerSchema.player_id);
        let scores = await this.scoresProvider.fetchTopScoresMappedData(10);
        await this.scoresSender.sendUpdates(room, playerSchema, (score?.total_score || '0'), scores);
        return true;
    }

}

module.exports.SendInitialScoresData = SendInitialScoresData;
