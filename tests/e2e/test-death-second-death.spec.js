/**
 *
 * Reldens - Test Death Second Death
 *
 * Tests a second death of the same player after the first one was resolved (DeathReviveSteps kills it in the forest with
 * a real enemy hit, the second death comes from the other enemy of the same respawn layer, TestCombatDeath): the
 * restoration item choice and the revive ready flag of the first death are reset, so the second death asks again for
 * the item and waits again for the revive; the item consumed by the first death leaves the second one with the town
 * message and no item question; and the resurrection ad watched in the first death is offered and rewarded again in the
 * second one, its single played row of the player (one row per player and ad) ended again by the replay.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathReviveShowcase } = require('./helpers/death-revive-showcase');
const { DeathResurrectionAdSteps } = require('./helpers/death-resurrection-ad-steps');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathSecondDeath
{

    static async killAgain(context)
    {
        test.setTimeout(test.info().timeout + TimeConstants.ENEMY_KILL + TimeConstants.PLAYER_REVIVE);
        await TestCombatDeath.killPlayerAgain(context.page, context.gameConfig, TimeConstants.ENEMY_KILL);
    }

    static async runChoiceResetTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(
            context,
            Object.assign({}, DeathReviveSteps.ASKED_ITEM_CONFIG, DeathReviveSteps.MANUAL_REVIVE_CONFIG),
            2
        );
        await DeathReviveSteps.expectRestorationItemQuestion(context, restorationItemKey);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.restorationItemUseButton);
        await DeathReviveSteps.expectItemReviveMessage(context, restorationItemKey);
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectAliveInForest(context);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
        await TestDeathSecondDeath.killAgain(context);
        await DeathReviveSteps.expectRestorationItemQuestion(context, restorationItemKey);
        await DeathReviveSteps.expectReviveWait(context);
    }

    static async runLastItemConsumedTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(context, {}, 1);
        await DeathReviveSteps.expectRevivedInForest(context, restorationItemKey);
        await TestDeathSecondDeath.killAgain(context);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await expect(
            context.page.locator(Selectors.gameOver.restorationItemUseButton),
            'No item question once the last item was consumed'
        ).toHaveCount(0);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
    }

    static async runAdOfferedAgainTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 0);
        test.setTimeout(test.info().timeout + 2 * adDeath.adTimeout);
        await DeathResurrectionAdSteps.playAdAndExpectRevivedInForest(context, adDeath);
        let firstEndedAt = TestDeathSecondDeath.fetchEndedTimes(
            await DeathResurrectionAdSteps.fetchPlayedAds(context, adDeath.resurrectionAd.id)
        );
        await TestDeathSecondDeath.killAgain(context);
        await DeathResurrectionAdSteps.playAdAndExpectRevivedInForest(context, adDeath);
        let secondEndedAt = TestDeathSecondDeath.fetchEndedTimes(
            await DeathResurrectionAdSteps.fetchPlayedAds(context, adDeath.resurrectionAd.id)
        );
        expect(secondEndedAt, 'The single played ad row of the player is kept for the replay').toHaveLength(1);
        expect(secondEndedAt[0], 'The replay ends the played ad row again').toBeGreaterThan(firstEndedAt[0]);
    }

    static fetchEndedTimes(playedAds)
    {
        return playedAds.map(playedAd => new Date(playedAd.ended_at).getTime());
    }

    static run()
    {
        test.describe('Death Second Death', () => {
            test('second death asks again for the restoration item and waits again for the revive', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathSecondDeath.runChoiceResetTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second death after the last item was consumed shows the town message and no item question', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathSecondDeath.runLastItemConsumedTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('resurrection ad watched in the first death is offered and rewarded again in the second one', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathSecondDeath.runAdOfferedAgainTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestDeathSecondDeath.run();
