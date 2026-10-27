/**
 *
 * Reldens - Ad Messages Player
 *
 * Plays an ad in the e2e specs through the same start and end messages the ads providers send (the providers SDKs are
 * never loaded in the tests), after enabling the ad and its provider for the running parallel spec group (the config
 * values are restored by the group reset) and preserving the played ad rows of the player for that ad (restored by the
 * group reset, so no play of one test reaches the next one). The end message is sent after the stored provider
 * minimum duration.
 *
 */

const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { AdsConst } = require('../../../lib/ads/constants');

class AdMessagesPlayer
{

    static PLAY_MARGIN_MS = 1000;

    static async enableAd(gameConfig, e2eGroup, adsKey, playerName)
    {
        let adRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'ads', {key: adsKey})].shift();
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'adsPlayed', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName}),
            ads_id: adRow.id
        });
        let providerRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'adsProviders', {id: adRow.provider_id})]
            .shift();
        let adPath = AdsConst.CONFIG_PATHS.COLLECTION+'/'+adRow.id;
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, adPath+'/enabled', 1);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, adPath+'/provider/enabled', 1);
        return {
            id: adRow.id,
            minimumDurationMs: Number(await E2eSeedAndRestoreApi.fetchConfigValue(
                gameConfig,
                'client/ads/general/providers/'+providerRow.key+'/videoMinimumDuration'
            ))
        };
    }

    static async sendAdMessage(page, enabledAd, act)
    {
        await page.evaluate((message) => window.reldens.activeRoomEvents.send(message), {act, ads_id: enabledAd.id});
    }

    static async playAd(page, enabledAd)
    {
        await AdMessagesPlayer.sendAdMessage(page, enabledAd, AdsConst.ACTIONS.AD_STARTED);
        await page.waitForTimeout(enabledAd.minimumDurationMs + AdMessagesPlayer.PLAY_MARGIN_MS);
        await AdMessagesPlayer.sendAdMessage(page, enabledAd, AdsConst.ACTIONS.AD_ENDED);
    }

}

module.exports.AdMessagesPlayer = AdMessagesPlayer;
