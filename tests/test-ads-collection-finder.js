/**
 *
 * Reldens - Test Ads Collection Finder
 *
 */

const { BaseTest } = require('./base-test');
const { AdsCollectionFinder } = require('../lib/ads/server/ads-collection-finder');
const { BaseAd } = require('../lib/ads/server/ads-type/base-ad');
const { AdsConst } = require('../lib/ads/constants');

class TestAdsCollectionFinder extends BaseTest
{

    constructor(config)
    {
        super(config);
        let enabledProvider = {id: 1, key: 'crazyGames', enabled: 1};
        let resurrectionAd = BaseAd.fromModel({
            id: 7,
            key: 'resurrection-video',
            replay: 1,
            enabled: 1,
            related_ads_providers: enabledProvider
        });
        let skinAd = BaseAd.fromModel({
            id: 8,
            key: 'skin-ad-ticket',
            replay: 1,
            enabled: 1,
            related_ads_providers: enabledProvider
        });
        let disabledAd = BaseAd.fromModel({
            id: 5,
            key: 'crazy-games-sample-video',
            replay: 1,
            enabled: 0,
            related_ads_providers: enabledProvider
        });
        let disabledProviderAd = BaseAd.fromModel({
            id: 6,
            key: 'game-monetize-sample-video',
            replay: 1,
            enabled: 1,
            related_ads_providers: {id: 2, key: 'gameMonetize', enabled: 0}
        });
        this.adsCollection = {
            [resurrectionAd.id]: resurrectionAd,
            [skinAd.id]: skinAd,
            [disabledAd.id]: disabledAd,
            [disabledProviderAd.id]: disabledProviderAd
        };
        this.adsConfig = {
            getWithoutLogs: (path, defaultValue) => 'server/ads/collection' === path ? this.adsCollection : defaultValue
        };
    }

    async testAdIsFoundByItsKey()
    {
        await this.test('the ad of the collection is found by its key', async () => {
            this.assert.strictEqual(AdsCollectionFinder.findByKey(this.adsConfig, 'skin-ad-ticket').id, 8);
        });
    }

    async testMissingKeyFindsNothing()
    {
        await this.test('an empty or unknown ad key finds nothing', async () => {
            this.assert.strictEqual(AdsCollectionFinder.findByKey(this.adsConfig, ''), false);
            this.assert.strictEqual(AdsCollectionFinder.findByKey(this.adsConfig, 'missing-ad'), false);
        });
    }

    async testDisabledAdsAreNotFound()
    {
        await this.test('a disabled ad or an ad of a disabled provider is not found by key nor by ID', async () => {
            this.assert.strictEqual(AdsCollectionFinder.findByKey(this.adsConfig, 'crazy-games-sample-video'), false);
            this.assert.strictEqual(AdsCollectionFinder.findByKey(this.adsConfig, 'game-monetize-sample-video'), false);
            this.assert.strictEqual(AdsCollectionFinder.findById(this.adsConfig, 5), false);
            this.assert.strictEqual(AdsCollectionFinder.findById(this.adsConfig, 6), false);
        });
    }

    async testEnabledAdIsFoundByItsId()
    {
        await this.test('an enabled ad is found by the ID the messages carry', async () => {
            this.assert.strictEqual(AdsCollectionFinder.findById(this.adsConfig, '7').key, 'resurrection-video');
            this.assert.strictEqual(AdsCollectionFinder.findById(this.adsConfig, 99), false);
            this.assert.strictEqual(AdsCollectionFinder.findById(this.adsConfig, '__proto__'), false);
        });
    }

    async testMessageIsMatchedByTheAdId()
    {
        await this.test('a message is for the ad when it carries the ID of the ad found by key', async () => {
            let config = this.adsConfig;
            let startedMessage = {act: AdsConst.ACTIONS.AD_STARTED, ads_id: '7'};
            this.assert.strictEqual(AdsCollectionFinder.isMessageForAd(config, 'resurrection-video', startedMessage), true);
            this.assert.strictEqual(AdsCollectionFinder.isMessageForAd(config, 'skin-ad-ticket', startedMessage), false);
            this.assert.strictEqual(AdsCollectionFinder.isMessageForAd(config, 'missing-ad', startedMessage), false);
        });
    }

}

module.exports.TestAdsCollectionFinder = TestAdsCollectionFinder;
