/**
 *
 * Reldens - Test Player Creation
 *
 */

const { BaseTest } = require('./base-test');
const { PlayerCreationBuilder } = require('./fixtures/player-creation-builder');
const { FileHandler } = require('@reldens/server-utils');

class TestPlayerCreation extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.builder = new PlayerCreationBuilder();
    }

    async testTheSameNameCreatedAtTheSameTimeIsGivenOnce()
    {
        await this.test('two players created with the same name at the same time get the name only once', async () => {
            let creationSetup = this.builder.createNamesCheckingSetup();
            let results = await this.builder.createAtTheSameTime(creationSetup, ['samename', 'samename']);
            this.assert.deepStrictEqual(results.map(result => result.error), [false, true]);
            this.assert.strictEqual(
                results[1].message,
                'The player name is not available, please choose another name.'
            );
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.user_id), [1]);
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.playerNewNameUnavailable');
        });
    }

    async testTheSameNameWithAnotherCaseWaitsForTheFirstCreation()
    {
        await this.test('the same name with another letter case waits for the first creation and is rejected', async () => {
            let creationSetup = this.builder.createNamesCheckingSetup();
            let results = await this.builder.createAtTheSameTime(creationSetup, ['SameName', 'samename']);
            this.assert.deepStrictEqual(results.map(result => result.error), [false, true]);
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.name), ['SameName']);
        });
    }

    async testDifferentNamesCreatedAtTheSameTimeAreAllStored()
    {
        await this.test('players created with different names at the same time are all stored', async () => {
            let creationSetup = this.builder.createNamesCheckingSetup();
            let results = await this.builder.createAtTheSameTime(creationSetup, ['first', 'second']);
            this.assert.deepStrictEqual(results.map(result => result.error), [false, false]);
            this.assert.deepStrictEqual(
                creationSetup.createdPlayers.map(createdPlayer => createdPlayer.name).sort(),
                ['first', 'second']
            );
        });
    }

    async testTheNameSetByTheCreateBeforeListenerIsTheCheckedOne()
    {
        await this.test('the name changed by a create before listener is the one checked and given once', async () => {
            let creationSetup = this.builder.createNamesCheckingSetup();
            creationSetup.playerCreation.events = {emit: this.builder.renameOnCreateBefore(creationSetup, 'renamed')};
            let results = await this.builder.createAtTheSameTime(creationSetup, ['first', 'second']);
            this.assert.deepStrictEqual(results.map(result => result.error), [false, true]);
            this.assert.deepStrictEqual(creationSetup.checkedNames, ['renamed', 'renamed']);
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.name), ['renamed']);
        });
    }

    async testAFailedNameCheckDoesNotBlockTheNextCreationWithThatName()
    {
        await this.test('a failed name check returns the creation error and the next creation with that name runs', async () => {
            let creationSetup = this.builder.createNamesCheckingSetup();
            let isNameAvailable = creationSetup.playerCreation.usersManager.isNameAvailable;
            let loadError = new Error('Players load failed.');
            creationSetup.playerCreation.usersManager.isNameAvailable = async () => {
                creationSetup.playerCreation.usersManager.isNameAvailable = isNameAvailable;
                throw loadError;
            };
            let results = await this.builder.createAtTheSameTime(creationSetup, ['samename', 'samename']);
            this.assert.deepStrictEqual(results.map(result => result.error), [true, false]);
            this.assert.strictEqual(results[0].message, 'There was an error creating your player, please try again.');
            this.assert.ok(creationSetup.emittedEvents.includes('reldens.createNewPlayerCriticalError'));
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.user_id), [2]);
        });
    }

    async testAFailedStoreReturnsTheCreationError()
    {
        await this.test('a failed player store returns the creation error and frees the name for the next creation', async () => {
            let creationSetup = this.builder.createNamesCheckingSetup();
            let createPlayer = creationSetup.playerCreation.usersManager.createPlayer;
            let insertError = new Error('Player insert failed.');
            creationSetup.playerCreation.usersManager.createPlayer = async () => {
                creationSetup.playerCreation.usersManager.createPlayer = createPlayer;
                throw insertError;
            };
            let results = await this.builder.createAtTheSameTime(creationSetup, ['samename', 'samename']);
            this.assert.deepStrictEqual(results.map(result => result.error), [true, false]);
            this.assert.strictEqual(results[0].message, 'There was an error creating your player, please try again.');
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.user_id), [2]);
        });
    }

    async testANameUsedOnAnotherServerIsRejected()
    {
        await this.test('a name used or held on another server is rejected before the player is stored', async () => {
            let creationSetup = this.builder.createCreationSetup(4, true);
            creationSetup.isFreeOnOtherServers = false;
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'player', user_id: 1});
            this.assert.strictEqual(result.message, 'The player name is not available, please choose another name.');
            this.assert.deepStrictEqual(creationSetup.heldNames, ['player']);
            this.assert.deepStrictEqual(creationSetup.releasedNames, []);
            this.assert.strictEqual(creationSetup.createdPlayers.length, 0);
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.playerNewNameUnavailable');
        });
    }

    async testANameUsedOnThisServerIsNeverCheckedOnTheOthers()
    {
        await this.test('a name used on this server is rejected without checking the other servers', async () => {
            let creationSetup = this.builder.createCreationSetup(4, false);
            await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'player', user_id: 1});
            this.assert.deepStrictEqual(creationSetup.heldNames, []);
            this.assert.strictEqual(creationSetup.createdPlayers.length, 0);
        });
    }

    async testTheHeldNameIsReleasedAfterTheStore()
    {
        await this.test('the name held on the other servers is released after the player is stored', async () => {
            let creationSetup = this.builder.createCreationSetup(4, true);
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'player', user_id: 1});
            this.assert.strictEqual(result.error, false);
            this.assert.deepStrictEqual(creationSetup.heldNames, ['player']);
            this.assert.deepStrictEqual(creationSetup.releasedNames, ['player']);
        });
    }

    async testTheHeldNameIsReleasedWhenTheStoreFails()
    {
        await this.test('the name held on the other servers is released when the player store fails', async () => {
            let creationSetup = this.builder.createCreationSetup(4, true);
            let storeError = new Error('Player insert failed.');
            creationSetup.playerCreation.usersManager.createPlayer = async () => {
                throw storeError;
            };
            // @possible-hallucinated-undefined-method
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'player', user_id: 1});
            this.assert.strictEqual(result.message, 'There was an error creating your player, please try again.');
            this.assert.deepStrictEqual(creationSetup.releasedNames, ['player']);
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.createNewPlayerCriticalError');
        });
    }

    async testTheShortPlayerNameIsRejected()
    {
        await this.test('a player name shorter than the minimum is rejected before the player is stored', async () => {
            let creationSetup = this.builder.createCreationSetup(4, true);
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'ab', user_id: 1});
            this.assert.strictEqual(result.error, true);
            this.assert.strictEqual(creationSetup.createdPlayers.length, 0);
            this.assert.deepStrictEqual(creationSetup.emittedEvents, ['reldens.playerNewName']);
        });
    }

    async testTheUnavailablePlayerNameIsRejected()
    {
        await this.test('a player name that is not available is rejected before the player is stored', async () => {
            let creationSetup = this.builder.createCreationSetup(4, false);
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'taken', user_id: 1});
            this.assert.strictEqual(result.error, true);
            this.assert.strictEqual(creationSetup.createdPlayers.length, 0);
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.playerNewNameUnavailable');
        });
    }

    async testTheInitialStateInAMissingRoomIsRejected()
    {
        await this.test('an initial state in a missing room is rejected before the player is stored', async () => {
            let creationSetup = this.builder.createCreationSetup(99, true);
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'player', user_id: 1});
            this.assert.strictEqual(result.error, true);
            this.assert.strictEqual(creationSetup.createdPlayers.length, 0);
            this.assert.deepStrictEqual(creationSetup.emittedEvents, ['reldens.playerSceneUnavailable']);
        });
    }

    async testTheCreatedPlayerStateGetsTheRoomName()
    {
        await this.test('the created player is stored for the user and its state gets the room name', async () => {
            let creationSetup = this.builder.createCreationSetup(4, true);
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'player', user_id: 1});
            this.assert.strictEqual(result.error, false);
            this.assert.strictEqual(result.player.state.scene, 'town');
            this.assert.strictEqual([...creationSetup.createdPlayers].shift().user_id, 1);
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.createdNewPlayer');
        });
    }

    async testTheLongPlayerNameIsCutToTheNameColumnSize()
    {
        await this.test('a name over the 255 characters column is cut before it is checked and stored', async () => {
            for(let nameLength of [255, 300]){
                let creationSetup = this.builder.createCreationSetup(4, true);
                let result = await creationSetup.playerCreation.createNewPlayer(
                    {'new-player-name': 'a'.repeat(nameLength), user_id: 1}
                );
                this.assert.strictEqual(result.error, false);
                this.assert.deepStrictEqual(creationSetup.checkedNames, ['a'.repeat(255)]);
                this.assert.strictEqual([...creationSetup.createdPlayers].shift().name, 'a'.repeat(255));
            }
        });
    }

    async testTheLongPlayerNameIsCleanedBeforeItIsCut()
    {
        await this.test('a long name is cleaned before it is cut, so a removed character never takes a place', async () => {
            let creationSetup = this.builder.createCreationSetup(4, true);
            let result = await creationSetup.playerCreation.createNewPlayer(
                {'new-player-name': 'a'.repeat(254)+'\u{1F600} b', user_id: 1}
            );
            this.assert.strictEqual(result.error, false);
            this.assert.strictEqual([...creationSetup.createdPlayers].shift().name, 'a'.repeat(254)+'b');
        });
    }

    async testThePlayerNameIsCleanedToTheAllowedCharacters()
    {
        await this.test('the spaces, accents and HTML are removed from the name before it is checked and stored', async () => {
            let creationSetup = this.builder.createCreationSetup(4, true);
            let htmlPayload = FileHandler.readFile(
                FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'assets', 'stored-html-payload.html')
            ).trim();
            let result = await creationSetup.playerCreation.createNewPlayer(
                {'new-player-name': '  Hér o_1.x-2 '+htmlPayload+' ', user_id: 1}
            );
            let cleanedName = 'Hro_1.x-2imgsrcxonerrorwindow.e2eStoredScriptRantrue';
            this.assert.strictEqual(result.error, false);
            this.assert.deepStrictEqual(creationSetup.checkedNames, [cleanedName]);
            this.assert.strictEqual([...creationSetup.createdPlayers].shift().name, cleanedName);
        });
    }

    async testANameTooShortAfterTheCleanupIsRejected()
    {
        await this.test('a name that is too short once cleaned is rejected before the player is stored', async () => {
            let creationSetup = this.builder.createCreationSetup(4, true);
            // @possible-hallucinated-undefined-method
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': ' a é b ', user_id: 1});
            this.assert.strictEqual(result.message, 'Invalid player name, please choose another name.');
            this.assert.deepStrictEqual(creationSetup.checkedNames, []);
            this.assert.strictEqual(creationSetup.createdPlayers.length, 0);
            this.assert.deepStrictEqual(creationSetup.emittedEvents, ['reldens.playerNewName']);
        });
    }

    async testTheSameNameWithSpacesAtTheSameTimeIsGivenOnce()
    {
        await this.test('the same name sent with spaces by two users at the same time is given only once', async () => {
            let creationSetup = this.builder.createNamesCheckingSetup();
            let results = await this.builder.createAtTheSameTime(creationSetup, ['Hero', 'Hero ']);
            this.assert.deepStrictEqual(results.map(result => result.error), [false, true]);
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.name), ['Hero']);
        });
    }

}

module.exports.TestPlayerCreation = TestPlayerCreation;
