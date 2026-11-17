/**
 *
 * Reldens - Test Ads Message Actions Config
 *
 */

const { BaseTest } = require('./base-test');
const { AdsRewardClaimsBuilder } = require('./fixtures/ads-reward-claims-builder');
const { AdsConst } = require('../lib/ads/constants');
const { GameConst } = require('../lib/game/constants');

class TestAdsMessageActionsConfig extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.adsBuilder = new AdsRewardClaimsBuilder();
    }

    async testProviderMinimumDurationIsReadWhenCreated()
    {
        await this.test('the provider minimum duration is read when created and rejects the shorter ads', async () => {
            let minimumDuration = AdsConst.VIDEOS_MINIMUM_DURATION * 4;
            let providers = {crazyGames: {[AdsConst.CONFIG_PATHS.VIDEO_MINIMUM_DURATION]: minimumDuration}};
            let adsSetup = this.adsBuilder.createAdsSetup(
                true,
                GameConst.STATUS.ACTIVE,
                {},
                {[AdsConst.CONFIG_PATHS.PROVIDERS]: providers}
            );
            this.assert.deepStrictEqual(adsSetup.adsMessageActions.providersMinimumDurations, {crazyGames: minimumDuration});
            this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.givenRewards, []);
            providers.crazyGames[AdsConst.CONFIG_PATHS.VIDEO_MINIMUM_DURATION] = 1;
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.givenRewards, []);
        });
    }

    async testDurationsDefaultsWhenCreated()
    {
        await this.test('a provider without its minimum duration uses the default when created', async () => {
            let messageActions = this.adsBuilder.createAdsSetup(true).adsMessageActions;
            this.assert.deepStrictEqual(
                messageActions.providersMinimumDurations,
                {crazyGames: AdsConst.VIDEOS_MINIMUM_DURATION}
            );
            this.assert.strictEqual(messageActions.videosMaximumDuration, 1);
        });
    }

}

module.exports.TestAdsMessageActionsConfig = TestAdsMessageActionsConfig;
