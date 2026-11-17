/**
 *
 * Reldens - Test Player Creation Rollback
 *
 */

const { BaseTest } = require('./base-test');
const { PlayerCreationBuilder } = require('./fixtures/player-creation-builder');

class TestPlayerCreationRollback extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.builder = new PlayerCreationBuilder();
        this.creationError = 'There was an error creating your player, please try again.';
    }

    createClassPathSetup()
    {
        let creationSetup = this.builder.createCreationSetup(4, true);
        creationSetup.playerCreation.events = {emit: this.builder.storeClassPathOnCreated(creationSetup, [1, 2])};
        return creationSetup;
    }

    async createWithClassPath(creationSetup, playerName, classPathId)
    {
        return await creationSetup.playerCreation.createNewPlayer(
            {'new-player-name': playerName, user_id: 1, class_path_select: classPathId}
        );
    }

    async testAnUnknownClassPathDeletesTheStoredPlayer()
    {
        await this.test('an unknown class path returns the creation error and deletes the stored player', async () => {
            let creationSetup = this.createClassPathSetup();
            let result = await this.createWithClassPath(creationSetup, 'player', '999999');
            this.assert.strictEqual(result.error, true);
            this.assert.strictEqual(result.message, this.creationError);
            this.assert.deepStrictEqual(creationSetup.storedClassPaths, []);
            this.assert.deepStrictEqual(creationSetup.deletedPlayerIds, [1]);
            this.assert.deepStrictEqual(creationSetup.releasedNames, ['player']);
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.createNewPlayerCriticalError');
        });
    }

    async testAKnownClassPathKeepsTheStoredPlayer()
    {
        await this.test('a known class path is stored for the created player and the player is kept', async () => {
            let creationSetup = this.createClassPathSetup();
            let result = await this.createWithClassPath(creationSetup, 'player', '2');
            this.assert.strictEqual(result.error, false);
            this.assert.deepStrictEqual(creationSetup.storedClassPaths, [
                {class_path_id: '2', owner_id: 1, currentLevel: 1, currentExp: 0}
            ]);
            this.assert.deepStrictEqual(creationSetup.deletedPlayerIds, []);
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.createdNewPlayer');
        });
    }

    async testTheNameOfTheDeletedPlayerIsGivenToTheNextCreation()
    {
        await this.test('the name of a player deleted after a failed creation is given to the next creation', async () => {
            let creationSetup = this.builder.createNamesCheckingSetup();
            creationSetup.playerCreation.events = {emit: this.builder.storeClassPathOnCreated(creationSetup, [1])};
            creationSetup.playerCreation.usersManager.deletePlayer = async (playerId) => {
                creationSetup.deletedPlayerIds.push(playerId);
                creationSetup.createdPlayers.splice(playerId - 1, 1);
            };
            let failedResult = await this.createWithClassPath(creationSetup, 'samename', '999999');
            let nextResult = await this.createWithClassPath(creationSetup, 'samename', '1');
            this.assert.deepStrictEqual([failedResult.error, nextResult.error], [true, false]);
            this.assert.deepStrictEqual(creationSetup.deletedPlayerIds, [1]);
            this.assert.deepStrictEqual(creationSetup.checkedNames, ['samename', 'samename']);
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.name), [
                'samename'
            ]);
        });
    }

    async testAFailedRemovalStillReturnsTheCreationError()
    {
        await this.test('a failed removal of the stored player still returns the creation error', async () => {
            let creationSetup = this.createClassPathSetup();
            creationSetup.playerCreation.usersManager.deletePlayer = async () => Promise.reject({message: 'Storage.'});
            let result = await this.createWithClassPath(creationSetup, 'player', '999999');
            this.assert.strictEqual(result.message, this.creationError);
            this.assert.deepStrictEqual(creationSetup.releasedNames, ['player']);
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.createNewPlayerCriticalError');
        });
    }

    async testAFailedInsertDeletesNothing()
    {
        await this.test('a player insert that fails or stores nothing deletes no player', async () => {
            for(let failedInsert of [async () => Promise.reject({message: 'Insert.'}), async () => false]){
                let creationSetup = this.createClassPathSetup();
                creationSetup.playerCreation.usersManager.createPlayer = failedInsert;
                let result = await this.createWithClassPath(creationSetup, 'player', '1');
                this.assert.strictEqual(result.message, this.creationError);
                this.assert.deepStrictEqual(creationSetup.deletedPlayerIds, []);
                this.assert.deepStrictEqual(creationSetup.storedClassPaths, []);
            }
        });
    }

}

module.exports.TestPlayerCreationRollback = TestPlayerCreationRollback;
