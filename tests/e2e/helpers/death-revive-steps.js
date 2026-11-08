/**
 *
 * Reldens - Death Revive Steps
 *
 * The death and revive steps of the death specs, over a context with the page, the screenshots, the game config, the
 * e2e group and the long run flag: override the death config for the group (the death teleport enabled unless overridden),
 * enter the forest and kill the player there with a real enemy hit (the aggressive enemies are disabled after the death
 * so the revived player is not killed again), optionally carrying one restoration item, and check the game over box:
 * the translated revive message of each case with the town room title and the restoration item label read from their
 * stored rows, the resurrection ad button only when the ad is offered, the restoration item question with its yes and
 * no buttons, the seconds left to the revive and the revive button once the game over time passed. Then the revive is
 * checked where the player died, consuming the item, or in the town room. The random drop of the player items is off
 * for the group, so a death only changes the restoration item. Before the long run recording starts, a passive enemy is
 * placed and targeted next to the player at the center of the map (ForestEnemyKill), the chat panel, plus the inventory
 * panel when the case needs it, are opened and the player life is lowered; once recording, the battle starts in place,
 * so the video shows every enemy hit that kills the player, with the recording steps telling the general flow of the
 * case (DeathReviveShowcase). The long run shortens the game over time to what each case needs on screen, the question
 * and the ad cases need the time for their clicks, their reward and to read their steps.
 *
 */

const { expect, test } = require('@playwright/test');
const { Login } = require('./login');
const { Navigation } = require('./navigation');
const { RoomObjectsApi } = require('./room-objects-api');
const { TestCombatDeath } = require('./test-combat-death');
const { ForestEnemyKill } = require('./forest-enemy-kill');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./long-run-showcase');
const { DeathReviveShowcase } = require('./death-revive-showcase');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');
const { ActionsConst } = require('../../../lib/actions/constants');
const ActionsTranslations = require('../../../lib/actions/client/snippets/en_US');

class DeathReviveSteps
{

    static LONG_RUN_GAME_OVER_TIME_OUT = 5000;
    static LONG_RUN_ASKED_ITEM_TIME_OUT = 9000;
    static ENEMY_ATTACK_STEP = 'The enemy attacks the player until it dies';
    static DROP_PERCENT_PATH = 'server/players/drop/percent';
    static NO_DROP_PERCENT = 0;
    static DEATH_SNIPPETS = ActionsTranslations.actions.death;
    static ASKED_ITEM_CONFIG = {[ActionsConst.DEATH.CONFIG_PATHS.AUTO_CONSUME_RESTORATION_ITEM]: false};
    static MANUAL_REVIVE_CONFIG = {[ActionsConst.DEATH.CONFIG_PATHS.AUTO_REVIVE]: false};

