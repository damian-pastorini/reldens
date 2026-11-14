/**
 *
 * Reldens - Test Prediction Player Engine
 *
 * Tests the client prediction player engine: a direction moves the prediction body before the server answer and a held
 * direction sends its message once, the stop reconciles the prediction body with the server position after the
 * configured time out (1000 by default), the pointer move goes to the validated points after the reconciliation, and
 * the prediction world creator creates nothing with the prediction config off.
 *
 */

const { BaseTest } = require('./base-test');
const { ScheduledTimeouts } = require('./fixtures/scheduled-timeouts');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { PlayerEnginePrediction } = require('../lib/prediction/client/player-engine-prediction');
const { PredictionWorldCreator } = require('../lib/prediction/client/prediction-world-creator');
const { GameConst } = require('../lib/game/constants');

class TestPredictionPlayerEngine extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.predictionTime = 4200;
        this.serverPosition = {state: {x: 320, y: 480, dir: GameConst.LEFT}};
    }

    createEngine(configValues, withPredictionBody)
    {
        let setup = {sentMessages: [], bodyCalls: [], updatedPlayers: []};
        setup.engine = new PlayerEnginePrediction(GameplayPlayerBuilder.createPlayerEngineProps(
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

    async testThePredictionWorldIsNotCreatedWithThePredictionOff()
    {
        await this.test('the prediction world is not created with the prediction config off', async () => {
            let scene = {experimentalClientPrediction: 0, worldPrediction: false};
            await new PredictionWorldCreator().createSceneWorld(scene);
            this.assert.strictEqual(scene.worldPrediction, false);
        });
    }

}

module.exports.TestPredictionPlayerEngine = TestPredictionPlayerEngine;
