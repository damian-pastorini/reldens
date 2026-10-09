/**
 *
 * Reldens - Test Scores Provider
 *
 */

const { BaseTest } = require('./base-test');
const { ScoresProvider } = require('../lib/scores/server/scores-provider');
const { SortedRowsRepository } = require('./fixtures/sorted-rows-repository');

class TestScoresProvider extends BaseTest
{

    createScoresProvider(scoresRepository)
    {
        return new ScoresProvider({
            dataServer: {getEntity: (entityKey) => 'scores' === entityKey ? scoresRepository : {}}
        });
    }

    createScoresRepository()
    {
        return new SortedRowsRepository([
            {player_id: 1001, total_score: 10, related_players: {name: 'TestPlayerList'}},
            {player_id: 1, total_score: 250, related_players: {name: 'ImRoot'}},
            {player_id: 1002, total_score: 40, related_players: {name: 'TestPlayerEdit'}}
        ]);
    }

    async testTheTopScoresAreLoadedByTotalScoreDescending()
    {
        await this.test('the top scores are loaded sorted by the total score descending', async () => {
            let scoresRepository = this.createScoresRepository();
            await this.createScoresProvider(scoresRepository).fetchTopScoresMappedData(100, 1);
            this.assert.deepStrictEqual(
                scoresRepository.loadedQueries,
                [{limit: 100, offset: 0, sortBy: 'total_score', sortDirection: 'DESC'}]
            );
        });
    }

    async testTheHighestScoreIsTheFirstRow()
    {
        await this.test('the first top score is the highest one', async () => {
            let topScores = await this.createScoresProvider(this.createScoresRepository()).fetchTopScoresMappedData(
                100,
                1
            );
            this.assert.deepStrictEqual(topScores, [
                {playerName: 'ImRoot', score: 250},
                {playerName: 'TestPlayerEdit', score: 40},
                {playerName: 'TestPlayerList', score: 10}
            ]);
        });
    }

    async testTheRepositoryStateIsRestored()
    {
        await this.test('the repository pagination and sorting are restored after loading the top scores', async () => {
            let scoresRepository = this.createScoresRepository();
            await this.createScoresProvider(scoresRepository).fetchTopScoresMappedData(100, 2);
            this.assert.deepStrictEqual(
                scoresRepository.preserveEntityState(),
                {limit: 0, offset: 0, sortBy: false, sortDirection: 'ASC'}
            );
        });
    }

}

module.exports.TestScoresProvider = TestScoresProvider;
