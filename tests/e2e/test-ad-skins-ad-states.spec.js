/**
 *
 * Reldens - Test Ad Skins Ad States
 *
 * Tests the player and ticket states while a skin ad plays, with the skin ad start and end messages a client sends
 * (exclusive group, the skin ad enabled and the tickets seeded by SkinSteps, the inventory, played ads and config values
 * restored by the group reset): an ad that ends while an open trade locks the inventory is closed with no skin item and
 * the ticket kept; a ticket traded away while the ad plays gives no skin item to anyone; the movement messages of a
 * player in a skin ad are ignored until the ad ends; a player in a skin ad keeps its sprite shown on the other client
 * and its body in the world, the other player walking into it collides with it; the ad start of a walking player clears
 * its movement intervals and stops its body; a page reload while the ad plays keeps the ticket and the play
 * open, the player is active on the new login and the kept ticket plays the ad again; a reward that fails (the skin ad
 * reward item set to an unknown item) gives the reserved ticket back, which then plays a rewarded ad again; and the
 * ticket of a dead player plays a rewarded skin ad that never disables nor revives the player.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { SkinSteps } = require('./helpers/skin-steps');
const { TradeSteps } = require('./helpers/trade-steps');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { AdsConst } = require('../../lib/ads/constants');
const { GameConst } = require('../../lib/game/constants');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdSkinsAdStates
{

    static QUIET_MS = 1500;
    static WALK_DISTANCES = [4, 3, 2];
    static DIRECTIONS = {'x1': GameConst.RIGHT, 'x-1': GameConst.LEFT, 'y1': GameConst.DOWN, 'y-1': GameConst.UP};

    static async startAd(context, owner, skinAd)
    {
        await RoomMessagesRecorder.sendMessage(owner.page, {act: AdsConst.ACTIONS.AD_STARTED, ads_id: skinAd.id});
        await TestAdSkinsAdStates.expectPlayerState(context, owner, GameConst.STATUS.DISABLED, 'The skin ad disables the player');
    }

    static async expectPlayerState(context, player, inState, message)
    {
        await expect.poll(
            async () => (await GameplayE2eStateApi.fetchPlayer(context.gameConfig, Login.TOWN_ROOM_NAME, player.playerName)).inState,
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(inState);
    }

    static async endAdAndExpectOwnerItems(context, skinTickets, expectedItems, message)
    {
        let owner = skinTickets.owner;
        await SkinSteps.endAdAfterMinimumDuration(owner, skinTickets.skinAd);
        await SkinSteps.expectPlayedAd(context, owner, skinTickets.skinAd, [true], 'The ad end closes the play');
        await owner.page.waitForTimeout(TestAdSkinsAdStates.QUIET_MS);
        expect(
            await SkinSteps.fetchItems(context.gameConfig, owner.playerName, skinTickets.skinData),
            message
        ).toEqual(expectedItems);
    }

    static async startAdAndOpenTrade(context)
    {
        let skinTickets = await SkinSteps.enterWithTickets(context, [1, 0]);
        let [owner, partner] = skinTickets.players;
        await TestAdSkinsAdStates.startAd(context, owner, skinTickets.skinAd);
        await TradeSteps.open(owner, partner);
        return Object.assign(skinTickets, {owner, partner});
    }

    static async runLockedInventoryTest(context)
    {
        await TestAdSkinsAdStates.endAdAndExpectOwnerItems(
            context,
            await TestAdSkinsAdStates.startAdAndOpenTrade(context),
            {tickets: 1, skins: 0},
            'No skin item and the ticket kept while the trade locks the inventory'
        );
    }

    static async runTradedTicketTest(context)
    {
        let skinTickets = await TestAdSkinsAdStates.startAdAndOpenTrade(context);
        let {owner, partner, skinData} = skinTickets;
        let ticketId = await TradeSteps.fetchItemId(context, owner, skinData.ticketItemKey);
        await TradeSteps.offerAndConfirm(context, owner, partner, ticketId, 1);
        await TradeSteps.confirm(partner, owner);
        await TradeSteps.expectQuantity(context, partner, skinData.ticketItemKey, 1, 'The ticket is traded away during the ad');
        await TestAdSkinsAdStates.endAdAndExpectOwnerItems(
            context,
            skinTickets,
            {tickets: 0, skins: 0},
            'No skin item for the player that traded the ticket away'
        );
        expect(
            await SkinSteps.fetchItems(context.gameConfig, partner.playerName, skinData),
            'The partner keeps the traded ticket and gets no skin item'
        ).toEqual({tickets: 1, skins: 0});
    }

    static async enterOnReturnPoint(context)
    {
        let skinTickets = await SkinSteps.enterWithTickets(context, [1]);
        let owner = skinTickets.players[0];
        let walkContext = MovementScenario.createWalkContext(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            owner.playerName,
            context.longRun
        );
        await MovementScenario.pauseMovingObjects(context.gameConfig, Login.TOWN_ROOM_NAME);
        await MovementScenario.placePlayerOnReturnPoint(owner.page, walkContext);
        return {skinTickets, owner, walkContext};
    }

    static async runIgnoredMovementTest(context)
    {
        let entered = await TestAdSkinsAdStates.enterOnReturnPoint(context);
        let skinTickets = entered.skinTickets;
        let owner = entered.owner;
        let walkContext = entered.walkContext;
        let gameConfig = context.gameConfig;
        let startPlayer = await walkContext.fetchPlayer();
        let walkTile = await RoomMovementApi.fetchClearLineTile(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            owner.playerName,
            TestAdSkinsAdStates.WALK_DISTANCES
        );
        expect(walkTile, 'A clear line of tiles must start on the player').toBeTruthy();
        await TestAdSkinsAdStates.startAd(context, owner, skinTickets.skinAd);
        let ignoredMovement = await MovementScenario.movePlayer(owner.page, walkContext, walkTile, TimeConstants.SERVER_RESPONSE);
        expect(ignoredMovement.done, 'The player in the ad does not walk').toBe(false);
        expect(
            [ignoredMovement.last.currentCol, ignoredMovement.last.currentRow],
            'The player in the ad stays on its tile'
        ).toEqual([startPlayer.currentCol, startPlayer.currentRow]);
        await RoomMessagesRecorder.sendMessage(owner.page, {act: AdsConst.ACTIONS.AD_FAILED, ads_id: skinTickets.skinAd.id});
        await TestAdSkinsAdStates.expectPlayerState(context, owner, GameConst.STATUS.ACTIVE, 'The failed ad activates the player');
        let movement = await MovementScenario.movePlayer(owner.page, walkContext, walkTile, walkContext.navTimeout);
        expect(movement.done, 'The player walks again once the ad ended').toBe(true);
    }

    static async runWalkingAdStartTest(context)
    {
        let entered = await TestAdSkinsAdStates.enterOnReturnPoint(context);
        let skinTickets = entered.skinTickets;
        let owner = entered.owner;
        let gameConfig = context.gameConfig;
        await RoomMessagesRecorder.sendMessage(owner.page, {dir: GameConst.RIGHT});
        await expect.poll(
            async () => await GameplayE2eStateApi.fetchMovementIntervals(gameConfig, Login.TOWN_ROOM_NAME, owner.playerId),
            {message: 'The player walks right', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([owner.playerId+'_'+GameConst.RIGHT]);
        await TestAdSkinsAdStates.startAd(context, owner, skinTickets.skinAd);
        expect(
            await GameplayE2eStateApi.fetchMovementIntervals(gameConfig, Login.TOWN_ROOM_NAME, owner.playerId),
            'The ad start clears the movement of the walking player'
        ).toEqual([]);
        await RoomMovementApi.waitForPlayerStill(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            owner.playerName,
            TimeConstants.SERVER_RESPONSE
        );
        await RoomMessagesRecorder.sendMessage(owner.page, {act: AdsConst.ACTIONS.AD_FAILED, ads_id: skinTickets.skinAd.id});
        await TestAdSkinsAdStates.expectPlayerState(context, owner, GameConst.STATUS.ACTIVE, 'The failed ad activates the player');
    }

    static async runDisabledPlayerBodyTest(context)
    {
        let gameConfig = context.gameConfig;
        let skinTickets = await SkinSteps.enterWithTickets(context, [1, 0]);
        let [owner, other] = skinTickets.players;
        await MovementScenario.pauseMovingObjects(gameConfig, Login.TOWN_ROOM_NAME);
        await TestAdSkinsAdStates.startAd(context, owner, skinTickets.skinAd);
        let ownerSessionId = await owner.page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        let placed = await RoomObjectsApi.placePlayerNearPlayer(gameConfig, Login.TOWN_ROOM_NAME, other.playerName, owner.playerName);
        expect(placed.position, 'The other player is placed next to the player in the ad: '+placed.error).toBeTruthy();
        await SceneSpritesRecorder.waitForShownPlayer(other.page, ownerSessionId, TimeConstants.SERVER_RESPONSE);
        let ownerBody = await RoomMovementApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, owner.playerName);
        let axis = Math.abs(ownerBody.x - placed.position.x) > Math.abs(ownerBody.y - placed.position.y) ? 'x' : 'y';
        let sign = Math.sign(ownerBody[axis] - placed.position[axis]);
        await RoomMessagesRecorder.sendMessage(other.page, {dir: TestAdSkinsAdStates.DIRECTIONS[axis+sign]});
        await expect.poll(
            async () => (await RoomMovementApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, other.playerName)).contacts,
            {message: 'The other player collides with the player in the ad', timeout: TimeConstants.SERVER_RESPONSE}
        ).toContain('player:'+ownerSessionId);
        await RoomMessagesRecorder.sendMessage(other.page, {act: GameConst.STOP});
        await RoomMessagesRecorder.sendMessage(owner.page, {act: AdsConst.ACTIONS.AD_FAILED, ads_id: skinTickets.skinAd.id});
        await TestAdSkinsAdStates.expectPlayerState(context, owner, GameConst.STATUS.ACTIVE, 'The failed ad activates the player');
    }

    static async runReloadDuringAdTest(context)
    {
        let skinTickets = await SkinSteps.enterWithTickets(context, [1]);
        let owner = skinTickets.players[0];
        let skinData = skinTickets.skinData;
        await TestAdSkinsAdStates.startAd(context, owner, skinTickets.skinAd);
        await owner.page.reload();
        await Login.loginRootPlayer(owner.page, context.gameConfig, context.longRun);
        await TestAdSkinsAdStates.expectPlayerState(context, owner, GameConst.STATUS.ACTIVE, 'The player is active on the new login');
        await SkinSteps.expectPlayedAd(context, owner, skinTickets.skinAd, [false], 'The play stays open');
        await SkinSteps.expectItems(context, owner, skinData, {tickets: 1, skins: 0}, 'The ticket is kept');
        await SkinSteps.useTicketAndWaitForAd(context, owner, skinTickets);
        await SkinSteps.expectItems(context, owner, skinData, {tickets: 0, skins: 1}, 'The kept ticket plays the ad again');
    }

    static async overrideRewardItemKey(context, skinAd, rewardItemKey)
    {
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            AdsConst.CONFIG_PATHS.COLLECTION+'/'+skinAd.id+'/rewardItemKey',
            rewardItemKey
        );
    }

    static async runRefusedRewardTest(context)
    {
        let skinTickets = await SkinSteps.enterWithTickets(context, [1]);
        skinTickets.owner = skinTickets.players[0];
        await TestAdSkinsAdStates.overrideRewardItemKey(context, skinTickets.skinAd, 'e2e_unknown_item');
        await RoomMessagesRecorder.sendMessage(skinTickets.owner.page, {act: AdsConst.ACTIONS.AD_STARTED, ads_id: skinTickets.skinAd.id});
        await TestAdSkinsAdStates.endAdAndExpectOwnerItems(
            context,
            skinTickets,
            {tickets: 1, skins: 0},
            'The ticket is given back when the reward of an unknown item fails'
        );
        await TestAdSkinsAdStates.overrideRewardItemKey(context, skinTickets.skinAd, skinTickets.skinData.rewardItemKey);
        await SkinSteps.playAd(skinTickets.owner, skinTickets.skinAd);
        await SkinSteps.expectItems(
            context,
            skinTickets.owner,
            skinTickets.skinData,
            {tickets: 0, skins: 1},
            'The kept ticket plays a rewarded ad again'
        );
    }

    static async runDeadPlayerTicketTest(context)
    {
        let skinTickets = await SkinSteps.enterWithTickets(context, [1]);
        let owner = skinTickets.players[0];
        let gameConfig = context.gameConfig;
        await GameplayE2eStateApi.setPlayerState(gameConfig, Login.TOWN_ROOM_NAME, owner.playerName, GameConst.STATUS.DEATH);
        await SkinSteps.useTicketAndWaitForAd(context, owner, skinTickets);
        await SkinSteps.expectItems(
            context,
            owner,
            skinTickets.skinData,
            {tickets: 0, skins: 1},
            'The skin ad of a dead player is rewarded'
        );
        expect(
            (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, owner.playerName)).inState,
            'The dead player is never disabled nor revived by the ad'
        ).toBe(GameConst.STATUS.DEATH);
    }

    static run()
    {
        test.describe('Ad Skins Ad States', () => {
            test('dead player ticket use plays a rewarded skin ad and keeps the player dead', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsAdStates.runDeadPlayerTicketTest({page, gameConfig, e2eGroup, longRun});
            });
            test('skin ad reward that fails gives the ticket back and the ticket plays a rewarded ad again', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsAdStates.runRefusedRewardTest({page, gameConfig, e2eGroup, longRun});
            });
            test('skin ad ended while an open trade locks the inventory gives no skin item and keeps the ticket', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsAdStates.runLockedInventoryTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('ticket traded away while the skin ad plays gives no skin item', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsAdStates.runTradedTicketTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a player walking when its skin ad starts is stopped and its movement cleared', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsAdStates.runWalkingAdStartTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a player in a skin ad stays shown to the other client and blocks its walk', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsAdStates.runDisabledPlayerBodyTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('movement of a player in a skin ad is ignored until the ad ends', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsAdStates.runIgnoredMovementTest({page, gameConfig, e2eGroup, longRun});
            });
            test('page reload while the skin ad plays keeps the ticket and the player active on the new login', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsAdStates.runReloadDuringAdTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestAdSkinsAdStates.run();
