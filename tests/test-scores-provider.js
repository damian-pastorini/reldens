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

    async testOverlappingRequestsKeepTheirOwnPage()
    {
        await this.test('overlapping top scores requests load their own page and leave the repository state clean', async () => {
            let scoresRepository = this.createScoresRepository();
            let scoresProvider = this.createScoresProvider(scoresRepository);
            await Promise.all([
                scoresProvider.fetchTopScoresMappedData(100, 2),
                scoresProvider.fetchTopScoresMappedData(100, 1)
            ]);
            this.assert.deepStrictEqual(scoresRepository.loadedQueries, [
                {limit: 100, offset: 100, sortBy: 'total_score', sortDirection: 'DESC'},
                {limit: 100, offset: 0, sortBy: 'total_score', sortDirection: 'DESC'}
            ]);
            this.assert.deepStrictEqual(
                scoresRepository.preserveEntityState(),
                {limit: 0, offset: 0, sortBy: false, sortDirection: 'ASC'}
            );
        });
    }

    async testTheTiedScoresAreOrderedById()
    {
        await this.test('the scores with the same total are ordered by id, so every player is listed on one page', async () => {
            let scoresRepository = new SortedRowsRepository([
                {id: 1, player_id: 1, total_score: 250, related_players: {name: 'ImRoot'}},
                {id: 2, player_id: 1001, total_score: 40, related_players: {name: 'TestPlayerList'}},
                {id: 3, player_id: 1002, total_score: 40, related_players: {name: 'TestPlayerEdit'}},
                {id: 4, player_id: 1003, total_score: 40, related_players: {name: 'ImRoot3'}},
                {id: 5, player_id: 1004, total_score: 10, related_players: {name: 'ImRoot2'}}
            ], true);
            let scoresProvider = this.createScoresProvider(scoresRepository);
            let pagesNames = [];
            for(let page of [1, 2, 3, 4]){
                pagesNames.push((await scoresProvider.fetchTopScoresMappedData(2, page)).map((score) => score.playerName));
            }
            this.assert.deepStrictEqual(
                pagesNames,
                [['ImRoot', 'TestPlayerList'], ['TestPlayerEdit', 'ImRoot3'], ['ImRoot2'], []]
            );
            let topScoresNames = (await scoresProvider.fetchTopScoresMappedData(2)).map((score) => score.playerName);
            this.assert.deepStrictEqual(topScoresNames, ['ImRoot', 'TestPlayerList'], 'The top scores cut');
            let allScoresNames = (await scoresProvider.fetchTopScoresMappedData(5, 1)).map((score) => score.playerName);
            this.assert.deepStrictEqual(
                allScoresNames,
                ['ImRoot', 'TestPlayerList', 'TestPlayerEdit', 'ImRoot3', 'ImRoot2'],
                'The tied scores inside a page'
            );
            this.assert.deepStrictEqual(
                scoresRepository.preserveEntityState(),
                {limit: 0, offset: 0, sortBy: false, sortDirection: 'ASC'}
            );
        });
    }

}

module.exports.TestScoresProvider = TestScoresProvider;
