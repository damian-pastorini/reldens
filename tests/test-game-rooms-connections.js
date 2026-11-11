/**
 *
 * Reldens - Test Game Rooms Connections
 *
 */

const { BaseTest } = require('./base-test');
const { GameRoomsConnections } = require('../lib/game/client/game-rooms-connections');

class TestGameRoomsConnections extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.featuresList = {chat: {joinRooms: ['chat']}, teams: {joinRooms: ['teams', 'clan']}, inventory: {}};
    }

    createGameManager(featuresList, failingRoomName = '')
    {
        let gameManager = {
            features: {featuresList},
            joinedRooms: {},
            featuresRoomsPlayerId: false,
            userData: {selectedPlayer: 1},
            config: {},
            joinAttempts: [],
            emittedRooms: [],
            leftRooms: [],
            alerts: [],
            leftServersRooms: 0,
            services: {translator: {t: (snippetKey) => 'translated:'+snippetKey}}
        };
        gameManager.gameDom = {alertReload: (message) => gameManager.alerts.push(message) && false};
        gameManager.emitJoinedRoom = async (room, roomName) => gameManager.emittedRooms.push(roomName);
        gameManager.gameClient = {
            joinOrCreate: async (roomName) => gameManager.joinAttempts.push(roomName) && failingRoomName !== roomName
                && {roomName, leave: async () => gameManager.leftRooms.push(roomName)},
            leaveServersRooms: async () => ++gameManager.leftServersRooms
        };
        return gameManager;
    }

    async testTheFeaturesRoomsAreJoinedOnce()
    {
        await this.test('the features rooms are joined once and an already joined room is reused', async () => {
            let gameManager = this.createGameManager(this.featuresList);
            let joinedClan = {roomName: 'clan'};
            gameManager.joinedRooms.clan = joinedClan;
            this.assert.strictEqual(await new GameRoomsConnections(gameManager).joinFeaturesRooms(), true);
            this.assert.deepStrictEqual(gameManager.joinAttempts, ['chat', 'teams']);
            this.assert.deepStrictEqual(gameManager.emittedRooms, ['chat', 'teams']);
            this.assert.deepStrictEqual(Object.keys(gameManager.joinedRooms), ['clan', 'chat', 'teams']);
            this.assert.strictEqual(gameManager.joinedRooms.clan, joinedClan);
            this.assert.deepStrictEqual(gameManager.config.client.rooms.featuresRoomsNames, ['chat', 'teams', 'clan']);
            this.assert.strictEqual(gameManager.featuresRoomsPlayerId, 1);
        });
    }

    async testAFailedFeatureRoomJoinAlertsAndStops()
    {
        await this.test('a failed feature room join alerts the reload and stops the joins', async () => {
            let gameManager = this.createGameManager(this.featuresList, 'teams');
            this.assert.strictEqual(await new GameRoomsConnections(gameManager).joinFeaturesRooms(), false);
            this.assert.deepStrictEqual(gameManager.joinAttempts, ['chat', 'teams']);
            this.assert.deepStrictEqual(gameManager.alerts, ['translated:game.errors.joiningFeatureRoom']);
            this.assert.deepStrictEqual(Object.keys(gameManager.joinedRooms), ['chat']);
            this.assert.strictEqual(gameManager.featuresRoomsPlayerId, false);
        });
    }

    async testNoFeaturesJoinNoRooms()
    {
        await this.test('without features no room is joined nor left', async () => {
            let gameManager = this.createGameManager({});
            gameManager.featuresRoomsPlayerId = 2;
            this.assert.strictEqual(await new GameRoomsConnections(gameManager).joinFeaturesRooms(), false);
            this.assert.deepStrictEqual(gameManager.joinAttempts, []);
            this.assert.strictEqual(gameManager.leftServersRooms, 0);
        });
    }

    async testTheRoomsOfAnotherPlayerAreLeftBeforeTheJoins()
    {
        await this.test('the features rooms joined for another player are left before joining them again', async () => {
            let gameManager = this.createGameManager(this.featuresList);
            gameManager.featuresRoomsPlayerId = 2;
            gameManager.joinedRooms.chat = {leave: async () => gameManager.leftRooms.push('previous-chat')};
            this.assert.strictEqual(await new GameRoomsConnections(gameManager).joinFeaturesRooms(), true);
            this.assert.deepStrictEqual(gameManager.leftRooms, ['previous-chat']);
            this.assert.strictEqual(gameManager.leftServersRooms, 1);
            this.assert.deepStrictEqual(gameManager.joinAttempts, ['chat', 'teams', 'clan']);
            this.assert.strictEqual(gameManager.featuresRoomsPlayerId, 1);
        });
    }

    async testTheRoomsOfTheSamePlayerAreKept()
    {
        await this.test('the features rooms are kept for the same player or when none was joined', async () => {
            for(let featuresRoomsPlayerId of [1, false]){
                let gameManager = this.createGameManager(this.featuresList);
                gameManager.featuresRoomsPlayerId = featuresRoomsPlayerId;
                gameManager.joinedRooms.chat = {leave: async () => gameManager.leftRooms.push('chat')};
                this.assert.strictEqual(
                    await new GameRoomsConnections(gameManager).leaveFeaturesRoomsOfAnotherPlayer(),
                    false
                );
                this.assert.deepStrictEqual(gameManager.leftRooms, []);
                this.assert.strictEqual(gameManager.leftServersRooms, 0);
                this.assert.deepStrictEqual(Object.keys(gameManager.joinedRooms), ['chat']);
            }
        });
    }

}

module.exports.TestGameRoomsConnections = TestGameRoomsConnections;
