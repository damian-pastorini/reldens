/**
 *
 * Reldens - Test Player Creation Form
 *
 */

const { BaseTest } = require('./base-test');
const { UsersPlugin } = require('../lib/users/client/plugin');
const { GameConst } = require('../lib/game/constants');

class TestPlayerCreationForm extends BaseTest
{

    createGameManager(failingSend = false)
    {
        let gameManager = {isCreatingPlayer: false, sentMessages: [], emittedEvents: [], alerts: []};
        gameManager.events = {emitSync: (eventName) => gameManager.emittedEvents.push(eventName)};
        gameManager.gameRoom = {
            send: (type, message) => {
                if(failingSend){
                    throw {message: 'The connection is closed.'};
                }
                gameManager.sentMessages.push(message);
            }
        };
        gameManager.gameDom = {alertReload: (message) => gameManager.alerts.push(message)};
        gameManager.services = {translator: {t: (snippetKey) => 'translated:'+snippetKey}};
        return gameManager;
    }

    submit(gameManager, playerName)
    {
        return Object.create(UsersPlugin.prototype).submitPlayerCreation(
            {'new-player-name': playerName},
            {},
            gameManager
        );
    }

    async testASecondSubmitWhileCreatingSendsNothing()
    {
        await this.test('a second submit while the player creation is pending sends nothing', async () => {
            let gameManager = this.createGameManager();
            this.assert.strictEqual(this.submit(gameManager, 'NewHero'), true);
            this.assert.strictEqual(this.submit(gameManager, 'NewHero'), false);
            this.assert.deepStrictEqual(
                gameManager.sentMessages,
                [{act: GameConst.CREATE_PLAYER, formData: {'new-player-name': 'NewHero'}}]
            );
            this.assert.deepStrictEqual(gameManager.emittedEvents, ['reldens.onPreparePlayerCreationFormSubmit']);
            this.assert.strictEqual(gameManager.isCreatingPlayer, true);
        });
    }

    async testTheFormSubmitsAgainAfterTheErrorAnswer()
    {
        await this.test('the form submits again once the error answer clears the pending creation', async () => {
            let gameManager = this.createGameManager();
            this.submit(gameManager, 'TakenName');
            gameManager.isCreatingPlayer = false;
            this.assert.strictEqual(this.submit(gameManager, 'OtherName'), true);
            this.assert.strictEqual(gameManager.sentMessages.length, 2);
        });
    }

    async testAShortNameIsNotSent()
    {
        await this.test('a name shorter than 3 characters is not sent and does not block the form', async () => {
            let gameManager = this.createGameManager();
            this.assert.strictEqual(this.submit(gameManager, 'ab'), false);
            this.assert.deepStrictEqual(gameManager.sentMessages, []);
            this.assert.strictEqual(gameManager.isCreatingPlayer, false);
        });
    }

    async testALostConnectionAlertsTheReload()
    {
        await this.test('a lost connection on the create request alerts the reload', async () => {
            let gameManager = this.createGameManager(true);
            this.assert.strictEqual(this.submit(gameManager, 'NewHero'), true);
            this.assert.deepStrictEqual(gameManager.alerts, ['translated:game.errors.connectionLost']);
            this.assert.deepStrictEqual(gameManager.sentMessages, []);
        });
    }

}

module.exports.TestPlayerCreationForm = TestPlayerCreationForm;
