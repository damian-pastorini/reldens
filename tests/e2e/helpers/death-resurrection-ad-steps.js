/**
 *
 * Reldens - Death Resurrection Ad Steps
 *
 * The resurrection ad steps of the death specs (DeathReviveSteps context): the configured resurrection ad is enabled for
 * the group with its client provider SDK mock (AdMessagesPlayer), the death config and any other given config value is
 * set before the login (the client config is sent on the login, so a client provider value like the video minimum
 * duration reaches the client), the player enters the forest carrying the given restoration items, the provider is
 * ready and the player is killed there; the ad offered in the game over box is played from its button and its reward
 * item revives the player where it died; and the played ad rows of the player for that ad are read.
 *
 */

const { expect } = require('@playwright/test');
const { AdMessagesPlayer } = require('./ad-messages-player');
const { DeathReviveSteps } = require('./death-revive-steps');
const { DeathReviveShowcase } = require('./death-revive-showcase');
const { Selectors } = require('../selectors');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { TimeConstants } = require('./time-constants');
const { ActionsConst } = require('../../../lib/actions/constants');

class DeathResurrectionAdSteps
{

    static CLIENT_VIDEO_DURATION_PATH = AdMessagesPlayer.CLIENT_PROVIDERS_PATH+'/'
        +AdMessagesPlayer.MOCKED_PROVIDER_KEY+'/videoMinimumDuration';

    static async enableResurrectionAd(context)
    {
        return await AdMessagesPlayer.enableAd(
            context.gameConfig,
            context.e2eGroup,
            await E2eSeedAndRestoreApi.fetchConfigValue(
                context.gameConfig,
                ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY
            ),
            context.gameConfig.e2ePlayerName
        );
    }

    static async killWithResurrectionAd(context, configValues, restorationItemsCount)
    {
        let resurrectionAd = await DeathResurrectionAdSteps.enableResurrectionAd(context);
        let restorationItemKey = await DeathReviveSteps.prepareDeath(
            context,
            configValues,
            DeathReviveSteps.LONG_RUN_ASKED_ITEM_TIME_OUT + resurrectionAd.minimumDurationMs + AdMessagesPlayer.PLAY_MARGIN_MS
        );
        if(0 < restorationItemsCount){
            await DeathReviveSteps.seedRestorationItems(context, restorationItemKey, restorationItemsCount);
        }
        let placement = await DeathReviveSteps.enterForest(context, true);
        let adTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, context.longRun);
        await AdMessagesPlayer.waitForProviderReady(context.page, adTimeout);
        await DeathReviveSteps.killPlayerInForest(
            context,
            placement,
            'The player died: the game over box offers the resurrection ad'
        );
        return {resurrectionAd, restorationItemKey, adTimeout};
    }

    static async playAdAndExpectRevivedInForest(context, adDeath)
    {
        await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await expect(
            context.page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR),
            'The resurrection ad must not play before the player asks for it'
        ).toHaveCount(0);
        await expect(context.page.locator(Selectors.gameOver.resurrectionAdButton)).toHaveText(
            DeathReviveSteps.DEATH_SNIPPETS.resurrectionAdButton
        );
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.resurrectionAdButton);
        await DeathReviveShowcase.showStep(context, 'The ad plays: its reward is the '+context.reviveLabels.itemLabel);
        await AdMessagesPlayer.waitForPlayedAd(context.page, adDeath.resurrectionAd, adDeath.adTimeout);
        await DeathReviveShowcase.expectShownItem(context, adDeath.restorationItemKey);
        await DeathReviveShowcase.showStep(
            context,
            'The ad gave the '+context.reviveLabels.itemLabel+': it revives the player where it died'
        );
        await DeathReviveSteps.expectRevivedInForest(context, adDeath.restorationItemKey);
    }

    static async fetchRewardQuantity(context, adDeath)
    {
        return await E2eSeedAndRestoreApi.fetchInventoryQuantity(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            adDeath.restorationItemKey
        );
    }

    static async fetchPlayedAds(context, adId)
    {
        return await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'adsPlayed', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(
                context.gameConfig,
                'players',
                {name: context.gameConfig.e2ePlayerName}
            ),
            ads_id: adId
        });
    }

}

module.exports.DeathResurrectionAdSteps = DeathResurrectionAdSteps;
