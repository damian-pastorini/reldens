/**
 *
 * Reldens - Test Teleport NPC
 *
 * Tests the teleport object type: the player placed next to the stored teleport NPC of the town clicks the NPC on the
 * game canvas, which targets it (the target box shows the NPC title) and opens its dialog, chooses the first option that
 * has a destination and is moved to that destination room, on the client and on the server. The NPC, its title, its
 * options and its destinations come from the stored object row. The long run recording starts after the placement, so
 * the video starts with the player next to the NPC; the pointer leaves the NPC after the click, so its hover highlight
 * ends and the NPC keeps its sprite colors, the dialog is moved away from the player stats box (the client config is
 * sent on the login, the group reset restores it), the option is hovered on its corner before the click, and after the
 * arrival, once the camera shows the player in the destination room, it is captioned and walks toward the map center.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { Navigation } = require('./helpers/navigation');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { ShowcaseSteps } = require('./helpers/showcase-steps');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeleportNpc
{

    static TELEPORT_TYPE_KEY = 'teleport';
    static DIALOG_RESPONSIVE_X_PATH = 'client/ui/npcDialog/responsiveX';
    static DIALOG_SHOWCASE_RESPONSIVE_X = 20;
    static ARRIVAL_WALK_TILES = 6;
    static ARRIVAL_WALK_TIMEOUT_MS = 3000;

    static async loadTeleportData(gameConfig)
    {
        let teleportTypeId = await E2eSeedAndRestoreApi.fetchRowId(
            gameConfig,
            'objectsTypes',
            {key: TestTeleportNpc.TELEPORT_TYPE_KEY}
        );
        let teleportRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'objects', {class_type: teleportTypeId})]
            .shift();
        expect(teleportRow, 'The teleport NPC must be stored').toBeTruthy();
        let destinations = sc.toJson(teleportRow.private_params, {}).destinations;
        let optionKey = [...Object.keys(destinations)].shift();
        let option = sc.toJson(teleportRow.client_params, {}).options[optionKey];
        expect(optionKey, 'The teleport NPC must have a destination').toBeTruthy();
        return {
            clientKey: teleportRow.client_key,
            title: teleportRow.title,
            optionValue: option.value,
            optionLabel: option.label,
            destinationRoom: destinations[optionKey].room
        };
    }

    static async showArrival(page, gameConfig, destinationRoom, timeout, longRun)
    {
        if(!longRun){
            return false;
        }
        await Phaser.waitForPlayerInRoomState(page, timeout);
        await Phaser.waitForPlayerBySessionId(
            page,
            await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId),
            timeout
        );
        await LongRunShowcase.waitForCamera(page, longRun);
        let roomTitle = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rooms', {name: destinationRoom})]
            .shift().title;
        await LongRunShowcase.showStep(page, 'The player arrived in '+roomTitle+' and walks in the room', longRun);
        await ShowcaseSteps.walkTowardMapCenter(
            page,
            gameConfig,
            destinationRoom,
            gameConfig.e2ePlayerName,
            TestTeleportNpc.ARRIVAL_WALK_TILES,
            TestTeleportNpc.ARRIVAL_WALK_TIMEOUT_MS
        );
        return true;
    }

    static async runTeleportTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let teleportData = await TestTeleportNpc.loadTeleportData(gameConfig);
        let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        await ShowcaseSteps.overrideConfig(
            gameConfig,
            e2eGroup,
            TestTeleportNpc.DIALOG_RESPONSIVE_X_PATH,
            TestTeleportNpc.DIALOG_SHOWCASE_RESPONSIVE_X,
            longRun
        );
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await Phaser.waitForObject(page, teleportData.clientKey, sceneTimeout);
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            page,
            gameConfig,
            Login.TOWN_ROOM_NAME,
            teleportData.clientKey,
            sceneTimeout,
            longRun ? LongRunShowcase.TARGET_DISTANCE_TILES : 0
        );
        expect(placement.reached, 'The player must be placed next to the NPC: '+sc.toJsonString(placement)).toBe(true);
        await LongRunShowcase.startGameplayRecording(
            page,
            longRun,
            'The player clicks the teleport NPC '+teleportData.title
        );
        await BaseE2eTest.waitForCameraStill(page);
        await ShowcaseSteps.clickObjectAndLeave(page, teleportData.clientKey, longRun);
        await expect(
            page.locator(Selectors.combat.targetBox),
            'The clicked teleport NPC must be targeted'
        ).toContainText(teleportData.title);
        let optionButton = page.locator(Selectors.npc.dialogue).filter({visible: true}).locator(
            '[data-option-value="'+teleportData.optionValue+'"]'
        );
        await expect(optionButton).toBeVisible({timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun)});
        await ShowcaseSteps.showAndPause(
            page,
            teleportData.title+' asks where to go: the player chooses "'+teleportData.optionLabel+'"',
            longRun
        );
        await screenshots.capture(page, 'teleport-npc-dialog-options');
        await ShowcaseSteps.click(page, optionButton, longRun);
        await Navigation.waitForRoom(
            page,
            teleportData.destinationRoom,
            TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, longRun)
        );
        await expect.poll(
            async () => (await GameplayE2eStateApi.fetchPlayer(
                gameConfig,
                teleportData.destinationRoom,
                gameConfig.e2ePlayerName
            )).scene,
            {message: 'The server must place the player in the destination room'}
        ).toBe(teleportData.destinationRoom);
        await TestTeleportNpc.showArrival(page, gameConfig, teleportData.destinationRoom, sceneTimeout, longRun);
        await screenshots.capture(page, 'teleport-npc-destination-room');
    }

    static run()
    {
        test.describe('Teleport NPC', () => {
            test('teleport NPC option moves the player to its destination room', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpc.runTeleportTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestTeleportNpc.run();