    static async prepareDeath(context, configValues = {}, longRunTimeOut = DeathReviveSteps.LONG_RUN_GAME_OVER_TIME_OUT)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + TimeConstants.ENEMY_KILL
            + TimeConstants.PLAYER_REVIVE
            + TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, context.longRun)
        );
        context.gameOverTimeOut = context.longRun ? longRunTimeOut : Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(
                context.gameConfig,
                ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT
            )
        );
        let deathConfig = Object.assign({
            [ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: true,
            [ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT]: context.gameOverTimeOut,
            [DeathReviveSteps.DROP_PERCENT_PATH]: DeathReviveSteps.NO_DROP_PERCENT
        }, configValues);
        for(let configPath of Object.keys(deathConfig)){
            await E2eSeedAndRestoreApi.overrideConfig(
                context.gameConfig,
                context.e2eGroup,
                configPath,
                deathConfig[configPath]
            );
        }
        let restorationItemKey = await E2eSeedAndRestoreApi.fetchConfigValue(
            context.gameConfig,
            ActionsConst.DEATH.CONFIG_PATHS.RESTORATION_ITEM_KEY
        );
        context.reviveLabels = await DeathReviveSteps.fetchReviveLabels(context.gameConfig, restorationItemKey);
        return restorationItemKey;
    }

    static async fetchReviveLabels(gameConfig, restorationItemKey = '')
    {
        let reviveLabels = {
            townRoom: [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rooms', {
                id: Number(await E2eSeedAndRestoreApi.fetchConfigValue(
                    gameConfig,
                    ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID
                ))
            })].shift(),
            itemLabel: ''
        };
        if(restorationItemKey){
            reviveLabels.itemLabel = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItem', {
                key: restorationItemKey
            })].shift().label;
        }
        return reviveLabels;
    }

    static async enterForest(context, withInventory = false, firstStep = DeathReviveSteps.ENEMY_ATTACK_STEP)
    {
        let page = context.page;
        let forestData = await Login.loginAndEnterForest(page, context.gameConfig, context.longRun);
        let placement = context.longRun
            ? await ForestEnemyKill.placeEnemyToKillPlayer(page, context.gameConfig, forestData.sceneTimeout)
            : {};
        if(withInventory){
            await LongRunShowcase.openPanel(page, Selectors.hud.inventoryOpen, Selectors.inventory.ui, context.longRun);
        }
        await LongRunShowcase.openPanel(page, Selectors.hud.chatOpen, Selectors.chat.input, context.longRun);
        await DeathReviveShowcase.lowerLife(context);
        await LongRunShowcase.startGameplayRecording(page, context.longRun, firstStep);
        return placement;
    }

    static async killPlayerInForest(context, placement, deathStep)
    {
        await (context.longRun
            ? ForestEnemyKill.fightUntilPlayerDeath(
                context.page,
                context.gameConfig,
                placement.enemyKey,
                TimeConstants.ENEMY_KILL
            )
            : TestCombatDeath.killPlayerWithEnemyAttack(
                context.page,
                context.gameConfig,
                context.gameConfig.e2eEnemyKey,
                TimeConstants.ENEMY_KILL
            ));
        await DeathReviveShowcase.showStep(context, deathStep);
        await RoomObjectsApi.disableEnemies(context.gameConfig, Login.FOREST_ROOM_NAME, true);
        await context.screenshots.capture(context.page, 'player-dead-in-forest');
    }

    static async killPlayerWithRestorationItem(context, configValues, longRunTimeOut, createDeathStep)
    {
        let restorationItemKey = await DeathReviveSteps.prepareDeath(context, configValues, longRunTimeOut);
        await E2eSeedAndRestoreApi.seedInventoryItem(
            context.gameConfig,
            context.e2eGroup,
            context.gameConfig.e2ePlayerName,
            restorationItemKey,
            1
        );
        let placement = await DeathReviveSteps.enterForest(
            context,
            true,
            'The player carries the '+context.reviveLabels.itemLabel+' and the enemy attacks it until it dies'
        );
        await DeathReviveShowcase.expectShownItem(context, restorationItemKey);
        await DeathReviveSteps.killPlayerInForest(context, placement, createDeathStep(context.reviveLabels));
        return restorationItemKey;
    }

    static async expectGameOverMessage(context, reviveMessage, resurrectionAdButtons)
    {
        let page = context.page;
        await expect(page.locator(Selectors.gameOver.box), 'The game over box must be shown').toBeVisible();
        await expect(page.locator(Selectors.gameOver.title)).toHaveText(DeathReviveSteps.DEATH_SNIPPETS.title);
        await expect(
            page.locator(Selectors.gameOver.reviveMessage),
            'The game over box must tell how the player revives'
        ).toHaveText(reviveMessage);
        await expect(
            page.locator(Selectors.gameOver.resurrectionAdButton),
            'The resurrection ad button is shown only when the ad is offered'
        ).toHaveCount(resurrectionAdButtons);
        await context.screenshots.capture(page, 'game-over-revive-message');
        await LongRunShowcase.pause(page, context.longRun);
    }

    static async expectTownGameOverMessage(context, resurrectionAdButtons)
    {
        let townRoom = (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom;
        await DeathReviveSteps.expectGameOverMessage(
            context,
            DeathReviveSteps.DEATH_SNIPPETS.reviveInTown.replace('%townLabel', townRoom.title),
            resurrectionAdButtons
        );
        return townRoom.name;
    }

    static async expectItemReviveMessage(context, restorationItemKey)
    {
        await DeathReviveSteps.expectGameOverMessage(
            context,
            DeathReviveSteps.DEATH_SNIPPETS.reviveWithRestorationItem.replace(
                '%itemLabel',
                (await DeathReviveSteps.fetchReviveLabels(context.gameConfig, restorationItemKey)).itemLabel
            ),
            0
        );
        await expect(
            context.page.locator(Selectors.gameOver.restorationItemUseButton),
            'The restoration item is not asked once it is used'
        ).toHaveCount(0);
    }

    static async expectRevivedInForest(context, restorationItemKey)
    {
        await DeathReviveSteps.expectItemReviveMessage(context, restorationItemKey);
        await DeathReviveSteps.expectItemConsumedInForest(context, restorationItemKey);
    }

    static async expectItemConsumedInForest(context, restorationItemKey)
    {
        let page = context.page;
        let revived = await TestCombatDeath.waitForPlayerHpCondition(page, 'alive', TimeConstants.PLAYER_REVIVE);
        expect(revived, 'The player must revive').toBe(true);
        expect(await Navigation.getCurrentRoomName(page), 'The player must revive where it died').toBe(
            Login.FOREST_ROOM_NAME
        );
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 0);
        await DeathReviveShowcase.showStep(
            context,
            'The player revived where it died and the '+context.reviveLabels.itemLabel+' was consumed'
        );
        await LongRunShowcase.showElementsCount(
            page,
            Selectors.inventory.itemImage(restorationItemKey),
            0,
            TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, context.longRun),
            context.longRun
        );
        await context.screenshots.capture(page, 'player-revived-in-forest');
    }

    static async expectRestorationItemQuantity(context, restorationItemKey, expectedQuantity)
    {
        let restorationRows = await E2eSeedAndRestoreApi.loadInventoryRows(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            restorationItemKey
        );
        expect(
            restorationRows.reduce((totalQuantity, row) => totalQuantity + Number(row.qty), 0),
            'The stored restoration item quantity must be '+expectedQuantity
        ).toBe(expectedQuantity);
    }

    static async expectRevivedInTown(context, townRoomName)
    {
        let gameConfig = context.gameConfig;
        await Navigation.waitForRoom(
            context.page,
            townRoomName,
            TimeConstants.PLAYER_REVIVE + TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, context.longRun)
        );
        await expect.poll(
            async () => (
                await GameplayE2eStateApi.fetchPlayer(gameConfig, townRoomName, gameConfig.e2ePlayerName)
            ).life,
            {message: 'The player must be alive in the town room'}
        ).toBeGreaterThan(0);
        await DeathReviveShowcase.showRevivedInTown(context);
        await LongRunShowcase.pause(context.page, context.longRun);
        await context.screenshots.capture(context.page, 'player-revived-in-town');
    }

    static async expectRestorationItemQuestion(context, restorationItemKey)
    {
        let reviveLabels = await DeathReviveSteps.fetchReviveLabels(context.gameConfig, restorationItemKey);
        await expect(context.page.locator(Selectors.gameOver.restorationItemUseButton)).toHaveText(
            DeathReviveSteps.DEATH_SNIPPETS.restorationItemUseButton
        );
        await expect(context.page.locator(Selectors.gameOver.restorationItemKeepButton)).toHaveText(
            DeathReviveSteps.DEATH_SNIPPETS.restorationItemKeepButton
        );
        await DeathReviveSteps.expectGameOverMessage(
            context,
            DeathReviveSteps.DEATH_SNIPPETS.askRestorationItem.replace('%itemLabel', reviveLabels.itemLabel)
                .replace('%townLabel', reviveLabels.townRoom.title),
            0
        );
    }

    static async expectReviveWait(context)
    {
        await expect(
            context.page.locator(Selectors.gameOver.wait),
            'The game over box must tell the seconds left to the revive'
        ).toHaveText(DeathReviveSteps.DEATH_SNIPPETS.reviveWait.replace(
            '%seconds',
            String(Math.ceil(context.gameOverTimeOut / ActionsConst.DEATH.DEFAULTS.SECOND_MS))
        ));
        await expect(
            context.page.locator(Selectors.gameOver.reviveButton),
            'The revive button is shown only once the game over time passed'
        ).toHaveCount(0);
    }

    static async requestReviveInForest(context)
    {
        let page = context.page;
        await expect(
            page.locator(Selectors.gameOver.reviveButton),
            'The revive button must be shown once the game over time passed'
        ).toHaveText(DeathReviveSteps.DEATH_SNIPPETS.reviveButton, {timeout: TimeConstants.PLAYER_REVIVE});
        await expect(page.locator(Selectors.gameOver.wait)).toHaveText(DeathReviveSteps.DEATH_SNIPPETS.reviveReady);
        let deadPlayer = await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName
        );
        expect(deadPlayer.life, 'The player must stay dead until it asks for the revive').toBe(0);
        await context.screenshots.capture(page, 'game-over-revive-button');
        await DeathReviveShowcase.showStep(context, 'The wait ended: the player stays dead until it clicks Revive');
        await LongRunShowcase.pause(page, context.longRun);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.reviveButton);
    }

}

module.exports.DeathReviveSteps = DeathReviveSteps;
