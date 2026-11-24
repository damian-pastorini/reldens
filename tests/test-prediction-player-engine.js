/**
 *
 * Reldens - Test Prediction Player Engine
 *
 * Tests the client prediction player engine: a direction moves the prediction body before the server answer and a held
 * direction sends its message once, the stop reconciles the prediction body with the server position after the
 * configured time out (1000 by default), the pointer move goes to the validated points after the reconciliation, a key
 * held on a pointer move (on the player engine and the prediction one) is superseded, so it is not sent again and its
 * release sends no stop while another key is sent and its release stops, and the prediction world creator creates
 * nothing with the prediction config off; on the WallsWorldBaseTest map the prediction body walking into the column wall
 * by the prediction world timer steps stops beside it and its contact emits the wall begin and the wall end stop events
 * on the scene events manager, while the received player state keeps its server position (the body has its own copy); the prediction world holds the walls of the scene map read from the tilemap cache by the
 * scene roomMap param (or its roomName); and the creator clearSceneWorld (run by the prediction plugin on
 * reldens.changeSceneDestroyPrevious, the plugin loads Phaser and can not run here) clears the prediction world date
 * time and world timer intervals of the scene the player leaves once (only the date time one when the world has no
 * current player, nothing on a scene without the prediction world).
 *
 */

const { WallsWorldBaseTest } = require('./fixtures/walls-world-base-test');
const { ScheduledTimeouts } = require('./fixtures/scheduled-timeouts');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { PlayerEnginePrediction } = require('../lib/prediction/client/player-engine-prediction');
const { PlayerEngine } = require('../lib/users/client/player-engine');
const { PredictionWorldCreator } = require('../lib/prediction/client/prediction-world-creator');
const { GameConst } = require('../lib/game/constants');

class TestPredictionPlayerEngine extends WallsWorldBaseTest
{

    constructor(config)
    {
        super(config);
        this.predictionTime = 4200;
        this.serverPosition = {state: {x: 320, y: 480, dir: GameConst.LEFT}};
        this.horizontalGroupedWallsTiles = [[8], [14], [20], [33, 34]];
    }

    createEngine(configValues, withPredictionBody, engineClass = PlayerEnginePrediction)
    {
        let setup = {sentMessages: [], bodyCalls: [], updatedPlayers: []};
        setup.engine = new engineClass(GameplayPlayerBuilder.createPlayerEngineProps(
            {worldPredictionTimer: {currentTime: this.predictionTime}},
            'journeyman',
            GameplayPlayerBuilder.createConfig(configValues),
            {}
        ));
        setup.engine.roomEvents = {send: (message) => setup.sentMessages.push(message)};
        setup.engine.updatePlayer = (playerId, playerData) => setup.updatedPlayers.push([playerId, playerData]);
        if(withPredictionBody){
            setup.engine.predictionBody = this.createPredictionBody(setup);
        }
        return setup;
    }

    createPredictionBody(setup)
    {
        return {
            position: [100, 100],
            dir: GameConst.DOWN,
            initMove: (direction, isAuto) => setup.bodyCalls.push(['initMove', direction, isAuto]),
            stopFull: () => setup.bodyCalls.push(['stopFull']),
            moveToPoint: (pointData) => setup.bodyCalls.push(['moveToPoint', pointData])
        };
    }

    async testADirectionMovesThePredictionBodyAndIsSentOnce()
    {
        await this.test('a held direction moves the prediction body before the server answer and is sent once', async () => {
            let predicted = this.createEngine({}, true);
            predicted.engine.left();
            predicted.engine.left();
            let plain = this.createEngine({}, false);
            plain.engine.right();
            this.assert.deepStrictEqual(
                [predicted.bodyCalls, predicted.sentMessages, plain.sentMessages],
                [[['initMove', GameConst.LEFT, true]], [{dir: GameConst.LEFT, time: this.predictionTime}], [{dir: GameConst.RIGHT}]]
            );
        });
    }

