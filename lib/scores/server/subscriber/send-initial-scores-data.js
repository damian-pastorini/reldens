/**
 *
 * Reldens - SendInitialScoresData
 *
 * Sends initial scores data to players when they join a room.
 * Includes the player's current score and the top scores leaderboard.
 *
 */

const { ScoresProvider } = require('../scores-provider');
const { ScoresSender } = require('../scores-sender');

/**
 * @typedef {import('../../../rooms/server/scene').RoomScene} RoomScene
 * @typedef {import('@colyseus/core').Client} Client
 * @typedef {import('../../../users/server/player').Player} Player
 * @typedef {import('../scores-provider').ScoresProvider} ScoresProvider
 * @typedef {import('../scores-sender').ScoresSender} ScoresSender
 */
class SendInitialScoresData
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {ScoresProvider} */
        this.scoresProvider = new ScoresProvider(props);
        /** @type {ScoresSender} */
        this.scoresSender = new ScoresSender();
    }

    /**
     * @param {RoomScene} room
     * @param {Client} client
     * @param {Player} playerSchema
     * @returns {Promise<boolean>}
     */
    async execute(room, client, playerSchema)
    {
        let score = await this.scoresProvider.fetchPlayerScore(playerSchema.player_id);
        let scores = await this.scoresProvider.fetchTopScoresMappedData(10);
        await this.scoresSender.sendUpdates(room, playerSchema, (score?.total_score || '0'), scores);
        return true;
    }

}

module.exports.SendInitialScoresData = SendInitialScoresData;
