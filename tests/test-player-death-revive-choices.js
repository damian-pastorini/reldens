/**
 *
 * Reldens - Test Player Death Revive Choices
 *
 */

const { BaseTest } = require('./base-test');
const { DeathRelocationBuilder } = require('./fixtures/death-relocation-builder');
const { ActionsConst } = require('../lib/actions/constants');
const { GameConst } = require('../lib/game/constants');

class TestPlayerDeathReviveChoices extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.deathBuilder = new DeathRelocationBuilder();
        this.choices = ActionsConst.DEATH.RESTORATION_ITEM_CHOICES;
        this.choicePath = ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE;
        this.askedItem = this.deathBuilder.askedRestorationItemConfig;
        this.consumedItem = this.deathBuilder.consumedRestorationItem;
        this.townChange = this.deathBuilder.townSceneChange;
        this.teleportDisabled = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};
    }

    createAskedItemSetup()
    {
        let setup = this.deathBuilder.createRelocatorSetup(this.askedItem, {restorationQty: 1});
        this.deathBuilder.startDeath(setup);
        return setup;
    }

    async testUsedRestorationItemRevivesWhereThePlayerDied()
    {
        await this.test('the chosen restoration item is used once and revives the player where it died', async () => {
            let setup = this.createAskedItemSetup();
            let relocator = setup.relocator;
            this.assert.strictEqual(relocator.chooseRestorationItem(setup.playerSchema, setup.room, true), true);
            this.assert.strictEqual(relocator.chooseRestorationItem(setup.playerSchema, setup.room, false), false);
            this.assert.strictEqual(setup.playerSchema.getPrivate(this.choicePath), this.choices.USE);
            this.assert.strictEqual(setup.relocator.isRestorationItemQuestionOpen(setup.playerSchema), false);
            this.assert.strictEqual(setup.relocator.isRestorationItemUsed(setup.playerSchema), true);
            this.assert.strictEqual(await setup.relocator.resolveDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.playerSchema.inventory.manager.decreasedItems, this.consumedItem);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
        });
    }

    async testKeptOrUnansweredRestorationItemRevivesInTown()
    {
        await this.test('the kept or unanswered restoration item is not consumed and revives in town', async () => {
            let keptSetup = this.createAskedItemSetup();
            this.assert.strictEqual(
                keptSetup.relocator.chooseRestorationItem(keptSetup.playerSchema, keptSetup.room, false),
                true
            );
            this.assert.strictEqual(keptSetup.playerSchema.getPrivate(this.choicePath), this.choices.KEEP);
            this.assert.strictEqual(keptSetup.relocator.isRestorationItemQuestionOpen(keptSetup.playerSchema), false);
            let unansweredSetup = this.createAskedItemSetup();
            this.assert.strictEqual(
                unansweredSetup.relocator.isRestorationItemQuestionOpen(unansweredSetup.playerSchema),
                true
            );
            for(let setup of [keptSetup, unansweredSetup]){
                this.assert.strictEqual(setup.relocator.isRestorationItemUsed(setup.playerSchema), false);
                this.assert.strictEqual(await setup.relocator.resolveDeath(setup.event), true);
                this.assert.deepStrictEqual(setup.playerSchema.inventory.manager.decreasedItems, []);
                this.assert.deepStrictEqual(setup.sceneChanges, this.townChange);
                this.assert.strictEqual(setup.revivedPlayers, 0);
            }
        });
    }

    async testRestorationItemChoiceIsRejected()
    {
        await this.test('the restoration item choice is rejected when it is not asked', async () => {
            let rejectedCases = [
                {configValues: {}, setupOptions: {restorationQty: 1}},
                {
                    configValues: Object.assign({}, this.teleportDisabled, this.askedItem),
                    setupOptions: {restorationQty: 1}
                },
                {configValues: this.askedItem, setupOptions: {restorationQty: 0}}
            ];
            for(let rejectedCase of rejectedCases){
                let rejectedSetup = this.deathBuilder.createRelocatorSetup(
                    rejectedCase.configValues,
                    rejectedCase.setupOptions
                );
                this.deathBuilder.startDeath(rejectedSetup);
                this.assert.strictEqual(
                    rejectedSetup.relocator.chooseRestorationItem(rejectedSetup.playerSchema, rejectedSetup.room, true),
                    false
                );
                this.assert.strictEqual(rejectedSetup.playerSchema.getPrivate(this.choicePath), null);
            }
            let setup = this.createAskedItemSetup();
            this.assert.strictEqual(setup.relocator.chooseRestorationItem(setup.playerSchema, {}, true), false);
            this.assert.strictEqual(setup.relocator.chooseRestorationItem(false, setup.room, true), false);
            setup.playerSchema.inState = GameConst.STATUS.ACTIVE;
            this.assert.strictEqual(setup.relocator.chooseRestorationItem(setup.playerSchema, setup.room, true), false);
            this.assert.strictEqual(setup.playerSchema.getPrivate(this.choicePath), null);
        });
    }

    async testNextDeathAsksTheRestorationItemAgain()
    {
        await this.test('the next death asks the restoration item again after a previous choice', async () => {
            let setup = this.createAskedItemSetup();
            setup.relocator.chooseRestorationItem(setup.playerSchema, setup.room, false);
            this.deathBuilder.startDeath(setup);
            this.assert.strictEqual(setup.relocator.isRestorationItemQuestionOpen(setup.playerSchema), true);
            this.assert.strictEqual(setup.relocator.chooseRestorationItem(setup.playerSchema, setup.room, true), true);
        });
    }

    async testResurrectionAdRewardUsesTheRestorationItem()
    {
        await this.test('the accepted resurrection ad reward uses the restoration item without asking', async () => {
            let setup = this.createAskedItemSetup();
            this.assert.strictEqual(setup.relocator.acceptResurrectionAdReward(setup.playerSchema), true);
            this.assert.strictEqual(setup.relocator.isRestorationItemQuestionOpen(setup.playerSchema), false);
            this.assert.strictEqual(await setup.relocator.resolveDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.playerSchema.inventory.manager.decreasedItems, this.consumedItem);
            this.assert.strictEqual(setup.revivedPlayers, 1);
        });
    }

    async testDisabledTeleportNeverConsumesTheRestorationItem()
    {
        await this.test('the disabled death teleport revives where the player died keeping the item', async () => {
            let setup = this.deathBuilder.createRelocatorSetup(
                Object.assign({}, this.teleportDisabled, this.askedItem),
                {restorationQty: 1}
            );
            this.assert.strictEqual(await setup.relocator.resolveDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.playerSchema.inventory.manager.decreasedItems, []);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
        });
    }

}

module.exports.TestPlayerDeathReviveChoices = TestPlayerDeathReviveChoices;
