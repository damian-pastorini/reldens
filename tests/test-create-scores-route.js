/**
 *
 * Reldens - Test Create Scores Route
 *
 */

const { BaseTest } = require('./base-test');
const { CreateScoresRoute } = require('../lib/scores/server/subscriber/create-scores-route');
const { SortedRowsRepository } = require('./fixtures/sorted-rows-repository');
const { ScoresConst } = require('../lib/scores/constants');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestCreateScoresRoute extends BaseTest
{

    async requestScoresPage(query, scoresRepository, configValues = {})
    {
        let routes = {};
        let renderedParams = [];
        let createScoresRoute = new CreateScoresRoute({
            themeManager: {
                projectAssetsPath: FileHandler.joinPaths(process.cwd(), 'theme', 'default', 'assets'),
                templateEngine: {render: async (template, params) => renderedParams.push(params)}
            },
            config: {getWithoutLogs: (path, defaultValue) => sc.get(configValues, path, defaultValue)},
            dataServer: {getEntity: (entityKey) => 'scores' === entityKey ? scoresRepository : {}}
        });
        await createScoresRoute.execute(
            {serverManager: {app: {get: (path, handler) => routes[path] = handler}}},
            '/scores'
        );
        await routes['/scores']({query, body: {}}, {send: () => true});
        return renderedParams.shift();
    }

    createScoresRepository()
    {
        return new SortedRowsRepository([
            {player_id: 1, total_score: 250, related_players: {name: 'ImRoot'}},
            {player_id: 1002, total_score: 40, related_players: {name: 'TestPlayerEdit'}}
        ]);
    }

    async testTheRequestedPageIsReadFromTheQuery()
    {
        await this.test('the scores page reads the page number from the query string', async () => {
            let scoresRepository = this.createScoresRepository();
            await this.requestScoresPage({page: '2'}, scoresRepository);
            this.assert.strictEqual(scoresRepository.loadedQueries.shift().offset, 100);
        });
    }

    async testAnInvalidPageFallsBackToTheFirstPage()
    {
        await this.test('a not numeric page loads the first page', async () => {
            let scoresRepository = this.createScoresRepository();
            await this.requestScoresPage({page: 'abc'}, scoresRepository);
            this.assert.strictEqual(scoresRepository.loadedQueries.shift().offset, 0);
        });
    }

    async testAZeroPageFallsBackToTheFirstPage()
    {
        await this.test('a page lower than 1 loads the first page', async () => {
            let scoresRepository = this.createScoresRepository();
            await this.requestScoresPage({page: '0'}, scoresRepository);
            this.assert.strictEqual(scoresRepository.loadedQueries.shift().offset, 0);
        });
    }

    async testTheConfiguredPageSizeLimitsThePage()
    {
        await this.test('the configured page size is the scores query limit', async () => {
            let scoresRepository = this.createScoresRepository();
            await this.requestScoresPage({page: '2'}, scoresRepository, {'server/scores/fullTableView/pageSize': 25});
            this.assert.deepStrictEqual(
                scoresRepository.loadedQueries.shift(),
                {limit: 25, offset: 25, sortBy: 'total_score', sortDirection: 'DESC'}
            );
        });
    }

    async testTheMissingPageSizeUsesTheDefaultPageSize()
    {
        await this.test('a not configured page size uses the default page size', async () => {
            let scoresRepository = this.createScoresRepository();
            await this.requestScoresPage({page: '1'}, scoresRepository);
            this.assert.strictEqual(scoresRepository.loadedQueries.shift().limit, ScoresConst.FULL_TABLE_PAGE_SIZE);
        });
    }

    async testTheCurrentPageIsMarked()
    {
        await this.test('the scores table marks the current page link', async () => {
            let tableParams = await this.requestScoresPage({page: '1'}, this.createScoresRepository());
            this.assert.deepStrictEqual(tableParams.pages, [{pageLabel: 1, pageLink: '/scores/?page=1', isCurrent: true}]);
            this.assert.deepStrictEqual(tableParams.scores, [
                {playerName: 'ImRoot', score: 250},
                {playerName: 'TestPlayerEdit', score: 40}
            ]);
        });
    }

}

module.exports.TestCreateScoresRoute = TestCreateScoresRoute;
