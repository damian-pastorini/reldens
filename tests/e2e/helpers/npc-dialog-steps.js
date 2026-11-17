/**
 *
 * Reldens - NPC Dialog Steps
 *
 * The steps of the NPC dialog specs: the random movement of a room NPC is stopped and the body of a moving NPC placed
 * back on its original tile (the players reset restores the movement), the logged player of a page is placed next to it
 * (MovementScenario) and opens its dialog with the interaction message its sprite click sends; the visible NPC dialog
 * of a page; the room custom data changed for the group (restored by the group reset); and the sessions with the NPC
 * dialog open on the server (the random movement pause list, read by the room objects probe).
 *
 */

const { expect } = require('@playwright/test');
const { MovementScenario } = require('./movement-scenario');
const { RoomMovementApi } = require('./room-movement-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { SecurityApi } = require('./security-api');
const { Phaser } = require('./phaser');
const { Login } = require('./login');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');

class NpcDialogSteps
{

    static async placeNextToNpc(context, page, npcKey, roomName = Login.TOWN_ROOM_NAME)
    {
        let gameConfig = context.gameConfig;
        let npcBody = await RoomMovementApi.switchRandomMovement(gameConfig, roomName, npcKey, false);
        expect(npcBody, 'The NPC '+npcKey+' body is in '+roomName).toBeTruthy();
        if(0 < npcBody.maxTiles){
            await RoomMovementApi.placeObject(gameConfig, roomName, npcKey, [npcBody.originalCol, npcBody.originalRow]);
        }
        await Phaser.waitForObject(page, npcKey, TimeConstants.SCENE_LOAD);
        await MovementScenario.placePlayerNextToNpc(page, {gameConfig, roomName, npcKey, navTimeout: TimeConstants.SCENE_LOAD});
        return {page, npcKey, roomName, dialog: page.locator(Selectors.npc.dialogue).filter({visible: true})};
    }

    static async openDialog(context, page, npcKey, roomName = Login.TOWN_ROOM_NAME)
    {
        let npc = await NpcDialogSteps.placeNextToNpc(context, page, npcKey, roomName);
        expect(await Phaser.triggerObjectInteraction(page, npcKey), 'The '+npcKey+' interaction is sent').toBe(true);
        await expect(npc.dialog, 'The '+npcKey+' dialog is open').toBeVisible({timeout: TimeConstants.UI_OPEN});
        return npc;
    }

    static async changeRoomCustomData(context, roomName, customData)
    {
        let changed = await GameplayE2eStateApi.changeRoomCustomData(
            context.gameConfig,
            context.e2eGroup,
            roomName,
            customData
        );
        expect(changed.changed, 'The '+roomName+' custom data is changed for the group').toEqual(Object.keys(customData));
    }

    static async changeObjectProperty(context, roomName, objectKey, propertyKey, value)
    {
        let changed = await SecurityApi.request(context.gameConfig, 'POST', '/api/e2e/live-objects/object-property', {
            roomName,
            group: context.e2eGroup,
            objectKey,
            propertyKey,
            value
        });
        expect([changed.propertyKey, changed.value], 'The '+objectKey+' property is changed: '+changed.error)
            .toEqual([propertyKey, value]);
    }

    static async expectOpenDialogs(context, npc, sessionIds, message)
    {
        await expect.poll(
            async () => (await RoomMovementApi.fetchObject(context.gameConfig, npc.roomName, npc.npcKey)).openDialogs,
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([...sessionIds].sort());
    }

}

module.exports.NpcDialogSteps = NpcDialogSteps;
