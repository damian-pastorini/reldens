/**
 *
 * Reldens - Ad Messages Player
 *
 * Plays the ads in the e2e specs through the real client ads provider flow: it enables the ad, its CrazyGames provider
 * and the provider SDK for the running parallel spec group (the config values are restored by the group reset), with
 * the provider "sdkUrl" pointing to the SDK mock served by the e2e server (E2eAssetsEndpoints). The client config is
 * sent on the login, so the ad is enabled before the player logs in; the client then loads the mock and plays the ad
 * when the ad event fires: the mock shows an advertisement overlay for the provider video minimum duration and the
 * client provider sends the same start and end (or failed) messages the real SDK callbacks send. The played ad rows of
 * the player for that ad are preserved (restored by the group reset, so no play of one test reaches the next one).
 *
 */

const { expect } = require('@playwright/test');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { E2eAssetsEndpoints } = require('./e2e-assets-endpoints');
const { AdsConst } = require('../../../lib/ads/constants');

class AdMessagesPlayer
{

    static MOCKED_PROVIDER_KEY = 'crazyGames';
    static CLIENT_COLLECTION_PATH = 'client/ads/collection';
    static CLIENT_PROVIDERS_PATH = 'client/ads/general/providers';
    static AD_OVERLAY_SELECTOR = '.crazy-games-sdk-mock-ad';
    static PLAY_MARGIN_MS = 2000;

    static async enableAd(gameConfig, e2eGroup, adsKey, playerName)
    {
        let adRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'ads', {key: adsKey})].shift();
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'adsPlayed', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName}),
            ads_id: adRow.id
        });
        let providerRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'adsProviders', {id: adRow.provider_id})]
            .shift();
        expect(providerRow.key, 'The e2e SDK mock plays the ads of its provider').toBe(
            AdMessagesPlayer.MOCKED_PROVIDER_KEY
        );
        let providerPath = AdMessagesPlayer.CLIENT_PROVIDERS_PATH+'/'+providerRow.key;
        let configOverrides = {
            [AdsConst.CONFIG_PATHS.COLLECTION+'/'+adRow.id+'/enabled']: 1,
            [AdsConst.CONFIG_PATHS.COLLECTION+'/'+adRow.id+'/provider/enabled']: 1,
            [AdMessagesPlayer.CLIENT_COLLECTION_PATH+'/'+adRow.id+'/enabled']: 1,
            [providerPath+'/enabled']: 1,
            [providerPath+'/sdkUrl']: E2eAssetsEndpoints.ASSETS_PATH+E2eAssetsEndpoints.SDK_MOCK_FILE
        };
        await AdMessagesPlayer.overrideConfigs(gameConfig, e2eGroup, configOverrides);
        return {
            id: adRow.id,
            minimumDurationMs: Number(await E2eSeedAndRestoreApi.fetchConfigValue(
                gameConfig,
                providerPath+'/videoMinimumDuration'
            ))
        };
    }

    static async waitForProviderReady(page, timeout)
    {
        await page.waitForFunction(
            (providerKey) => Boolean(
                window.reldens.getFeature('ads')?.activeProviders?.[providerKey]?.service?.videosHandler?.sdk
            ),
            AdMessagesPlayer.MOCKED_PROVIDER_KEY,
            {timeout}
        );
    }

    static async failNextAd(page, timeout)
    {
        await AdMessagesPlayer.waitForProviderReady(page, timeout);
        await page.evaluate(() => {
            window.CrazyGames.SDK.failNextAd = true;
        });
    }

    static async overrideConfigs(gameConfig, e2eGroup, configOverrides)
    {
        for(let configPath of Object.keys(configOverrides)){
            await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, configPath, configOverrides[configPath]);
        }
    }

    static async waitForPlayedAd(page, enabledAd, timeout)
    {
        let adOverlay = page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR);
        await expect(adOverlay, 'The client provider must play the ad').toBeVisible({timeout});
        await expect(adOverlay, 'The played ad must end after its minimum duration').toBeHidden({
            timeout: enabledAd.minimumDurationMs + AdMessagesPlayer.PLAY_MARGIN_MS
        });
    }

}

module.exports.AdMessagesPlayer = AdMessagesPlayer;
