/**
 *
 * Reldens - Death Observer Steps
 *
 * The steps of the death specs with a second player (DeathReviveSteps context with the second page): both players of
 * the group enter the forest (the test time grows by a second login and a second kill), the second player gets its own
 * context with its page and its config (Login.fetchSecondPlayerConfig), so the death steps run for it too, and the room
 * session id of a page is read from its active room.
 *
 */

const { test } = require('@playwright/test');
const { Login } = require('./login');
const { TimeConstants } = require('./time-constants');

class DeathObserverSteps
{

    static async loginBothInForest(context)
    {
        test.setTimeout(
            test.info().timeout
            + TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + TimeConstants.ENEMY_KILL
        );
        let secondContext = Object.assign({}, context, {
            page: context.secondPage,
            gameConfig: Login.fetchSecondPlayerConfig(context.gameConfig)
        });
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await Login.loginAndEnterForest(secondContext.page, secondContext.gameConfig, context.longRun);
        return secondContext;
    }

    static async fetchSessionId(page)
    {
        return await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
    }

}

module.exports.DeathObserverSteps = DeathObserverSteps;
