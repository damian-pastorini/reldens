/**
 *
 * Reldens - Test Scores Period Reset
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { ScoresPeriodReset } = require('../lib/scores/server/scores-period-reset');
const { ScoresConst } = require('../lib/scores/constants');
const { RoomsConst } = require('../lib/rooms/constants');

class TestScoresPeriodReset extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.resetDate = new Date('2026-10-18T10:00:00Z');
        this.resetPeriodKey = '2026-10-18';
        this.previousPeriodKey = '2026-10-17';
        this.storedPlayerScore = 30;
        this.resetPendingValue = this.resetPeriodKey+ScoresConst.RESET.PENDING_MARK+this.resetDate.getTime();
    }

    createRepositories(lastPeriodValue)
    {
        let repositories = {
            config: {lastPeriodRow: false, storedValues: []},
            scores: {
                rows: [{player_id: 7, total_score: this.storedPlayerScore, related_players: {name: 'player-7'}}],
                deletes: 0
            },
            scoresDetail: {deletes: 0}
        };
        if(false !== lastPeriodValue){
            repositories.config.lastPeriodRow = {id: 390, value: lastPeriodValue};
        }
        repositories.config.loadOne = async () => {
            if(!repositories.config.lastPeriodRow){
                return false;
            }
            return Object.assign({}, repositories.config.lastPeriodRow);
        };
        repositories.config.update = async (filters, data) => {
            let lastPeriodRow = repositories.config.lastPeriodRow;
            if(filters.id !== lastPeriodRow.id || filters.value !== lastPeriodRow.value){
                return 0;
            }
            lastPeriodRow.value = data.value;
            repositories.config.storedValues.push(data.value);
            return 1;
        };
        repositories.scores.delete = async () => {
            repositories.scores.deletes++;
            repositories.scores.rows = [];
            return true;
        };
        repositories.scores.loadOneBy = async (field, value) => repositories.scores.rows.find(
            row => value === row[field]
        ) || false;
        repositories.scores.loadWithRelations = async () => repositories.scores.rows;
        repositories.scores.preserveEntityState = () => ({});
        repositories.scores.restoreEntityState = () => true;
        repositories.scoresDetail.delete = async () => repositories.scoresDetail.deletes++;
        return repositories;
    }

    createSceneRoom()
    {
        let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
        let client = GameplayPlayerBuilder.createClient(playerSchema.sessionId);
        let room = {roomType: RoomsConst.ROOM_TYPE_SCENE, state: {}, broadcasts: [], client};
        room.broadcast = (messageKey, message) => room.broadcasts.push(message);
        room.playersKeysFromState = () => [playerSchema.sessionId, 'disconnected-session'];
        room.getClientById = (sessionId) => sessionId === client.sessionId ? client : false;
        room.playerBySessionIdFromState = () => playerSchema;
        return room;
    }

    createSetup(lastPeriodValue, configValues = {})
    {
        let repositories = this.createRepositories(lastPeriodValue);
        let createdInstances = {
            sceneRoom: this.createSceneRoom(),
            creatingRoom: this.createSceneRoom(),
            gameRoom: {roomType: RoomsConst.ROOM_TYPE_GAME, broadcasts: []}
        };
        createdInstances.creatingRoom.state = false;
        return Object.assign({
            repositories,
            scoresPeriodReset: new ScoresPeriodReset({
                config: GameplayPlayerBuilder.createConfig(Object.assign({
                    [ScoresConst.RESET.CONFIG_PATHS.ENABLED]: true,
                    [ScoresConst.RESET.CONFIG_PATHS.PERIOD]: ScoresConst.RESET.PERIODS.DAILY
                }, configValues)),
                dataServer: {getEntity: (entityName) => repositories[entityName]},
                roomsManager: {createdInstances}
            })
        }, createdInstances);
    }

    expectedScoresMessages(topScores, playerScore)
    {
        return {
            broadcasts: [{act: ScoresConst.ACTIONS.TOP_SCORES_UPDATE, scores: topScores, listener: ScoresConst.KEY}],
            playerMessages: [{act: ScoresConst.ACTIONS.UPDATE, newTotalScore: playerScore, listener: ScoresConst.KEY}]
        };
    }

    async testDisabledOrRunningResetChecksNothing()
    {
        await this.test('a disabled reset or a check while another runs changes nothing', async () => {
            let disabledSetup = this.createSetup(this.previousPeriodKey, {
                [ScoresConst.RESET.CONFIG_PATHS.ENABLED]: false
            });
            this.assert.strictEqual(await disabledSetup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(disabledSetup.repositories.config.lastPeriodRow.value, this.previousPeriodKey);
            let runningSetup = this.createSetup(this.previousPeriodKey);
            runningSetup.scoresPeriodReset.isRunning = true;
            this.assert.strictEqual(await runningSetup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(runningSetup.repositories.scores.deletes, 0);
        });
    }

    async testFirstCheckOnlyStoresThePeriod()
    {
        await this.test('the first check only stores the current period key', async () => {
            let setup = this.createSetup('');
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.deepStrictEqual(checkResult, {periodKey: this.resetPeriodKey, resetScores: false});
            this.assert.deepStrictEqual(setup.repositories.config.storedValues, [this.resetPeriodKey]);
            this.assert.strictEqual(setup.repositories.scores.deletes, 0);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, []);
            this.assert.strictEqual(setup.scoresPeriodReset.observedPeriodKey, this.resetPeriodKey);
        });
    }

    async testFirstObservedPeriodSendsNothing()
    {
        await this.test('the first check of a server in the stored period resets and sends nothing', async () => {
            let setup = this.createSetup(this.resetPeriodKey);
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.deepStrictEqual(setup.repositories.config.storedValues, []);
            this.assert.strictEqual(setup.repositories.scores.deletes, 0);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, []);
            this.assert.strictEqual(setup.scoresPeriodReset.observedPeriodKey, this.resetPeriodKey);
        });
    }

    async testNewPeriodResetsAndSendsTheEmptyScores()
    {
        await this.test('a new period deletes the scores and sends the empty scores to the scene rooms', async () => {
            let setup = this.createSetup(this.previousPeriodKey);
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.deepStrictEqual(checkResult, {periodKey: this.resetPeriodKey, resetScores: true});
            this.assert.deepStrictEqual(
                setup.repositories.config.storedValues,
                [this.resetPendingValue, this.resetPeriodKey]
            );
            this.assert.strictEqual(setup.repositories.scores.deletes, 1);
            this.assert.strictEqual(setup.repositories.scoresDetail.deletes, 0);
            let expectedMessages = this.expectedScoresMessages([], ScoresConst.RESET.DEFAULTS.RESET_SCORE);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, expectedMessages.broadcasts);
            this.assert.deepStrictEqual(setup.sceneRoom.client.sentMessages, expectedMessages.playerMessages);
            this.assert.deepStrictEqual(setup.creatingRoom.broadcasts, []);
            this.assert.deepStrictEqual(setup.gameRoom.broadcasts, []);
            this.assert.strictEqual(setup.scoresPeriodReset.isRunning, false);
        });
    }

    async testResetDetailsAlsoDeletesTheDetails()
    {
        await this.test('the reset with details also deletes the scores details', async () => {
            let setup = this.createSetup(this.previousPeriodKey, {
                [ScoresConst.RESET.CONFIG_PATHS.RESET_DETAILS]: true
            });
            await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.strictEqual(setup.repositories.scores.deletes, 1);
            this.assert.strictEqual(setup.repositories.scoresDetail.deletes, 1);
        });
    }

    async testPeriodClaimedByAnotherServerResetsNothing()
    {
        await this.test('a period claimed by another server after the read resets nothing', async () => {
            let setup = this.createSetup(this.previousPeriodKey);
            let loadOne = setup.repositories.config.loadOne;
            setup.repositories.config.loadOne = async () => {
                let loadedRow = await loadOne();
                setup.repositories.config.lastPeriodRow.value = this.resetPeriodKey;
                return loadedRow;
            };
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(setup.repositories.scores.deletes, 0);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, []);
            this.assert.strictEqual(setup.scoresPeriodReset.observedPeriodKey, this.previousPeriodKey);
        });
    }

    async testOtherServerResetSendsTheStoredScores()
    {
        await this.test('another server reset makes this server send the stored scores', async () => {
            let setup = this.createSetup(this.previousPeriodKey);
            let previousDate = new Date('2026-10-17T22:00:00Z');
            this.assert.strictEqual(await setup.scoresPeriodReset.check(previousDate), false);
            setup.repositories.config.lastPeriodRow.value = this.resetPeriodKey;
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.deepStrictEqual(
                checkResult,
                {periodKey: this.resetPeriodKey, resetScores: false, refreshedScores: true}
            );
            this.assert.strictEqual(setup.repositories.scores.deletes, 0);
            let expectedMessages = this.expectedScoresMessages(
                [{playerName: 'player-7', score: this.storedPlayerScore}],
                this.storedPlayerScore
            );
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, expectedMessages.broadcasts);
            this.assert.deepStrictEqual(setup.sceneRoom.client.sentMessages, expectedMessages.playerMessages);
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(setup.sceneRoom.broadcasts.length, 1);
        });
    }

    async testResetInProgressWaitsAndRefreshesAfterIt()
    {
        await this.test('a reset in progress on another server is waited and then sent', async () => {
            let inProgressValue = this.resetPeriodKey+ScoresConst.RESET.PENDING_MARK+(this.resetDate.getTime() - 1000);
            let setup = this.createSetup(inProgressValue);
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(setup.repositories.scores.deletes, 0);
            this.assert.deepStrictEqual(setup.repositories.config.storedValues, []);
            setup.repositories.config.lastPeriodRow.value = this.resetPeriodKey;
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.strictEqual(checkResult.refreshedScores, true);
            this.assert.strictEqual(setup.sceneRoom.broadcasts.length, 1);
        });
    }

    async testStalePendingResetIsCompleted()
    {
        await this.test('a pending reset older than the pending timeout is completed by the next check', async () => {
            let staleClaimTime = this.resetDate.getTime() - ScoresConst.RESET.DEFAULTS.PENDING_TIMEOUT_MS;
            let setup = this.createSetup(this.resetPeriodKey+ScoresConst.RESET.PENDING_MARK+staleClaimTime);
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.deepStrictEqual(checkResult, {periodKey: this.resetPeriodKey, resetScores: true});
            this.assert.strictEqual(setup.repositories.scores.deletes, 1);
            this.assert.strictEqual(setup.repositories.config.lastPeriodRow.value, this.resetPeriodKey);
        });
    }

    async testFailedResetKeepsThePendingStateAndIsRetried()
    {
        await this.test('a failed reset keeps its pending state and is retried after the pending timeout', async () => {
            let setup = this.createSetup(this.previousPeriodKey);
            let deleteScores = setup.repositories.scores.delete;
            setup.repositories.scores.delete = async () => {
                throw new TypeError('Scores storage not available.');
            };
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(setup.scoresPeriodReset.isRunning, false);
            this.assert.strictEqual(setup.repositories.config.lastPeriodRow.value, this.resetPendingValue);
            setup.repositories.scores.delete = deleteScores;
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(setup.repositories.scores.deletes, 0);
            let retryDate = new Date(this.resetDate.getTime() + ScoresConst.RESET.DEFAULTS.PENDING_TIMEOUT_MS);
            let retryResult = await setup.scoresPeriodReset.check(retryDate);
            this.assert.deepStrictEqual(retryResult, {periodKey: this.resetPeriodKey, resetScores: true});
            this.assert.strictEqual(setup.repositories.scores.deletes, 1);
            this.assert.strictEqual(setup.repositories.config.lastPeriodRow.value, this.resetPeriodKey);
        });
    }

    async testResetTakenOverBeforeItsEndSendsAfterTheOtherServer()
    {
        await this.test('a reset taken over before its end is sent once the other server ends it', async () => {
            let setup = this.createSetup(this.previousPeriodKey);
            let deleteScores = setup.repositories.scores.delete;
            setup.repositories.scores.delete = async () => {
                setup.repositories.config.lastPeriodRow.value = this.resetPeriodKey+ScoresConst.RESET.PENDING_MARK+'1';
                return await deleteScores();
            };
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, []);
            setup.repositories.config.lastPeriodRow.value = this.resetPeriodKey;
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.strictEqual(checkResult.refreshedScores, true);
            let expectedMessages = this.expectedScoresMessages([], ScoresConst.RESET.DEFAULTS.RESET_SCORE);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, expectedMessages.broadcasts);
        });
    }

    async testMissingRowOrPeriodResetsNothing()
    {
        await this.test('a missing period key row or an unknown period resets nothing', async () => {
            let missingRowSetup = this.createSetup(false);
            this.assert.strictEqual(await missingRowSetup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(missingRowSetup.repositories.scores.deletes, 0);
            let yearlyPeriod = {[ScoresConst.RESET.CONFIG_PATHS.PERIOD]: 'yearly'};
            let unknownPeriodSetup = this.createSetup(this.previousPeriodKey, yearlyPeriod);
            this.assert.strictEqual(await unknownPeriodSetup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(unknownPeriodSetup.repositories.config.lastPeriodRow.value, this.previousPeriodKey);
        });
    }

    async testStartAndStopTheCheckInterval()
    {
        await this.test('the check interval starts once and its stop clears it', async () => {
            let setup = this.createSetup(this.previousPeriodKey);
            this.assert.strictEqual(setup.scoresPeriodReset.start(), true);
            let firstInterval = setup.scoresPeriodReset.checkInterval;
            this.assert.strictEqual(setup.scoresPeriodReset.start(), true);
            this.assert.notStrictEqual(setup.scoresPeriodReset.checkInterval, firstInterval);
            this.assert.strictEqual(setup.scoresPeriodReset.stop(), true);
            this.assert.strictEqual(setup.scoresPeriodReset.checkInterval, false);
            this.assert.strictEqual(setup.scoresPeriodReset.stop(), false);
        });
    }

}

module.exports.TestScoresPeriodReset = TestScoresPeriodReset;
