/**
 *
 * Reldens - Test Teleport NPC
 *
 * Tests the teleport object type: the player placed next to the stored teleport NPC of the town opens its dialog,
 * chooses the first option that has a destination and is moved to that destination room, on the client and on the
 * server. The NPC, its options and its destinations come from the stored object row.
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
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeleportNpc
{

    static TELEPORT_TYPE_KEY = 'teleport';

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
        expect(optionKey, 'The teleport NPC must have a destination').toBeTruthy();
        return {
            clientKey: teleportRow.client_key,
            optionValue: sc.toJson(teleportRow.client_params, {}).options[optionKey].value,
            destinationRoom: destinations[optionKey].room
        };
    }

    static async runTeleportTest(page, screenshots, gameConfig, longRun)
    {
        let teleportData = await TestTeleportNpc.loadTeleportData(gameConfig);
        let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await Phaser.waitForObject(page, teleportData.clientKey, sceneTimeout);
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            page,
            gameConfig,
            Login.TOWN_ROOM_NAME,
            teleportData.clientKey,
            sceneTimeout
        );
        expect(placement.reached, 'The player must be placed next to the NPC: '+sc.toJsonString(placement)).toBe(true);
        await Phaser.triggerObjectInteraction(page, teleportData.clientKey);
        let optionButton = page.locator(Selectors.npc.dialogue).filter({visible: true}).locator(
            '[data-option-value="'+teleportData.optionValue+'"]'
        );
        await expect(optionButton).toBeVisible({timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun)});
        await LongRunShowcase.pause(page, longRun);
        await screenshots.capture(page, 'teleport-npc-dialog-options');
        await optionButton.click();
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
        await LongRunShowcase.pause(page, longRun);
        await screenshots.capture(page, 'teleport-npc-destination-room');
    }

    static run()
    {
        test.describe('Teleport NPC', () => {
            test('teleport NPC option moves the player to its destination room', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestTeleportNpc.runTeleportTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestTeleportNpc.run();
