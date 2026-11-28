/**
 *
 * Reldens - Test Ads Disabled Player
 *
 * Tests the player state around an event video ad: the start disables an alive player (no movement, no actions) and
 * keeps a dead one dead, the player is activated again after the videos maximum duration when the ad never ends, an ad
 * ended or failed before the provider minimum duration keeps the player disabled until that duration passed (measured
 * by the server from the start) and no other ad can start meanwhile, and the ad end activates only a disabled player.
 *
 */

const { BaseTest } = require('./base-test');
const { AdsRewardClaimsBuilder } = require('./fixtures/ads-reward-claims-builder');
const { AdsConst } = require('../lib/ads/constants');
const { GameConst } = require('../lib/game/constants');
const timersPromises = require('timers/promises');

class TestAdsDisabledPlayer extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.adsBuilder = new AdsRewardClaimsBuilder();
    }

    createDurationsSetup(minimumDurationMs, maximumDurationMs)
    {
        return this.adsBuilder.createAdsSetup(true, GameConst.STATUS.ACTIVE, {}, {
            [AdsConst.CONFIG_PATHS.VIDEOS_MAXIMUM_DURATION]: maximumDurationMs,
            [AdsConst.CONFIG_PATHS.PROVIDERS]: {crazyGames: {[AdsConst.CONFIG_PATHS.VIDEO_MINIMUM_DURATION]: minimumDurationMs}}
        });
    }

    async testAdStartDisablesAnAlivePlayer()
    {
        await this.test('the ad start disables an alive player with the disabled status', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true);
            this.adsBuilder.storeStartedAd(adsSetup, 0);
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.deactivatedStates, [GameConst.STATUS.DISABLED]);
        });
    }

    async testPlayerDisabledByAnAdIsActivatedAfterTheMaximumDuration()
    {
        await this.test('a player disabled by an ad that never ends is activated after the maximum duration', async () => {
            let adsSetup = this.createDurationsSetup(0, 1);
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.strictEqual(adsSetup.playerSchema.state.inState, GameConst.STATUS.DISABLED);
            await timersPromises.setTimeout(AdsConst.VIDEOS_MINIMUM_DURATION / 100);
            this.assert.deepStrictEqual(adsSetup.activatedStates, [GameConst.STATUS.ACTIVE]);
            this.assert.strictEqual(adsSetup.playerSchema.state.inState, GameConst.STATUS.ACTIVE);
        });
    }

    async testAnEarlyEndOrFailureKeepsThePlayerDisabledForTheMinimumDuration()
    {
        await this.test('an ad ended or failed before the minimum duration keeps the player disabled until it passed', async () => {
            let minimumDurationMs = 60;
            let results = [];
            for(let [earlyAction, earlyMessageKey] of [['adEnded', 'endedMessage'], ['adFailed', 'failedMessage']]){
                let adsSetup = this.createDurationsSetup(minimumDurationMs, 60000);
                let actions = adsSetup.adsMessageActions;
                await actions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
                await actions[earlyAction](adsSetup[earlyMessageKey], adsSetup.room, adsSetup.playerSchema);
                let secondStart = await actions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
                let stateBeforeMinimum = adsSetup.playerSchema.state.inState;
                await timersPromises.setTimeout(minimumDurationMs * 2);
                results.push([stateBeforeMinimum, secondStart, adsSetup.playerSchema.state.inState]);
            }
            let expected = [GameConst.STATUS.DISABLED, false, GameConst.STATUS.ACTIVE];
            this.assert.deepStrictEqual(results, [expected, expected]);
        });
    }

    async testAdStartKeepsADeadPlayerDead()
    {
        await this.test('the ad start keeps the death status of a dead player', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true, GameConst.STATUS.DEATH);
            this.adsBuilder.storeStartedAd(adsSetup, 0);
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.deactivatedStates, []);
            this.assert.strictEqual(adsSetup.playerSchema.state.inState, GameConst.STATUS.DEATH);
        });
    }

    async testAdEndedActivatesOnlyADisabledPlayer()
    {
        await this.test('the ad ended activates a disabled player and never revives a dead one', async () => {
            let disabledSetup = this.adsBuilder.createAdsSetup(true, GameConst.STATUS.DISABLED);
            this.adsBuilder.storeStartedAd(disabledSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await disabledSetup.adsMessageActions.adEnded(
                disabledSetup.endedMessage,
                disabledSetup.room,
                disabledSetup.playerSchema
            );
            this.assert.deepStrictEqual(
                [disabledSetup.activatedStates, disabledSetup.playerSchema.privateData[AdsConst.PRIVATE_DATA.DISABLED_UNTIL]],
                [[GameConst.STATUS.ACTIVE], 0]
            );
            let deadSetup = this.adsBuilder.createAdsSetup(true, GameConst.STATUS.DEATH);
            this.adsBuilder.storeStartedAd(deadSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await deadSetup.adsMessageActions.adEnded(deadSetup.endedMessage, deadSetup.room, deadSetup.playerSchema);
            this.assert.deepStrictEqual(
                [
                    deadSetup.activatedStates,
                    deadSetup.playerSchema.state.inState,
                    deadSetup.playerSchema.privateData[AdsConst.PRIVATE_DATA.DISABLED_UNTIL]
                ],
                [[], GameConst.STATUS.DEATH, 0]
            );
        });
    }

}

module.exports.TestAdsDisabledPlayer = TestAdsDisabledPlayer;
