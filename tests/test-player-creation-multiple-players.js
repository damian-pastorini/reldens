/**
 *
 * Reldens - Test Player Creation Multiple Players
 *
 */

const { BaseTest } = require('./base-test');
const { PlayerCreationBuilder } = require('./fixtures/player-creation-builder');

class TestPlayerCreationMultiplePlayers extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.builder = new PlayerCreationBuilder();
        this.notAllowedMessage = 'Multiple players are not allowed, you already have a player.';
    }

    createSetup(isMultiplePlayersEnabled, storedPlayers)
    {
        let creationSetup = this.builder.createNamesCheckingSetup();
        creationSetup.playerCreation.isMultiplePlayersEnabled = isMultiplePlayersEnabled;
        creationSetup.createdPlayers.push(...storedPlayers);
        return creationSetup;
    }

    async testAUserWithAPlayerCanNotCreateAnotherOne()
    {
        await this.test('with the multiple players off a user that has a player can not create another one', async () => {
            let creationSetup = this.createSetup(false, [{name: 'first', user_id: 1}]);
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'second', user_id: 1});
            this.assert.deepStrictEqual(result, {error: true, message: this.notAllowedMessage});
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.name), ['first']);
            this.assert.deepStrictEqual(creationSetup.checkedNames, []);
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.createNewPlayerNotAllowed');
        });
    }

    async testAUserWithoutPlayersCreatesItsPlayer()
    {
        await this.test('with the multiple players off a user without players creates its player', async () => {
            let creationSetup = this.createSetup(false, [{name: 'other', user_id: 2}]);
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'first', user_id: 1});
            this.assert.strictEqual(result.error, false);
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.user_id), [2, 1]);
        });
    }

    async testTwoCreationsOfOneUserAtTheSameTimeGiveOnePlayer()
    {
        await this.test('with the multiple players off two creations of one user at the same time give one player', async () => {
            let creationSetup = this.createSetup(false, []);
            let results = await Promise.all(['first', 'second'].map(
                playerName => creationSetup.playerCreation.createNewPlayer({'new-player-name': playerName, user_id: 1})
            ));
            this.assert.deepStrictEqual(results.map(result => result.error), [false, true]);
            this.assert.strictEqual(results[1].message, this.notAllowedMessage);
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.name), ['first']);
        });
    }

    async testMultiplePlayersOnGivesTheUserAnotherPlayer()
    {
        await this.test('with the multiple players on a user that has a player creates another one', async () => {
            let creationSetup = this.createSetup(true, [{name: 'first', user_id: 1}]);
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'second', user_id: 1});
            this.assert.strictEqual(result.error, false);
            this.assert.deepStrictEqual(
                creationSetup.createdPlayers.map(createdPlayer => createdPlayer.name),
                ['first', 'second']
            );
        });
    }

    async testAFailedPlayersCountReturnsTheCreationError()
    {
        await this.test('a failed players count returns the creation error and the next creation of the user runs', async () => {
            let creationSetup = this.createSetup(false, []);
            let playersRepository = creationSetup.playerCreation.usersManager.playersRepository;
            creationSetup.playerCreation.usersManager.playersRepository = {
                count: async () => {
                    creationSetup.playerCreation.usersManager.playersRepository = playersRepository;
                    return Promise.reject({message: 'Count failed.'});
                }
            };
            let loginData = {'new-player-name': 'first', user_id: 1};
            let failedResult = await creationSetup.playerCreation.createNewPlayer({...loginData});
            this.assert.strictEqual(failedResult.message, 'There was an error creating your player, please try again.');
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.createNewPlayerCriticalError');
            this.assert.strictEqual((await creationSetup.playerCreation.createNewPlayer({...loginData})).error, false);
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.name), ['first']);
        });
    }

}

module.exports.TestPlayerCreationMultiplePlayers = TestPlayerCreationMultiplePlayers;
