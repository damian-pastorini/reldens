/**
 *
 * Reldens - Observer Steps
 *
 * Client steps shared by the specs with a second player that watches the first one: the forest quest NPC dialog opened
 * by a player placed next to it, and the team of both group players (the first player targets the second one with the
 * same client method the sprite click calls, invites it from the target box and the second one accepts), and the wait
 * until the rewards of the first player reach both team members (the reward targets count of an empty reward).
 *
 */

const { expect } = require('@playwright/test');
const { RoomObjectsApi } = require('./room-objects-api');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { Phaser } = require('./phaser');
const { Login } = require('./login');
const { SecurityApi } = require('./security-api');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');

class ObserverSteps
{

    static QUEST_NPC_KEY = 'quest_npc_1';
    static REWARD_TARGETS_PATH = '/api/e2e/inventory/experience-reward';

    static async openQuestNpcDialog(page, gameConfig)
    {
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            ObserverSteps.QUEST_NPC_KEY,
            TimeConstants.SCENE_LOAD
        );
        expect(placement.reached, 'The player must be placed next to the quest NPC').toBe(true);
        expect(await Phaser.triggerObjectInteraction(page, ObserverSteps.QUEST_NPC_KEY)).toBe(true);
        await expect(
            page.locator(Selectors.npc.dialogue).filter({visible: true}),
            'The quest NPC dialog is open'
        ).not.toHaveCount(0, {timeout: TimeConstants.UI_OPEN});
    }

    static async joinTeam(context, secondSessionId)
    {
        let placed = await RoomObjectsApi.placePlayerNearPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName2,
            context.gameConfig.e2ePlayerName
        );
        expect(placed.position, 'The second player must be placed next to the first one: '+placed.error).toBeTruthy();
        await Phaser.waitForPlayerBySessionId(context.page, secondSessionId, TimeConstants.SCENE_LOAD);
        await context.page.evaluate(
            (targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId),
            secondSessionId
        );
        let secondPlayerId = await E2eSeedAndRestoreApi.fetchRowId(
            context.gameConfig,
            'players',
            {name: context.gameConfig.e2ePlayerName2}
        );
        await context.page.locator(Selectors.teams.invite(secondPlayerId)).click({timeout: TimeConstants.UI_OPEN});
        await context.secondPage.locator(Selectors.teams.acceptOption).first().click({timeout: TimeConstants.UI_OPEN});
    }

    static async waitForTeam(gameConfig)
    {
        await expect.poll(
            async () => (await SecurityApi.request(gameConfig, 'POST', ObserverSteps.REWARD_TARGETS_PATH, {
                roomName: Login.FOREST_ROOM_NAME,
                playerName: gameConfig.e2ePlayerName,
                experience: 0
            })).targetsCount,
            {message: 'The team must hold both players', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(2);
    }

}

module.exports.ObserverSteps = ObserverSteps;
