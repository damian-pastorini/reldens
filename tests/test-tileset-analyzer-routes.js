/**
 *
 * Reldens - Test Tileset Analyzer Routes
 *
 * Tests the tileset analyzer routes the admin TilesetAnalyzerSubscriber registers (without any AI provider), on a
 * sessions folder in test-results: the sessions list shows every session output and input file, a session deleted
 * with its id loses its output and input folders and leaves the list while the parent folder id is refused; and the
 * session wizard config the maps wizard reads answers the generator data built from the session map generator config,
 * the saved strategy with its saved values updated from that config, strips every character that is not a letter, a
 * number or a dash from the id, and refuses a missing id, an unknown session, an empty config and an invalid config.
 *
 */

const { BaseTest } = require('./base-test');
const { GlobalFetchStub } = require('./fixtures/global-fetch-stub');
const { JsonResponseRecorder } = require('./fixtures/json-response-recorder');
const { TilesetAnalyzerSubscriber } = require('../lib/admin/server/subscribers/tileset-analyzer-subscriber');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestTilesetAnalyzerRoutes extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.generateDataPath = FileHandler.joinPaths(process.cwd(), 'test-results', 'tileset-analyzer-routes');
        this.sessionsPath = FileHandler.joinPaths(this.generateDataPath, 'tileset-sessions');
        this.wizardConfigPath = '/tileset-analyzer/api/session-wizard-config';
        this.multipleStrategy = 'multiple-by-loader';
        this.generatorConfig = {
            generatorType: this.multipleStrategy,
            compositeElementsFile: 'composite.json',
            mapsInformation: [{mapName: 'town'}, {mapName: 'forest'}]
        };
    }

    async createRoutes()
    {
        FileHandler.remove(this.generateDataPath);
        let routes = {};
        let recordRoute = (path, ...handlers) => routes[path] = handlers[handlers.length - 1];
        let adminManager = {
            events: {on: () => true},
            router: {isAuthenticated: (req, res, next) => next(), adminRouter: {use: () => true, get: recordRoute}},
            contentsBuilder: {render: async () => '', renderRoute: async () => ''},
            applicationFramework: {
                static: () => () => true,
                Router: () => ({get: recordRoute, delete: recordRoute, post: () => true})
            }
        };
        let subscriber = new TilesetAnalyzerSubscriber(
            adminManager,
            {getWithoutLogs: () => ({})},
            {projectGenerateDataPath: this.generateDataPath}
        );
        await GlobalFetchStub.withFetch(async () => ({ok: false}), async () => await subscriber.setupRoutes(adminManager));
        return routes;
    }

    writeSessionFile(folderName, sessionId, fileName, content)
    {
        let sessionPath = FileHandler.joinPaths(this.sessionsPath, folderName, sessionId);
        FileHandler.createFolder(sessionPath);
        FileHandler.writeFile(FileHandler.joinPaths(sessionPath, fileName), content);
    }

    callRoute(route, request)
    {
        let recordedValues = [];
        route(request, new JsonResponseRecorder().create(recordedValues));
        return recordedValues;
    }

    async testADeletedSessionLosesItsFilesAndLeavesTheList()
    {
        await this.test('a session deleted with its id loses its files and leaves the list, the parent folder id is refused', async () => {
            let routes = await this.createRoutes();
            this.writeSessionFile('output', 's-delete', 'composite.json', '{}');
            this.writeSessionFile('input', 's-delete', 'tileset.png', 'image');
            this.writeSessionFile('output', 's-keep', 'composite.json', '{}');
            let [listed] = this.callRoute(routes['/sessions'], {});
            this.assert.deepStrictEqual(listed.sessions, [
                {sessionId: 's-keep', files: [{name: 'composite.json', downloadUrl: 'output/s-keep/composite.json', type: 'output'}]},
                {sessionId: 's-delete', files: [
                    {name: 'composite.json', downloadUrl: 'output/s-delete/composite.json', type: 'output'},
                    {name: 'tileset.png', downloadUrl: 'tileset-image/s-delete/tileset.png', type: 'input'}
                ]}
            ]);
            let deleteRoute = routes['/sessions/:sessionId'];
            this.assert.deepStrictEqual(
                [
                    this.callRoute(deleteRoute, {params: {sessionId: '..'}}),
                    this.callRoute(deleteRoute, {params: {sessionId: 's-delete'}})
                ],
                [[400, {success: false}], [{success: true}]]
            );
            let [listedAfter] = this.callRoute(routes['/sessions'], {});
            this.assert.deepStrictEqual(
                [
                    listedAfter.sessions.map(session => session.sessionId),
                    FileHandler.exists(FileHandler.joinPaths(this.sessionsPath, 'output', 's-delete')),
                    FileHandler.exists(FileHandler.joinPaths(this.sessionsPath, 'input', 's-delete'))
                ],
                [['s-keep'], false, false]
            );
            FileHandler.remove(this.generateDataPath);
        });
    }

    async testTheSessionWizardConfigIsBuiltFromTheSessionConfig()
    {
        await this.test('the session wizard config answers the generator data and the saved strategy and refuses bad sessions', async () => {
            let routes = await this.createRoutes();
            let configFileName = 'map-generator-config.json';
            this.writeSessionFile('output', 's-plain', configFileName, sc.toJsonString(this.generatorConfig));
            this.writeSessionFile('output', 's-saved', configFileName, sc.toJsonString(Object.assign({
                savedWizardConfig: {
                    currentStrategy: this.multipleStrategy,
                    strategies: {[this.multipleStrategy]: sc.toJsonString({mapNames: ['old-map'], margin: 2})}
                }
            }, this.generatorConfig)));
            this.writeSessionFile('output', 's-empty', configFileName, '');
            this.writeSessionFile('output', 's-invalid', configFileName, 'not a json config');
            let wizardRoute = routes[this.wizardConfigPath];
            let [plainConfig] = this.callRoute(wizardRoute, {query: {sessionId: 's-plain'}});
            let [savedConfig] = this.callRoute(wizardRoute, {query: {sessionId: 's-saved'}});
            let expectedSavedData = {mapNames: ['town', 'forest'], margin: 2, compositeElementsFile: 'composite.json'};
            this.assert.deepStrictEqual(plainConfig, {strategy: this.multipleStrategy, partialData: {
                compositeElementsFile: 'composite.json',
                automaticallyExtrudeMaps: 1,
                mapNames: ['town', 'forest']
            }});
            this.assert.deepStrictEqual(
                [savedConfig.strategy, savedConfig.partialData, sc.toJson(savedConfig.savedStrategies[this.multipleStrategy])],
                [this.multipleStrategy, expectedSavedData, expectedSavedData]
            );
            this.assert.deepStrictEqual(
                [
                    this.callRoute(wizardRoute, {query: {sessionId: '..s-plain'}}),
                    this.callRoute(wizardRoute, {query: {}}),
                    this.callRoute(wizardRoute, {query: {sessionId: 's-unknown'}}),
                    this.callRoute(wizardRoute, {query: {sessionId: 's-empty'}}),
                    this.callRoute(wizardRoute, {query: {sessionId: 's-invalid'}})
                ],
                [
                    [plainConfig],
                    [400, {error: 'Missing sessionId'}],
                    [404, {error: 'Config not found'}],
                    [500, {error: 'Failed to read config'}],
                    [500, {error: 'Invalid config'}]
                ]
            );
            FileHandler.remove(this.generateDataPath);
        });
    }

}

module.exports.TestTilesetAnalyzerRoutes = TestTilesetAnalyzerRoutes;
