/**
 *
 * Reldens - Test NPC Rewards
 *
 * Tests the options of the sample NPCs with their own server classes (exclusive group, NpcDialogSteps, the option
 * buttons clicked on the dialog, the player inventory preserved for the group and the quantities of the used items set
 * on the live inventory): the healer option 1 restores the life and option 3 the MP with their answers, option 2 gives
 * one heal and one magic potion, and the interaction alone changes nothing; the weapons master shows its options as
 * icon buttons with the stored item images, gives the axe or the spear with its answer and gives no second item that
 * the player already owns; and the forest quest NPC closes the dialog with option 2, and with option 1 refuses a
 * player with 10 coins or without a tree branch, or takes one branch and gives one coin.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { NpcDialogSteps } = require('./helpers/npc-dialog-steps');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { ItemsSteps } = require('./helpers/items-steps');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestNpcRewards
{

    static HEALER_KEY = 'healer_1';
    static WEAPONS_MASTER_KEY = 'weapons_master_1';
    static QUEST_NPC_KEY = 'quest_npc_1';
    static HEAL_POTION_KEY = 'heal_potion_20';
    static MAGIC_POTION_KEY = 'magic_potion_20';
    static COINS_KEY = 'coins';
    static BRANCH_KEY = 'branch';
    static TOO_MANY_COINS = 10;
    static LOW_VALUE = 1;
    static ANSWERS = {
        hp: 'Your HP points has been restored!',
        mp: 'Your MP points has been restored!',
        potions: 'Then I will give you some items for later, you never know...',
        owned: 'You already have the item.',
        tooMany: 'You have too many already.',
        noBranch: 'You do not have any tree branches!',
        given: 'All yours!'
    };
    static fetchPlayer = async (context, player) => await GameplayE2eStateApi.fetchPlayer(
        context.gameConfig,
        player.roomName,
        player.playerName
    );
    static lowerLife = async (context, player) => await RoomObjectsApi.setPlayerAffectedProperty(
        context.gameConfig,
        player.roomName,
        player.playerName,
        TestNpcRewards.LOW_VALUE
    );

    static async enterPlayer(context, roomName = Login.TOWN_ROOM_NAME)
    {
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        await E2eSeedAndRestoreApi.preserveRows(context.gameConfig, context.e2eGroup, 'itemsInventory', {
            owner_id: player.playerId
        });
        player.roomName = roomName;
        if(Login.TOWN_ROOM_NAME !== roomName){
            await TeamSteps.changeScene(context, player, Login.TOWN_ROOM_NAME, roomName);
            await RoomObjectsApi.disableEnemies(context.gameConfig, roomName, true);
        }
        return player;
    }

    static async chooseOption(npc, optionValue, answer)
    {
        await npc.dialog.locator('[data-option-value="'+optionValue+'"]').click();
        await expect(npc.dialog.locator('.box-content'), 'The NPC answers the chosen option')
            .toHaveText(answer, {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async runHealerLifeTest(context)
    {
        let player = await TestNpcRewards.enterPlayer(context);
        await TestNpcRewards.lowerLife(context, player);
        let npc = await NpcDialogSteps.openDialog(context, player.page, TestNpcRewards.HEALER_KEY);
        await TestNpcRewards.chooseOption(npc, '1', TestNpcRewards.ANSWERS.hp);
        let healed = await TestNpcRewards.fetchPlayer(context, player);
        expect(healed.life, 'The healer restores the full life').toBe(healed.totalLife);
    }

    static async runHealerMpTest(context)
    {
        let player = await TestNpcRewards.enterPlayer(context);
        await GameplayE2eStateApi.setPlayerStats(context.gameConfig, player.roomName, player.playerName, {
            mp: TestNpcRewards.LOW_VALUE
        });
        let npc = await NpcDialogSteps.openDialog(context, player.page, TestNpcRewards.HEALER_KEY);
        await TestNpcRewards.chooseOption(npc, '3', TestNpcRewards.ANSWERS.mp);
        let healed = await TestNpcRewards.fetchPlayer(context, player);
        expect(healed.stats.mp, 'The healer restores the full MP').toBe(healed.statsBase.mp);
    }

    static async runHealerPotionsTest(context, isOptionChosen)
    {
        let player = await TestNpcRewards.enterPlayer(context);
        let noPotions = {[TestNpcRewards.HEAL_POTION_KEY]: 0, [TestNpcRewards.MAGIC_POTION_KEY]: 0};
        await ItemsSteps.setQuantities(context, player, noPotions);
        await TestNpcRewards.lowerLife(context, player);
        let npc = await NpcDialogSteps.openDialog(context, player.page, TestNpcRewards.HEALER_KEY);
        if(!isOptionChosen){
            await player.page.waitForTimeout(TimeConstants.ACTION);
            await ItemsSteps.expectStoredQuantities(context, player, noPotions, 'The interaction gives no item');
            expect((await TestNpcRewards.fetchPlayer(context, player)).life, 'The interaction heals nothing')
                .toBe(TestNpcRewards.LOW_VALUE);
            return;
        }
        await TestNpcRewards.chooseOption(npc, '2', TestNpcRewards.ANSWERS.potions);
        await ItemsSteps.expectStoredQuantities(
            context,
            player,
            {[TestNpcRewards.HEAL_POTION_KEY]: 1, [TestNpcRewards.MAGIC_POTION_KEY]: 1},
            'The healer gives one heal and one magic potion'
        );
    }

    static async runWeaponsIconsTest(context)
    {
        let player = await TestNpcRewards.enterPlayer(context);
        let npc = await NpcDialogSteps.openDialog(context, player.page, TestNpcRewards.WEAPONS_MASTER_KEY);
        let npcRow = [...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'objects', {client_key: npc.npcKey})].shift();
        let options = sc.toJson(npcRow.client_params).options;
        for(let optionKey of Object.keys(options)){
            let icon = npc.dialog.locator('img[data-option-value="'+options[optionKey].value+'"]');
            await expect(icon, 'The option '+optionKey+' is an icon button').toHaveAttribute(
                'src',
                new RegExp('/assets/custom/items/'+options[optionKey].icon+'\\.png$')
            );
            await expect(icon, 'The option '+optionKey+' icon shows its label').toHaveAttribute('alt', options[optionKey].label);
        }
    }

    static async runWeaponTest(context, optionValue, itemKey, ownedQuantity)
    {
        let player = await TestNpcRewards.enterPlayer(context);
        await ItemsSteps.setQuantities(context, player, {[itemKey]: ownedQuantity});
        let npc = await NpcDialogSteps.openDialog(context, player.page, TestNpcRewards.WEAPONS_MASTER_KEY);
        let itemRow = [...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'itemsItem', {key: itemKey})].shift();
        await TestNpcRewards.chooseOption(
            npc,
            optionValue,
            0 < ownedQuantity
                ? TestNpcRewards.ANSWERS.owned
                : 'Do not forget to equip your new '+itemRow.label+' before go to the battle.'
        );
        await ItemsSteps.expectStoredQuantities(context, player, {[itemKey]: 1}, 'The player owns one '+itemKey);
    }

    static async runQuestCloseTest(context)
    {
        let player = await TestNpcRewards.enterPlayer(context, Login.FOREST_ROOM_NAME);
        let npc = await NpcDialogSteps.openDialog(context, player.page, TestNpcRewards.QUEST_NPC_KEY, player.roomName);
        await npc.dialog.locator('[data-option-value="2"]').click();
        await expect(npc.dialog, 'The quest NPC option 2 closes the dialog')
            .toHaveCount(0, {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async runQuestBranchTest(context, quantities, answer, expectedQuantities)
    {
        let player = await TestNpcRewards.enterPlayer(context, Login.FOREST_ROOM_NAME);
        await ItemsSteps.setQuantities(context, player, quantities);
        let npc = await NpcDialogSteps.openDialog(context, player.page, TestNpcRewards.QUEST_NPC_KEY, player.roomName);
        await TestNpcRewards.chooseOption(npc, '1', answer);
        await ItemsSteps.expectStoredQuantities(context, player, expectedQuantities, 'The coins and branches after the option');
    }

    static run()
    {
        test.describe('NPC Rewards', () => {
            test('the healer option 1 restores the full life with its answer', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcRewards.runHealerLifeTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the healer option 3 restores the full MP with its answer', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcRewards.runHealerMpTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the healer option 2 gives one heal and one magic potion with its answer', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcRewards.runHealerPotionsTest({page, gameConfig, e2eGroup, longRun}, true);
            });
            test('the healer interaction without an option heals nothing and gives no item', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcRewards.runHealerPotionsTest({page, gameConfig, e2eGroup, longRun}, false);
            });
            test('the weapons master options are icon buttons with the stored item images', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcRewards.runWeaponsIconsTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the weapons master option axe gives the axe with its answer', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcRewards.runWeaponTest({page, gameConfig, e2eGroup, longRun}, '1', 'axe', 0);
            });
            test('the weapons master option spear gives the spear with its answer', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcRewards.runWeaponTest({page, gameConfig, e2eGroup, longRun}, '2', 'spear', 0);
            });
            test('the weapons master gives no second item the player already owns', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcRewards.runWeaponTest({page, gameConfig, e2eGroup, longRun}, '1', 'axe', 1);
            });
            test('the quest NPC option 2 closes the dialog', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcRewards.runQuestCloseTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the quest NPC refuses a player with 10 coins', async ({ page, gameConfig, e2eGroup, longRun }) => {
                let quantities = {[TestNpcRewards.COINS_KEY]: TestNpcRewards.TOO_MANY_COINS, [TestNpcRewards.BRANCH_KEY]: 1};
                await TestNpcRewards.runQuestBranchTest(
                    {page, gameConfig, e2eGroup, longRun},
                    quantities,
                    TestNpcRewards.ANSWERS.tooMany,
                    quantities
                );
            });
            test('the quest NPC refuses a player without a tree branch', async ({ page, gameConfig, e2eGroup, longRun }) => {
                let quantities = {[TestNpcRewards.COINS_KEY]: 0, [TestNpcRewards.BRANCH_KEY]: 0};
                await TestNpcRewards.runQuestBranchTest(
                    {page, gameConfig, e2eGroup, longRun},
                    quantities,
                    TestNpcRewards.ANSWERS.noBranch,
                    quantities
                );
            });
            test('the quest NPC takes one tree branch and gives one coin', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestNpcRewards.runQuestBranchTest(
                    {page, gameConfig, e2eGroup, longRun},
                    {[TestNpcRewards.COINS_KEY]: 0, [TestNpcRewards.BRANCH_KEY]: 1},
                    TestNpcRewards.ANSWERS.given,
                    {[TestNpcRewards.COINS_KEY]: 1, [TestNpcRewards.BRANCH_KEY]: 0}
                );
            });
        });
    }

}

TestNpcRewards.run();
