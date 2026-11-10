/**
 *
 * Reldens - Test Death Player Kill
 *
 * Tests the death of the first player killed by the second one with the death teleport on (the second player attack
 * gets the balanced combat stats of CombatSkillCasting, the first player is left with one life point, so a real PvP hit
 * kills it): killed in the forest it gets the town message and revives in the town room; and revived in the town room
 * after a death in the forest (DeathReviveSteps kills it with a real enemy hit), the player killed again in the town
 * room gets the town message and revives there on the town default return point (the other player standing next to it
 * can push it, so the distance is checked within a tile); and with the death teleport off, the player killed in the
 * town room with the teleport NPC dialog open that sends its destination choice gets the dialog closed, is not
 * relocated and still revives in the town room at the game over time.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { Navigation } = require('./helpers/navigation');
const { Phaser } = require('./helpers/phaser');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { TeleportNpcData } = require('./helpers/teleport-npc-data');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathPlayerKill
{

    static ATTACK_SHORT = 'attackShort';
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};
    static LAST_LIFE = 1;
    static TELEPORT_OFF = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};

    static extendTimeout(context)
    {
        test.setTimeout(
            test.info().timeout
            + TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + TimeConstants.PLAYER_REVIVE
        );
    }

    static async killByPlayer(context, roomName)
    {
        let gameConfig = context.gameConfig;
        let attacker = {
            gameConfig,
            roomName,
            playerName: gameConfig.e2ePlayerName2,
            timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, context.longRun)
        };
        await GameplayE2eStateApi.recordPlayerSkills(gameConfig, roomName, attacker.playerName);
        await CombatSkillCasting.setPlayerStats(attacker, CombatSkillCasting.BALANCED_PLAYER_STATS);
        await GameplayE2eStateApi.setPlayerStats(
            gameConfig,
            roomName,
            gameConfig.e2ePlayerName,
            CombatSkillCasting.BALANCED_ENEMY_STATS
        );
        await CombatSkillCasting.changeSkill(
            attacker,
            context.e2eGroup,
            TestDeathPlayerKill.ATTACK_SHORT,
            TestDeathPlayerKill.DIRECT_ATTACK
        );
        let placed = await RoomObjectsApi.placePlayerNearPlayer(
            gameConfig,
            roomName,
            attacker.playerName,
            gameConfig.e2ePlayerName
        );
        expect(placed.position, 'The attacker must be placed next to the player: '+placed.error).toBeTruthy();
        let lastLife = await RoomObjectsApi.setPlayerAffectedProperty(
            gameConfig,
            roomName,
            gameConfig.e2ePlayerName,
            TestDeathPlayerKill.LAST_LIFE
        );
        expect(lastLife.value, 'The player last life must be set: '+lastLife.error).toBe(TestDeathPlayerKill.LAST_LIFE);
        await CombatSkillCasting.targetPlayer(
            context.secondPage,
            await context.page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId)
        );
        await CombatSkillCasting.castSkill(context.secondPage, attacker, TestDeathPlayerKill.ATTACK_SHORT, 1);
        await TestCombatDeath.waitForPlayerHpCondition(context.page, 'dead', attacker.timeout);
    }

    static async runForestPlayerKillTest(context)
    {
        await DeathReviveSteps.prepareDeath(context, {});
        TestDeathPlayerKill.extendTimeout(context);
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await Login.loginAndEnterForest(
            context.secondPage,
            Login.fetchSecondPlayerConfig(context.gameConfig),
            context.longRun
        );
        await RoomObjectsApi.disableEnemies(context.gameConfig, Login.FOREST_ROOM_NAME);
        await TestDeathPlayerKill.killByPlayer(context, Login.FOREST_ROOM_NAME);
        await DeathReviveSteps.expectRevivedInTown(context, await DeathReviveSteps.expectTownGameOverMessage(context, 0));
    }

    static async runTownDeathAfterTownReviveTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, {}, 0);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        TestDeathPlayerKill.extendTimeout(context);
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun, '2');
        await TestDeathPlayerKill.killByPlayer(context, townRoomName);
        await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        let townRoom = (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom;
        await expect.poll(
            async () => (await DeathReviveSteps.fetchPlayer(context, townRoomName)).life,
            {message: 'The player revives in the town room', timeout: TimeConstants.PLAYER_REVIVE}
        ).toBeGreaterThan(0);
        expect(await Navigation.getCurrentRoomName(context.page), 'The player stays in the town room').toBe(townRoomName);
        let revivedPlayer = await DeathReviveSteps.fetchPlayer(context, townRoomName);
        let returnPoint = [...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'roomsReturnPoints', {
            room_id: townRoom.id,
            is_default: 1
        })].shift();
        expect(
            Math.hypot(revivedPlayer.x - Number(returnPoint.x), revivedPlayer.y - Number(returnPoint.y)),
            'Revived on the town return point (the attacker standing there can push it)'
        ).toBeLessThan(Navigation.TILE_SIZE);
    }

    static async runTeleportChoiceWhileDeadTest(context)
    {
        let teleportData = await TeleportNpcData.load(context.gameConfig);
        await DeathReviveSteps.prepareDeath(context, TestDeathPlayerKill.TELEPORT_OFF);
        TestDeathPlayerKill.extendTimeout(context);
        await Login.startConfigPlayer(context.page, context.gameConfig, context.longRun, Login.TOWN_ROOM_NAME);
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun, '2');
        await Phaser.waitForObject(context.page, teleportData.clientKey, TimeConstants.SCENE_LOAD);
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            context.page,
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            teleportData.clientKey,
            TimeConstants.SCENE_LOAD
        );
        expect(placement.reached, 'The player must be placed next to the teleport NPC').toBe(true);
        expect(await Phaser.triggerObjectInteraction(context.page, teleportData.clientKey)).toBe(true);
        let shownDialog = context.page.locator(Selectors.npc.dialogue).filter({visible: true});
        await expect(
            shownDialog.locator('[data-option-value="'+teleportData.optionValue+'"]'),
            'The teleport NPC dialog shows its destination option'
        ).toBeVisible({timeout: TimeConstants.UI_OPEN});
        await TestDeathPlayerKill.killByPlayer(context, Login.TOWN_ROOM_NAME);
        await RoomMessagesRecorder.sendObjectMessage(
            context.page,
            teleportData.clientKey,
            {act: GameConst.BUTTON_OPTION, value: teleportData.optionValue}
        );
        await expect(shownDialog, 'The teleport NPC dialog closes').toHaveCount(0, {timeout: TimeConstants.SERVER_RESPONSE});
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.TOWN_ROOM_NAME)).life,
            'The dead player is not relocated by its destination choice'
        ).toBe(0);
        await expect.poll(
            async () => (await DeathReviveSteps.fetchPlayer(context, Login.TOWN_ROOM_NAME)).life,
            {message: 'The death resolution still revives the player in the town room', timeout: TimeConstants.PLAYER_REVIVE}
        ).toBeGreaterThan(0);
        expect(await Navigation.getCurrentRoomName(context.page), 'The player stays in the town room').toBe(
            Login.TOWN_ROOM_NAME
        );
    }

    static run()
    {
        test.describe('Death Player Kill', () => {
            test('player killed with the teleport NPC dialog open is not relocated by its choice and still revives', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathPlayerKill.runTeleportChoiceWhileDeadTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('player killed by another player in the forest with the teleport on revives in the town room', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathPlayerKill.runForestPlayerKillTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('player revived in the town room and killed there revives on the town return point', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathPlayerKill.runTownDeathAfterTownReviveTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestDeathPlayerKill.run();
