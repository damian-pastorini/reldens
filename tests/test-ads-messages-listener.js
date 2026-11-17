/**
 *
 * Reldens - Test Ads Messages Listener
 *
 */

const { BaseTest } = require('./base-test');
const { MessagesListener } = require('../lib/ads/client/messages-listener');
const { AdsConst } = require('../lib/ads/constants');

class TestAdsMessagesListener extends BaseTest
{

    createRoom()
    {
        let room = {handlers: []};
        room.onMessage = (messageType, handler) => room.handlers.push(handler);
        room.receive = (message) => room.handlers.map(handler => handler(message));
        return room;
    }

    async testEveryJoinWaitsForTheJoinedRoomPlayedAds()
    {
        await this.test('every room join clears the played ads until the joined room sends its list', async () => {
            let adsPlugin = {playedAds: null};
            let loginRoom = this.createRoom();
            await MessagesListener.listenMessages(loginRoom, adsPlugin);
            loginRoom.receive({act: AdsConst.ACTIONS.ADS_PLAYED, playedAdsModels: []});
            this.assert.deepStrictEqual(adsPlugin.playedAds, {});
            let nextRoom = this.createRoom();
            await MessagesListener.listenMessages(nextRoom, adsPlugin);
            this.assert.strictEqual(adsPlugin.playedAds, null);
            let playedAd = {id: 3, ads_id: 7, player_id: 1};
            nextRoom.receive({act: AdsConst.ACTIONS.ADS_PLAYED, playedAdsModels: [playedAd]});
            this.assert.deepStrictEqual(adsPlugin.playedAds, {7: playedAd});
        });
    }

    async testOtherMessagesKeepThePlayedAds()
    {
        await this.test('other messages keep the played ads and a list without models is empty', async () => {
            let adsPlugin = {playedAds: null};
            let room = this.createRoom();
            await MessagesListener.listenMessages(room, adsPlugin);
            room.receive({act: AdsConst.ACTIONS.AD_STARTED, ads_id: 7});
            this.assert.strictEqual(adsPlugin.playedAds, null);
            room.receive({act: AdsConst.ACTIONS.ADS_PLAYED});
            this.assert.deepStrictEqual(adsPlugin.playedAds, {});
        });
    }

}

module.exports.TestAdsMessagesListener = TestAdsMessagesListener;
