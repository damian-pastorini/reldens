/**
 *
 * Reldens - Test Ad Skins
 *
 * Tests the ad items that give a skin: with the skin ad enabled for the group and a skin ticket seeded in the player
 * inventory, using the ticket from the inventory panel keeps it (the use only asks the client to play the skin ad),
 * the ad played by the client ads provider through the e2e SDK mock (AdMessagesPlayer) consumes the ticket and rewards
 * the skin item, and equipping the skin item changes the player avatar on the server and on the client sprite until it
 * is unequipped. Before every item action the item details (ItemDetailsShowcase) show the stored label and description.
 * A failed skin ad (the mock calls the provider error callback) is closed without consuming the ticket nor giving the
 * skin item, and the chat tells the player the translated skin ad failure. The keys come from the stored config and
 * item rows. The long run prepares everything before the recording starts (the SDK ready, the player walked to the
 * center of the house and, for the failed ad, the chat open) and captions each step with the stored tickets and skin
 * items, since the panels do not make those counts readable; the mock also shows the failure in its ad overlay and
 * the caption tells it once the overlay does.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { ShowcaseSteps } = require('./helpers/showcase-steps');
const { ItemDetailsShowcase } = require('./helpers/item-details-showcase');
const { SkinSteps } = require('./helpers/skin-steps');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const UsersTranslations = require('../../lib/users/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdSkins
{

    static FAILURE_NOTICE_MS = 2500;
    static FAILURE_NOTICE_SELECTOR = '.mock-ad-failed';
    static FAILURE_NOTICE_TITLE = 'The ad failed';

    static async fetchAvatarKeys(page, gameConfig, roomName)
    {
        return {
            server: (await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, gameConfig.e2ePlayerName)).avatarKey,
            client: await page.evaluate(
                () => window.reldens.getActiveScene().player.players[window.reldens.activeRoomEvents.room.sessionId]
                    .avatarKey
            )
        };
    }

    static async fetchItemQuantities(gameConfig, playerName, itemKey)
    {
        return (await E2eSeedAndRestoreApi.loadInventoryRows(gameConfig, playerName, itemKey)).map(
            row => Number(row.qty)
        );
    }

    static async fetchItemTotal(gameConfig, playerName, itemKey)
    {
        return (await TestAdSkins.fetchItemQuantities(gameConfig, playerName, itemKey)).reduce(
            (total, qty) => total + qty,
            0
        );
    }

    static async createItemsStep(gameConfig, skinAdData, stepText)
    {
        let playerName = skinAdData.playerName;
        return stepText+' - tickets: '
            +await TestAdSkins.fetchItemTotal(gameConfig, playerName, skinAdData.skinData.ticketItemKey)
            +', skin items: '
            +await TestAdSkins.fetchItemTotal(gameConfig, playerName, skinAdData.skinData.rewardItemKey);
    }

    static async showItemsStep(page, gameConfig, skinAdData, stepText, longRun)
    {
        if(!longRun){
            return false;
        }
        return await LongRunShowcase.showStep(
            page,
            await TestAdSkins.createItemsStep(gameConfig, skinAdData, stepText),
            longRun
        );
    }

    static async showFailureInAdOverlay(page, longRun)
    {
        if(!longRun){
            return false;
        }
        return await page.evaluate((failureNoticeMs) => {
            window.CrazyGames.SDK.failureNoticeMs = failureNoticeMs;
            return true;
        }, TestAdSkins.FAILURE_NOTICE_MS);
    }

    static async showFailureNotice(page, gameConfig, skinAdData, timeout, longRun)
    {
        if(!longRun){
            return false;
        }
        await LongRunShowcase.showStepWhenText(
            page,
            TestAdSkins.FAILURE_NOTICE_SELECTOR,
            TestAdSkins.FAILURE_NOTICE_TITLE,
            await TestAdSkins.createItemsStep(gameConfig, skinAdData, TestAdSkins.FAILURE_NOTICE_TITLE),
            longRun
        );
        await expect(page.locator(TestAdSkins.FAILURE_NOTICE_SELECTOR)).toBeVisible({timeout});
        return true;
    }

    static async closeItemDetails(page, itemKey, longRun)
    {
        if(!longRun){
            return false;
        }
        await page.locator(Selectors.inventory.itemImage(itemKey)).click();
        return true;
    }

    static async fetchPlayedAd(gameConfig, playerName, adId)
    {
        return [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'adsPlayed', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName}),
            ads_id: adId
        })].shift();
    }

    static async clickItemButton(page, gameConfig, panelSelectors, itemKey, buttonSelector, longRun)
    {
        await ItemDetailsShowcase.showDetails(
            page,
            panelSelectors.itemImage(itemKey),
            panelSelectors.itemDetails(itemKey),
            await ItemDetailsShowcase.loadStoredTexts(gameConfig, itemKey),
            longRun
        );
        let itemButton = page.locator(buttonSelector);
        await expect(itemButton).toBeVisible();
        await ShowcaseSteps.click(page, itemButton, longRun);
    }

    static async prepareSkinAd(page, gameConfig, e2eGroup, longRun)
    {
        let skinData = await SkinSteps.loadSkinData(gameConfig);
        let playerName = gameConfig.e2ePlayerName;
        let skinAd = await AdMessagesPlayer.enableAd(gameConfig, e2eGroup, skinData.adsKey, playerName);
        await E2eSeedAndRestoreApi.seedInventoryItem(gameConfig, e2eGroup, playerName, skinData.ticketItemKey, 1);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let adTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
        await AdMessagesPlayer.waitForProviderReady(page, adTimeout);
        let roomName = await Navigation.getCurrentRoomName(page);
        await ShowcaseSteps.placePlayerOnMapCenter(page, gameConfig, roomName, playerName, longRun);
        return {skinData, skinAd, playerName, roomName, adTimeout};
    }

    static async openInventoryAndUseTicket(page, gameConfig, ticketItemKey, longRun)
    {
        await page.click(Selectors.hud.inventoryOpen);
        await expect(page.locator(Selectors.inventory.ui)).toBeVisible();
        await TestAdSkins.clickItemButton(
            page,
            gameConfig,
            Selectors.inventory,
            ticketItemKey,
            Selectors.inventory.itemUse(ticketItemKey),
            longRun
        );
    }

    static async runAdSkinTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let skinAdData = await TestAdSkins.prepareSkinAd(page, gameConfig, e2eGroup, longRun);
        let skinData = skinAdData.skinData;
        let playerName = skinAdData.playerName;
        let roomName = skinAdData.roomName;
        expect(skinData.skinKey, 'The skin ad reward item must have a skin key').toBeTruthy();
        let avatarsBefore = await TestAdSkins.fetchAvatarKeys(page, gameConfig, roomName);
        expect(avatarsBefore.client, 'The client sprite must show the server avatar').toBe(avatarsBefore.server);
        await LongRunShowcase.startGameplayRecording(
            page,
            longRun,
            'Avatar '+avatarsBefore.server+': the player uses the skin ticket'
        );
        await TestAdSkins.openInventoryAndUseTicket(page, gameConfig, skinData.ticketItemKey, longRun);
        await screenshots.capture(page, 'skin-ticket-used');
        expect(
            await TestAdSkins.fetchItemQuantities(gameConfig, playerName, skinData.ticketItemKey),
            'The ticket use only requests the skin ad'
        ).toEqual([1]);
        await TestAdSkins.showItemsStep(page, gameConfig, skinAdData, 'The ticket use only plays the ad', longRun);
        await AdMessagesPlayer.waitForPlayedAd(page, skinAdData.skinAd, skinAdData.adTimeout);
        await expect(page.locator(Selectors.inventory.itemImage(skinData.rewardItemKey))).toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await expect.poll(
            async () => (await TestAdSkins.fetchItemQuantities(gameConfig, playerName, skinData.ticketItemKey)).filter(
                qty => 0 < qty
            ),
            {message: 'The rewarded skin ad must consume the ticket'}
        ).toEqual([]);
        await TestAdSkins.showItemsStep(page, gameConfig, skinAdData, 'The ended ad exchanged the ticket', longRun);
        await page.waitForTimeout(TimeConstants.pauseMs(longRun));
        await screenshots.capture(page, 'skin-item-rewarded');
        await LongRunShowcase.showStep(page, 'Equipping the rewarded skin item', longRun);
        await TestAdSkins.clickItemButton(
            page,
            gameConfig,
            Selectors.inventory,
            skinData.rewardItemKey,
            Selectors.inventory.itemEquip(skinData.rewardItemKey),
            longRun
        );
        await expect.poll(
            async () => await TestAdSkins.fetchAvatarKeys(page, gameConfig, roomName),
            {message: 'The equipped skin must change the server and client avatar'}
        ).toEqual({server: skinData.skinKey, client: skinData.skinKey});
        await ShowcaseSteps.showAndPause(
            page,
            'Skin equipped: avatar '+avatarsBefore.server+' changed to '+skinData.skinKey,
            longRun
        );
        await screenshots.capture(page, 'skin-equipped');
        await LongRunShowcase.showStep(page, 'Unequipping the skin item from the equipment panel', longRun);
        await page.click(Selectors.hud.equipmentOpen);
        await expect(page.locator(Selectors.equipment.ui)).toBeVisible();
        await TestAdSkins.clickItemButton(
            page,
            gameConfig,
            Selectors.equipment,
            skinData.rewardItemKey,
            Selectors.equipment.itemEquip(skinData.rewardItemKey),
            longRun
        );
        await expect.poll(
            async () => await TestAdSkins.fetchAvatarKeys(page, gameConfig, roomName),
            {message: 'The unequipped skin must restore the player avatar'}
        ).toEqual(avatarsBefore);
        await ShowcaseSteps.showAndPause(
            page,
            'Skin unequipped: avatar '+skinData.skinKey+' restored to '+avatarsBefore.server,
            longRun
        );
        await screenshots.capture(page, 'skin-unequipped');
    }

    static async runFailedAdTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let skinAdData = await TestAdSkins.prepareSkinAd(page, gameConfig, e2eGroup, longRun);
        let skinData = skinAdData.skinData;
        let playerName = skinAdData.playerName;
        let skinAd = skinAdData.skinAd;
        await AdMessagesPlayer.failNextAd(page, skinAdData.adTimeout);
        await TestAdSkins.showFailureInAdOverlay(page, longRun);
        await LongRunShowcase.openPanel(page, Selectors.hud.chatOpen, Selectors.chat.input, longRun);
        await LongRunShowcase.startGameplayRecording(page, longRun, 'The next ad will fail');
        await TestAdSkins.openInventoryAndUseTicket(page, gameConfig, skinData.ticketItemKey, longRun);
        await expect.poll(
            async () => await TestAdSkins.fetchPlayedAd(gameConfig, playerName, skinAd.id),
            {message: 'The skin ad start must open the played ad'}
        ).toEqual(expect.objectContaining({started_at: expect.anything(), ended_at: null}));
        await TestAdSkins.showItemsStep(page, gameConfig, skinAdData, 'The ad started and it will fail', longRun);
        await TestAdSkins.showFailureNotice(page, gameConfig, skinAdData, skinAdData.adTimeout, longRun);
        await AdMessagesPlayer.waitForPlayedAd(page, skinAd, skinAdData.adTimeout);
        await expect.poll(
            async () => Boolean((await TestAdSkins.fetchPlayedAd(gameConfig, playerName, skinAd.id)).ended_at),
            {message: 'The failed skin ad must close the played ad'}
        ).toBe(true);
        await expect(
            page.locator(Selectors.chat.tabContentGeneral),
            'The player must be told the failed skin ad kept the ticket'
        ).toContainText(UsersTranslations.users.skinAdFailed, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await screenshots.capture(page, 'skin-ad-failed');
        expect(
            await TestAdSkins.fetchItemQuantities(gameConfig, playerName, skinData.ticketItemKey),
            'The failed skin ad must keep the ticket'
        ).toEqual([1]);
        expect(
            await TestAdSkins.fetchItemQuantities(gameConfig, playerName, skinData.rewardItemKey),
            'The failed skin ad must not give the skin item'
        ).toEqual([]);
        await TestAdSkins.closeItemDetails(page, skinData.ticketItemKey, longRun);
        await TestAdSkins.showItemsStep(
            page,
            gameConfig,
            skinAdData,
            'The chat shows the error: the ticket is kept, no skin item given',
            longRun
        );
        await LongRunShowcase.showElementsCount(
            page,
            Selectors.inventory.itemImage(skinData.ticketItemKey),
            1,
            TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun),
            longRun
        );
    }

    static run()
    {
        test.describe('Ad Skins', () => {
            test('skin ticket ad rewards a skin item that changes the player avatar while equipped', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkins.runAdSkinTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('failed skin ad keeps the ticket and gives no skin item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkins.runFailedAdTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestAdSkins.run();