    async testTheStopReconcilesWithTheServerAfterItsTimeOut()
    {
        await this.test('the stop reconciles the prediction body with the server position after the configured or default time out', async () => {
            let delays = [];
            let reconciled = [];
            for(let configValues of [{}, {'client/players/reconciliation/timeOutMs': 300}]){
                let setup = this.createEngine(configValues, true);
                setup.engine.positionFromServer = this.serverPosition;
                let scheduledTimeouts = new ScheduledTimeouts();
                await scheduledTimeouts.capture(() => setup.engine.stop());
                let beforeTimeOut = [...setup.engine.predictionBody.position];
                delays.push(...scheduledTimeouts.runAll());
                reconciled.push([
                    beforeTimeOut,
                    setup.engine.predictionBody.position,
                    setup.engine.predictionBody.dir,
                    setup.bodyCalls,
                    setup.updatedPlayers.length,
                    setup.sentMessages
                ]);
            }
            let expectedReconciliation = [
                [100, 100],
                [320, 480],
                GameConst.LEFT,
                [['stopFull']],
                1,
                [{act: GameConst.STOP, time: this.predictionTime}]
            ];
            this.assert.deepStrictEqual([delays, reconciled], [[1000, 300], [expectedReconciliation, expectedReconciliation]]);
        });
    }

    async testThePointerMoveGoesToTheValidatedPoints()
    {
        await this.test('the pointer move reconciles and moves the prediction body to the validated points and sends the pointer', async () => {
            let setup = this.createEngine({}, true);
            setup.engine.positionFromServer = this.serverPosition;
            setup.engine.leftOff = 0;
            setup.engine.topOff = 0;
            setup.engine.pointsValidator = {makeValidPoints: (pointData) => Object.assign({}, pointData, {column: 5, valid: true})};
            let scheduledTimeouts = new ScheduledTimeouts();
            await scheduledTimeouts.capture(() => setup.engine.moveToPointer({worldColumn: 99, worldRow: 4, worldX: 160, worldY: 140}));
            let pointerData = {act: GameConst.POINTER, column: 99, row: 4, x: 160, y: 140};
            this.assert.deepStrictEqual(
                [setup.bodyCalls, setup.sentMessages, scheduledTimeouts.scheduledTimeouts.length],
                [[['stopFull'], ['moveToPoint', Object.assign({}, pointerData, {column: 5, valid: true})]], [pointerData], 1]
            );
        });
    }

    async testAKeyHeldOnAPointerMoveIsNotSentAgainAndItsReleaseKeepsThePath()
    {
        await this.test('a key held on a pointer move is not sent again, its release sends no stop, another key does', async () => {
            let results = [];
            for(let engineClass of [PlayerEngine, PlayerEnginePrediction]){
                let setup = this.createEngine({}, false, engineClass);
                Object.assign(setup.engine, {leftOff: 0, topOff: 0});
                setup.engine.down();
                setup.engine.moveToPointer({worldColumn: 9, worldRow: 4, worldX: 160, worldY: 140});
                let heldKeyState = setup.engine.lastKeyState[GameConst.DOWN];
                setup.engine.down();
                setup.engine.up();
                setup.engine.releaseKey(GameConst.DOWN);
                setup.engine.releaseKey(GameConst.UP);
                results.push([heldKeyState, setup.sentMessages]);
            }
            let expected = [GameConst.KEY_STATES.SUPERSEDED, [
                {dir: GameConst.DOWN},
                {act: GameConst.POINTER, column: 9, row: 4, x: 160, y: 140},
                {dir: GameConst.UP},
                {act: GameConst.STOP}
            ]];
            this.assert.deepStrictEqual(results, [expected, expected]);
        });
    }

    async testThePredictionWorldIsNotCreatedWithThePredictionOff()
    {
        await this.test('the prediction world is not created with the prediction config off', async () => {
            let scene = {experimentalClientPrediction: 0, worldPrediction: false};
            await new PredictionWorldCreator().createSceneWorld(scene);
            this.assert.strictEqual(scene.worldPrediction, false);
        });
    }

    createPredictionScene(emittedEvents, currentPlayer, mapKeyParam = 'roomMap')
    {
        let worldOptions = this.createWorldOptions({groupWallsVertically: false, groupWallsHorizontally: true});
        worldOptions.config.client.players.physicalBody = {width: this.walkerSize, height: this.walkerSize};
        return {
            experimentalClientPrediction: 1,
            worldPrediction: false,
            key: worldOptions.sceneName,
            params: {roomId: worldOptions.roomId, [mapKeyParam]: worldOptions.roomMap},
            configManager: worldOptions.config,
            eventsManager: {emit: async (eventName) => emittedEvents.push(eventName)},
            cache: {tilemap: {entries: {entries: {[worldOptions.roomMap]: {data: worldOptions.mapJson}}}}},
            gameManager: {
                activeRoomEvents: {roomData: {worldConfig: worldOptions.worldConfig}},
                getCurrentPlayer: () => currentPlayer
            }
        };
    }

