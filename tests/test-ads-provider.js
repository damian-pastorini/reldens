/**
 *
 * Reldens - Test Ads Provider
 *
 * Tests the client ads filter of a provider (AdsProvider.fetchActiveAdsByProviderId): only the enabled ads of that
 * provider with a valid type are kept, an ad of another provider, a disabled ad and an ad of an invalid type are
 * filtered out, and no provider id or no ads give an empty collection.
 *
 */

const { BaseTest } = require('./base-test');
const { AdsProvider } = require('../lib/ads/client/ads-provider');

class TestAdsProvider extends BaseTest
{

    createAd(providerId, enabled, typeKey)
    {
        return {provider: {id: providerId}, enabled, type: {key: typeKey}};
    }

    async testOnlyTheEnabledAdsOfTheProviderWithAValidTypeAreKept()
    {
        await this.test('only the enabled ads of the provider with a valid type are kept', async () => {
            let availableAds = {
                kept: this.createAd(1, true, 'eventVideo'),
                otherProvider: this.createAd(2, true, 'eventVideo'),
                disabled: this.createAd(1, false, 'eventVideo'),
                invalidType: this.createAd(1, true, 'popup'),
                keptBanner: this.createAd(1, true, 'banner')
            };
            this.assert.deepStrictEqual(
                AdsProvider.fetchActiveAdsByProviderId(1, ['eventVideo', 'banner'], availableAds),
                {kept: availableAds.kept, keptBanner: availableAds.keptBanner}
            );
        });
    }

    async testNoProviderIdOrNoAdsGiveAnEmptyCollection()
    {
        await this.test('no provider id or no available ads give an empty collection', async () => {
            let availableAds = {kept: this.createAd(1, true, 'eventVideo')};
            this.assert.deepStrictEqual(AdsProvider.fetchActiveAdsByProviderId(0, ['eventVideo'], availableAds), {});
            this.assert.deepStrictEqual(AdsProvider.fetchActiveAdsByProviderId(1, ['eventVideo'], {}), {});
        });
    }

}

module.exports.TestAdsProvider = TestAdsProvider;
