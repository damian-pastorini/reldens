/**
 *
 * Reldens - Test Create Player Ads Handler
 *
 */

const { BaseTest } = require('./base-test');
const { CreatePlayerAdsHandler } = require('../lib/ads/server/event-handlers/create-player-ads-handler');
const { AdsConst } = require('../lib/ads/constants');

class TestCreatePlayerAdsHandler extends BaseTest
{

    createHandler(playedAdsByPlayerId, hasRepository = true)
    {
        let loadCalls = [];
        let repository = {
            loadByWithRelations: async (field, playerId, relations) => {
                loadCalls.push({field, playerId, relations});
                return playedAdsByPlayerId[playerId];
            }
        };
        let handler = new CreatePlayerAdsHandler({dataServer: {getEntity: () => hasRepository ? repository : false}});
        handler.loadCalls = loadCalls;
        return handler;
    }

    createPlayer(playerId)
    {
        let player = {player_id: playerId, customData: {}};
        player.setCustom = (key, value) => player.customData[key] = value;
        return player;
    }

    createClient()
    {
        let client = {sentMessages: []};
        client.send = async (messageType, message) => client.sentMessages.push({messageType, message});
        return client;
    }

    async enrichPlayer(handler, playerId)
    {
        let join = {player: this.createPlayer(playerId), client: this.createClient()};
        await handler.enrichPlayedWithPlayedAds(join.player, join.client);
        return join;
    }

    assertPlayedAds(join, playedAds)
    {
        this.assert.deepStrictEqual(
            join.client.sentMessages,
            [{messageType: '*', message: {act: AdsConst.ACTIONS.ADS_PLAYED, playedAdsModels: playedAds}}]
        );
        this.assert.deepStrictEqual(join.player.customData, {playedAds});
    }

    async testPlayerWithoutPlayedAdsReceivesAnEmptyList()
    {
        await this.test('a player without played ads receives the empty played ads list', async () => {
            this.assertPlayedAds(await this.enrichPlayer(this.createHandler({1: []}), 1), []);
        });
    }

    async testMissingPlayedAdsResultSendsAnEmptyList()
    {
        await this.test('a missing or empty played ads result is sent as an empty list', async () => {
            for(let playedAdsByPlayerId of [{1: null}, {1: false}, {}]){
                this.assertPlayedAds(await this.enrichPlayer(this.createHandler(playedAdsByPlayerId), 1), []);
            }
        });
    }

    async testPlayedAdsAreSentAndStored()
    {
        await this.test('the played ads rows are stored on the player and sent to the client', async () => {
            let playedAds = [{id: 3, ads_id: 7, player_id: 1}, {id: 4, ads_id: 8, player_id: 1}];
            let handler = this.createHandler({1: playedAds});
            this.assertPlayedAds(await this.enrichPlayer(handler, 1), playedAds);
            this.assert.deepStrictEqual(
                handler.loadCalls,
                [{field: 'player_id', playerId: 1, relations: ['related_players']}]
            );
        });
    }

    async testPlayedAdsAreLoadedOncePerPlayer()
    {
        await this.test('the played ads are loaded once per player and the next joins send the loaded list', async () => {
            let otherPlayerAds = [{id: 5, ads_id: 8, player_id: 2}];
            let handler = this.createHandler({1: [], 2: otherPlayerAds});
            this.assertPlayedAds(await this.enrichPlayer(handler, 1), []);
            this.assertPlayedAds(await this.enrichPlayer(handler, 1), []);
            this.assertPlayedAds(await this.enrichPlayer(handler, 2), otherPlayerAds);
            this.assert.deepStrictEqual(handler.loadCalls.map(loadCall => loadCall.playerId), [1, 2]);
        });
    }

    async testMissingRepositorySendsNothing()
    {
        await this.test('without the played ads repository nothing is stored nor sent', async () => {
            let handler = this.createHandler({}, false);
            let player = this.createPlayer(1);
            let client = this.createClient();
            this.assert.strictEqual(await handler.enrichPlayedWithPlayedAds(player, client), false);
            this.assert.deepStrictEqual(client.sentMessages, []);
            this.assert.deepStrictEqual(player.customData, {});
        });
    }

}

module.exports.TestCreatePlayerAdsHandler = TestCreatePlayerAdsHandler;
