/**
 *
 * Reldens - Test Death Revive Requests
 *
 */

const { BaseTest } = require('./base-test');
const { DeathRelocationBuilder } = require('./fixtures/death-relocation-builder');
const { DeathReviveRequests } = require('../lib/actions/server/death-revive-requests');
const { ActionsConst } = require('../lib/actions/constants');

class TestDeathReviveRequests extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.deathBuilder = new DeathRelocationBuilder();
        this.choiceAction = ActionsConst.DEATH.ACTIONS.RESTORATION_ITEM_CHOICE;
        this.choicePath = ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE;
        this.askedItem = this.deathBuilder.askedRestorationItemConfig;
        this.manualInPlaceRevive = Object.assign(
            {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false},
            this.deathBuilder.manualReviveConfig
        );
    }

    createRequestsSetup(configValues = {}, setupOptions = {})
    {
        let setup = this.deathBuilder.createNotifierSetup(configValues, setupOptions);
        this.deathBuilder.startDeath(setup);
        setup.requests = new DeathReviveRequests({
            playerDeathRelocator: setup.relocator,
            deathReviveNotifier: setup.notifier
        });
        setup.createEvent = (messageData) => ({
            room: setup.room,
            client: setup.client,
            messageData,
            playerSchema: setup.playerSchema,
            canContinue: true
        });
        return setup;
    }

    async testReviveRequestRevivesOnlyWhenReady()
    {
        await this.test('the revive request message revives the player only once its revive is ready', async () => {
            let setup = this.createRequestsSetup(this.manualInPlaceRevive);
            let requestEvent = setup.createEvent({act: ActionsConst.DEATH.ACTIONS.REVIVE_REQUEST});
            this.assert.strictEqual(await setup.requests.onBeforeSceneExecuteMessages(requestEvent), false);
            this.assert.strictEqual(setup.revivedPlayers, 0);
            setup.playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_READY, true);
            this.assert.strictEqual(await setup.requests.onBeforeSceneExecuteMessages(requestEvent), true);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.strictEqual(requestEvent.canContinue, true);
            this.assert.deepStrictEqual(setup.client.sentMessages, []);
        });
    }

    async testRestorationItemChoiceIsKeptAndTold()
    {
        await this.test('the restoration item choice is kept and the player is told the chosen revive', async () => {
            let choiceCases = [
                {
                    use: true,
                    choice: ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE,
                    message: this.deathBuilder.itemMessage
                },
                {
                    use: false,
                    choice: ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.KEEP,
                    message: Object.assign({}, this.deathBuilder.townMessage, {resurrectionAdEventKey: ''})
                }
            ];
            for(let choiceCase of choiceCases){
                let setup = this.createRequestsSetup(this.askedItem, {restorationQty: 1});
                let choiceEvent = setup.createEvent({act: this.choiceAction, use: choiceCase.use});
                this.assert.strictEqual(await setup.requests.onBeforeSceneExecuteMessages(choiceEvent), true);
                this.assert.strictEqual(setup.playerSchema.getPrivate(this.choicePath), choiceCase.choice);
                this.assert.deepStrictEqual(setup.client.sentMessages, [choiceCase.message]);
                this.assert.strictEqual(await setup.requests.onBeforeSceneExecuteMessages(choiceEvent), false);
                this.assert.deepStrictEqual(setup.client.sentMessages, [choiceCase.message]);
                this.assert.deepStrictEqual(setup.playerSchema.inventory.manager.decreasedItems, []);
                this.assert.strictEqual(setup.revivedPlayers, 0);
            }
        });
    }

    async testInvalidChoiceValuesAreIgnored()
    {
        await this.test('a restoration item choice that is not a boolean is ignored', async () => {
            let invalidMessages = [
                {act: this.choiceAction},
                {act: this.choiceAction, use: 'true'},
                {act: this.choiceAction, use: 1},
                {act: this.choiceAction, use: 0},
                {act: this.choiceAction, use: null},
                {act: this.choiceAction, use: {}}
            ];
            let setup = this.createRequestsSetup(this.askedItem, {restorationQty: 1});
            for(let invalidMessage of invalidMessages){
                this.assert.strictEqual(
                    await setup.requests.onBeforeSceneExecuteMessages(setup.createEvent(invalidMessage)),
                    false
                );
            }
            this.assert.strictEqual(setup.playerSchema.getPrivate(this.choicePath), null);
            this.assert.deepStrictEqual(setup.client.sentMessages, []);
        });
    }

    async testRejectedChoiceTellsNothing()
    {
        await this.test('a restoration item choice that is not asked is rejected and tells nothing', async () => {
            let rejectedSetups = [
                this.createRequestsSetup({}, {restorationQty: 1}),
                this.createRequestsSetup(this.askedItem, {restorationQty: 0})
            ];
            for(let setup of rejectedSetups){
                let choiceEvent = setup.createEvent({act: this.choiceAction, use: true});
                this.assert.strictEqual(await setup.requests.onBeforeSceneExecuteMessages(choiceEvent), false);
                this.assert.strictEqual(setup.playerSchema.getPrivate(this.choicePath), null);
                this.assert.deepStrictEqual(setup.client.sentMessages, []);
            }
        });
    }

    async testOtherMessagesAreIgnored()
    {
        await this.test('the other messages, an empty message or no message are ignored', async () => {
            let setup = this.createRequestsSetup(
                Object.assign({}, this.deathBuilder.manualReviveConfig, this.askedItem),
                {restorationQty: 1}
            );
            setup.playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_READY, true);
            for(let messageData of [{act: 'otherAction', use: true}, {}, null]){
                let messageEvent = setup.createEvent(messageData);
                this.assert.strictEqual(await setup.requests.onBeforeSceneExecuteMessages(messageEvent), false);
                this.assert.strictEqual(messageEvent.canContinue, true);
            }
            this.assert.strictEqual(setup.playerSchema.getPrivate(this.choicePath), null);
            this.assert.strictEqual(setup.revivedPlayers, 0);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.deepStrictEqual(setup.client.sentMessages, []);
        });
    }

}

module.exports.TestDeathReviveRequests = TestDeathReviveRequests;
