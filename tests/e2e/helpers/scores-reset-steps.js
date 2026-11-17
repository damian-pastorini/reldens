/**
 *
 * Reldens - Scores Reset Steps
 *
 * Shared steps of the specs that run the scores reset per period: preserves the scores rows, the scores detail rows
 * and the last period key row (restored by the group reset), enables the reset for the group, and runs the period
 * check on a date with the stored last period key set to the period of a date some days before it.
 *
 */

const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { ScoresPeriodKeyBuilder } = require('../../../lib/scores/server/scores-period-key-builder');
const { ScoresConst } = require('../../../lib/scores/constants');

class ScoresResetSteps
{

    static PREVIOUS_PERIOD_DAYS = 40;
    static DAY_MS = 86400000;

    static async enableReset(gameConfig, e2eGroup)
    {
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'scores', {});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'scoresDetail', {});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'config', {
            scope: ScoresConst.RESET.LAST_PERIOD_KEY.SCOPE,
            path: ScoresConst.RESET.LAST_PERIOD_KEY.PATH
        });
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, ScoresConst.RESET.CONFIG_PATHS.ENABLED, true);
    }

    static async resetFromPreviousPeriod(gameConfig, currentDate)
    {
        let period = await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ScoresConst.RESET.CONFIG_PATHS.PERIOD);
        let previousPeriodMs = ScoresResetSteps.PREVIOUS_PERIOD_DAYS * ScoresResetSteps.DAY_MS;
        let periodKeys = {
            period,
            previousPeriodKey: ScoresPeriodKeyBuilder.build(period, new Date(currentDate.getTime() - previousPeriodMs)),
            currentPeriodKey: ScoresPeriodKeyBuilder.build(period, currentDate)
        };
        periodKeys.checkResult = await GameplayE2eStateApi.runScoresResetCheck(
            gameConfig,
            currentDate.toISOString(),
            periodKeys.previousPeriodKey
        );
        return periodKeys;
    }

}

module.exports.ScoresResetSteps = ScoresResetSteps;