    createPredictedPlayer()
    {
        return {
            playerId: 'predicted',
            state: {x: 16, y: this.walkerRow, dir: GameConst.RIGHT},
            updatePlayer: () => true
        };
    }

    async testThePredictionBodyStopsOnAWallAndEmitsTheWallContact()
    {
        await this.test('the prediction body walking into a wall stops beside it and its contact emits the wall events', async () => {
            let emittedEvents = [];
            let currentPlayer = this.createPredictedPlayer();
            let scene = this.createPredictionScene(emittedEvents, currentPlayer);
            let scheduledTimeouts = new ScheduledTimeouts();
            await scheduledTimeouts.capture(() => new PredictionWorldCreator().createSceneWorld(scene));
            let worldStep = scheduledTimeouts.scheduledIntervals.find(
                interval => scene.worldPredictionTimer.stepTime === interval.delayMs
            );
            currentPlayer.predictionBody.initMove(GameConst.RIGHT, true);
            for(let stepIndex = 0; stepIndex < 50; stepIndex++){
                worldStep.intervalCallback();
            }
            this.assert.deepStrictEqual(
                [
                    Math.round(currentPlayer.predictionBody.position[0]),
                    Math.round(currentPlayer.predictionBody.position[1]),
                    emittedEvents.filter(eventName => -1 !== eventName.indexOf('HitWall')),
                    currentPlayer.state,
                    currentPlayer.predictionBody.bodyState === currentPlayer.state
                ],
                [
                    this.columnWallEdges[0] - this.walkerSize / 2,
                    this.walkerRow,
                    ['reldens.playerHitWallBegin', 'reldens.startPlayerHitWallEnd', 'reldens.endPlayerHitWallEnd'],
                    this.createPredictedPlayer().state,
                    false
                ]
            );
        });
    }

    async testTheSceneChangeClearsThePredictionWorldIntervals()
    {
        await this.test('the scene change clears the prediction world intervals of the scene the player leaves', async () => {
            let creator = new PredictionWorldCreator();
            let results = [];
            let sceneCases = [
                {currentPlayer: this.createPredictedPlayer(), mapKeyParam: 'roomMap'},
                {currentPlayer: this.createPredictedPlayer(), mapKeyParam: 'roomName'},
                {currentPlayer: false, mapKeyParam: 'roomMap'}
            ];
            for(let sceneCase of sceneCases){
                let scene = this.createPredictionScene([], sceneCase.currentPlayer, sceneCase.mapKeyParam);
                let scheduledTimeouts = new ScheduledTimeouts();
                await scheduledTimeouts.capture(() => creator.createSceneWorld(scene));
                let sceneIntervals = [scene.worldPrediction.worldDateTimeInterval, scene.worldPredictionTimer?.worldTimer];
                let wallsTiles = scene.worldPrediction.bodies.filter(body => body.isWall && !body.isWorldWall).map(
                    body => body.tileIndexes
                );
                let cleared = await scheduledTimeouts.capture(
                    () => [creator.clearSceneWorld(scene), creator.clearSceneWorld(scene)]
                );
                results.push([
                    wallsTiles,
                    scheduledTimeouts.scheduledIntervals.map((interval, intervalIndex) => intervalIndex + 1),
                    sceneIntervals,
                    scheduledTimeouts.clearedIntervals,
                    cleared,
                    scene.worldPrediction
                ]);
            }
            let noPredictionTimeouts = new ScheduledTimeouts();
            let noPredictionCleared = await noPredictionTimeouts.capture(
                () => creator.clearSceneWorld({worldPrediction: false})
            );
            this.assert.deepStrictEqual(
                [results, noPredictionTimeouts.clearedIntervals, noPredictionCleared],
                [
                    [
                        [this.horizontalGroupedWallsTiles, [1, 2], [1, 2], [1, 2], [true, false], false],
                        [this.horizontalGroupedWallsTiles, [1, 2], [1, 2], [1, 2], [true, false], false],
                        [this.horizontalGroupedWallsTiles, [1], [1, undefined], [1, undefined], [true, false], false]
                    ],
                    [],
                    false
                ]
            );
        });
    }

}

module.exports.TestPredictionPlayerEngine = TestPredictionPlayerEngine;
