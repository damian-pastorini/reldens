/**
 *
 * Reldens - Test Create Scores Route
 *
 */

const { BaseTest } = require('./base-test');
const { CreateScoresRoute } = require('../lib/scores/server/subscriber/create-scores-route');
const { ScoresPlugin } = require('../lib/scores/server/plugin');
const { SortedRowsRepository } = require('./fixtures/sorted-rows-repository');
const { ScoresConst } = require('../lib/scores/constants');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestCreateScoresRoute extends BaseTest
{

    async requestScoresPage(query, scoresRepository, configValues = {}, scoresPath = '/scores')
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
            scoresPath
        );
        await routes[scoresPath]({query, body: {}}, {send: () => true});
        return renderedParams.shift();
    }

    async testACustomScoresPathIsTheRouteAndTheLinksPath()
    {
        await this.test('a custom scores path is the route path and the pages links path', async () => {
            let tableParams = await this.requestScoresPage({page: '1'}, this.createScoresRepository(), {}, '/e2e-scores');
            this.assert.deepStrictEqual(tableParams.pages, [{pageLabel: 1, pageLink: '/e2e-scores/?page=1', isCurrent: true}]);
        });
    }

    async testAScoreWithNoPlayerIsListedWithNoName()
    {
        await this.test('a score whose player no longer exists is listed with no name', async () => {
            let tableParams = await this.requestScoresPage({page: '1'}, new SortedRowsRepository([{player_id: 99, total_score: 10}]));
            this.assert.strictEqual(tableParams.scores.length, 1);
            this.assert.strictEqual(Boolean(tableParams.scores[0].playerName), false);
            this.assert.strictEqual(tableParams.scores[0].score, 10);
        });
    }

    async testTheFullTableViewDisabledRegistersNoRoute()
    {
        await this.test('the full table view disabled registers no scores route and enabled registers it', async () => {
            for(let isEnabled of [false, true]){
                let listenedEvents = [];
                let configValues = {'server/scores/fullTableView/enabled': isEnabled};
                await new ScoresPlugin().setup({
                    events: {on: (eventName) => listenedEvents.push(eventName)},
                    config: {getWithoutLogs: (path, defaultValue) => sc.get(configValues, path, defaultValue)},
                    dataServer: {getEntity: () => ({})}
                });
                this.assert.strictEqual(listenedEvents.includes('reldens.serverBeforeListen'), isEnabled);
            }
        });
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

    async testAMissingPageLoadsTheFirstPage()
    {
        await this.test('a request without page loads the first page', async () => {
            let scoresRepository = this.createScoresRepository();
            await this.requestScoresPage({}, scoresRepository);
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

    async testTheInvalidPagesShowTheFirstPageMarked()
    {
        await this.test('a decimal, negative, zero, not numeric or repeated page shows the first page marked', async () => {
            for(let page of ['1.5', '-1', '0', 'abc', ['1', '2']]){
                let scoresRepository = this.createScoresRepository();
                let tableParams = await this.requestScoresPage(
                    {page},
                    scoresRepository,
                    {'server/scores/fullTableView/pageSize': 1}
                );
                this.assert.strictEqual(scoresRepository.loadedQueries.shift().offset, 0, 'The offset of '+page);
                this.assert.deepStrictEqual(tableParams.pages, [
                    {pageLabel: 1, pageLink: '/scores/?page=1', isCurrent: true},
                    {pageLabel: 2, pageLink: '/scores/?page=2', isCurrent: false}
                ], 'The pages of '+page);
                this.assert.deepStrictEqual(tableParams.scores, [{playerName: 'ImRoot', score: 250}], 'Rows of '+page);
            }
        });
    }

    async testAnInvalidPageSizeUsesTheDefaultPageSize()
    {
        await this.test('a zero, negative, decimal or not numeric page size uses the default page size', async () => {
            for(let pageSize of [0, -1, 1.5, 'abc']){
                let scoresRepository = this.createScoresRepository();
                let tableParams = await this.requestScoresPage(
                    {page: '1'},
                    scoresRepository,
                    {'server/scores/fullTableView/pageSize': pageSize}
                );
                this.assert.strictEqual(
                    scoresRepository.loadedQueries.shift().limit,
                    ScoresConst.FULL_TABLE_PAGE_SIZE,
                    'The limit of '+pageSize
                );
                this.assert.deepStrictEqual(
                    tableParams.pages,
                    [{pageLabel: 1, pageLink: '/scores/?page=1', isCurrent: true}],
                    'One page for '+pageSize
                );
            }
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
