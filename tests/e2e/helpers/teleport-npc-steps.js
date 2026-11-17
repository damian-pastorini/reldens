/**
 *
 * Reldens - Teleport NPC Steps
 *
 * The steps of the teleport NPC specs: the logged player of a page is placed next to the stored teleport NPC of the
 * town and opens its dialog (TeleportNpcData), an e2e option with its own destination is added to the live NPC for the
 * group (restored by the group reset), a live NPC property is changed for the group (LiveObjectProperties, restored
 * by the group reset) and an option value is sent as the dialog option message, the same message the dialog buttons
 * send; the destination option of an open dialog is chosen and the player waited in the destination room and out of
 * the town room players (the point where the town removal already ran).
 *
 */

const { expect } = require('@playwright/test');
const { TeleportNpcData } = require('./teleport-npc-data');
const { RoomObjectsApi } = require('./room-objects-api');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { Phaser } = require('./phaser');
const { NpcDialogSteps } = require('./npc-dialog-steps');
const { LoginServerApi } = require('./login-server-api');
const { Navigation } = require('./navigation');
const { Login } = require('./login');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');
const { GameConst } = require('../../../lib/game/constants');

class TeleportNpcSteps
{

    static E2E_OPTION_KEY = '90';
    static E2E_OPTION = {label: 'E2E destination', value: 90};
    static NOWHERE_OPTION_VALUE = 3;

    static async placeNextToNpc(context, page)
    {
        let teleportData = await TeleportNpcData.load(context.gameConfig);
        await Phaser.waitForObject(page, teleportData.clientKey, TimeConstants.SCENE_LOAD);
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            page,
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            teleportData.clientKey,
            TimeConstants.SCENE_LOAD
        );
        expect(placement.reached, 'The player is placed next to the teleport NPC').toBe(true);
        return {page, teleportData, dialog: page.locator(Selectors.npc.dialogue).filter({visible: true})};
    }

    static async openDialog(context, page)
    {
        let npc = await TeleportNpcSteps.placeNextToNpc(context, page);
        expect(await Phaser.triggerObjectInteraction(page, npc.teleportData.clientKey), 'The NPC interaction is sent')
            .toBe(true);
        await expect(
            npc.dialog.locator('[data-option-value="'+npc.teleportData.optionValue+'"]'),
            'The teleport NPC dialog shows its options'
        ).toBeVisible({timeout: TimeConstants.UI_OPEN});
        return npc;
    }

    static async addDestination(context, npc, destination)
    {
        let added = await GameplayE2eStateApi.addTeleportOption(
            context.gameConfig,
            context.e2eGroup,
            Login.TOWN_ROOM_NAME,
            npc.teleportData.clientKey,
            {optionKey: TeleportNpcSteps.E2E_OPTION_KEY, option: TeleportNpcSteps.E2E_OPTION, destination}
        );
        expect(added.optionKey, 'The e2e destination option is added to the NPC: '+added.error)
            .toBe(TeleportNpcSteps.E2E_OPTION_KEY);
        return TeleportNpcSteps.E2E_OPTION.value;
    }

    static changeNpcProperty = async (context, npc, propertyKey, value) => await NpcDialogSteps.changeObjectProperty(
        context,
        Login.TOWN_ROOM_NAME,
        npc.teleportData.clientKey,
        propertyKey,
        value
    );

    static async chooseOption(npc, optionValue)
    {
        await RoomMessagesRecorder.sendObjectMessage(npc.page, npc.teleportData.clientKey, {
            act: GameConst.BUTTON_OPTION,
            value: optionValue
        });
    }

    static async chooseDestination(context, player, npc)
    {
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await Navigation.waitForRoom(player.page, npc.teleportData.destinationRoom, TimeConstants.ROOM_TRANSITION);
        await expect.poll(
            async () => LoginServerApi.fetchPlayersInRoom(context.gameConfig, Login.TOWN_ROOM_NAME, player.playerName),
            {message: player.playerName+' is removed from the town room', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(0);
    }

    static async fetchDefaultReturnPoint(gameConfig, roomName)
    {
        let {x, y, direction} = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'roomsReturnPoints', {
            room_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'rooms', {name: roomName}),
            is_default: 1
        })].shift();
        return {x: Number(x), y: Number(y), dir: direction};
    }

}

module.exports.TeleportNpcSteps = TeleportNpcSteps;
