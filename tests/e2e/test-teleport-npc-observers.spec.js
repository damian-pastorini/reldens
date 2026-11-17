/**
 *
 * Reldens - Test Teleport NPC Observers
 *
 * Tests what another player of the town keeps when the first player teleports away through the town teleport NPC
 * (exclusive group, TeleportNpcSteps): the second player that targets the first one gets its target cleared once the
 * sprite is removed, while its own NPC dialog (the town NPC next to it) stays open; and the first player killed by a
 * real PvP hit of the second one (TestCombatDeath, manual revive so the box waits for its button) keeps its game over
 * box open when the second player teleports away. With the PvP direct short attack of the second player (its skills
 * recorded): its skill sent on the first player once that one teleported to the forest finds no target, nothing is
 * applied and the teleported player keeps its life; and its long cast on the first player is cancelled when it
 * teleports during the cast (the town removal clears the casting timer), so the cast never hits.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TeamSteps } = require('./helpers/team-steps');
const { TeleportNpcSteps } = require('./helpers/teleport-npc-steps');
const { MovementScenario } = require('./helpers/movement-scenario');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { Phaser } = require('./helpers/phaser');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeleportNpcObservers
{

    static NPC_MINIMUM_TILES = 2;
    static LONG_CAST_TIME_MS = 3000;
    static fetchFirstPlayerLife = async (context, roomName) => (
        await GameplayE2eStateApi.fetchPlayer(context.gameConfig, roomName, context.gameConfig.e2ePlayerName)
    ).life;

    static async teleportPlayer(npc, teleported, observer)
    {
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await SceneSpritesRecorder.waitForRemovedPlayer(observer.page, teleported.sessionId, TimeConstants.SERVER_RESPONSE);
    }

    static async runTargetAndDialogTest(context)
    {
        let gameConfig = context.gameConfig;
        let players = await TeamSteps.enterPlayers(context, 2);
        let observer = players[1];
        let npc = await TeleportNpcSteps.openDialog(context, players[0].page);
        await MovementScenario.placePlayerNextToNpc(
            observer.page,
            Object.assign(
                {npcKey: gameConfig.e2eNpcKey},
                MovementScenario.createWalkContext(gameConfig, Login.TOWN_ROOM_NAME, observer.playerName, context.longRun)
            ),
            TestTeleportNpcObservers.NPC_MINIMUM_TILES
        );
        expect(await Phaser.triggerObjectInteraction(observer.page, gameConfig.e2eNpcKey), 'The town NPC interaction is sent')
            .toBe(true);
        let observerDialog = observer.page.locator(Selectors.npc.dialogue).filter({visible: true}).first();
        await expect(observerDialog, 'The second player NPC dialog is open').toBeVisible({timeout: TimeConstants.UI_OPEN});
        await SceneSpritesRecorder.waitForShownPlayer(observer.page, players[0].sessionId, TimeConstants.SERVER_RESPONSE);
        await observer.page.evaluate((targetSessionId) => {
            window.reldens.getActiveScene().player.currentTarget = {id: targetSessionId, type: 'player'};
        }, players[0].sessionId);
        await TestTeleportNpcObservers.teleportPlayer(npc, players[0], observer);
        await expect.poll(
            async () => observer.page.evaluate(() => window.reldens.getActiveScene().player.currentTarget),
            {message: 'The target of the teleported player is cleared', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(false);
        await expect(observerDialog, 'The second player own NPC dialog stays open').toBeVisible();
    }

    static async runDeadObserverTest(context)
    {
        await DeathReviveSteps.prepareDeath(context, DeathReviveSteps.MANUAL_REVIVE_CONFIG);
        let players = await TeamSteps.enterPlayers(context, 2);
        await TestCombatDeath.killPlayerByPlayer(context, Login.TOWN_ROOM_NAME);
        let gameOverBox = players[0].page.locator(Selectors.gameOver.box);
        await expect(gameOverBox, 'The killed first player shows its game over box').toBeVisible({
            timeout: TimeConstants.SERVER_RESPONSE
        });
        let npc = await TeleportNpcSteps.openDialog(context, players[1].page);
        await TestTeleportNpcObservers.teleportPlayer(npc, players[1], players[0]);
        await expect(gameOverBox, 'The game over box stays open when another player teleports').toBeVisible();
    }

    static async runTeleportedTargetTest(context)
    {
        let players = await TeamSteps.enterPlayers(context, 2);
        let attacker = await TestCombatDeath.preparePlayerAttack(context, Login.TOWN_ROOM_NAME);
        await CombatSkillCasting.castSkill(context.secondPage, attacker, TestCombatDeath.PLAYER_ATTACK_SKILL, 1);
        await TeleportNpcSteps.chooseDestination(
            context,
            players[0],
            await TeleportNpcSteps.openDialog(context, players[0].page)
        );
        let lifeAfterTeleport = await TestTeleportNpcObservers.fetchFirstPlayerLife(context, Login.FOREST_ROOM_NAME);
        await CombatSkillCasting.targetPlayer(context.secondPage, players[0].sessionId);
        await CombatSkillCasting.clickWhenReady(context.secondPage, attacker, TestCombatDeath.PLAYER_ATTACK_SKILL);
        await CombatSkillCasting.expectNothingApplied(
            context.secondPage,
            attacker,
            1,
            CombatSkillCasting.QUIET_MS,
            'The skill sent on the teleported player finds no target'
        );
        expect(
            await TestTeleportNpcObservers.fetchFirstPlayerLife(context, Login.FOREST_ROOM_NAME),
            'The teleported player keeps its life'
        ).toBe(lifeAfterTeleport);
    }

    static async runCastingTeleportTest(context)
    {
        let players = await TeamSteps.enterPlayers(context, 2);
        let attacker = await TestCombatDeath.preparePlayerAttack(
            context,
            Login.TOWN_ROOM_NAME,
            {castTime: TestTeleportNpcObservers.LONG_CAST_TIME_MS}
        );
        let npc = await TeleportNpcSteps.openDialog(context, players[1].page);
        await CombatSkillCasting.targetPlayer(context.secondPage, players[0].sessionId);
        let lifeBefore = await TestTeleportNpcObservers.fetchFirstPlayerLife(context, Login.TOWN_ROOM_NAME);
        await CombatSkillCasting.startCast(context.secondPage, attacker, TestCombatDeath.PLAYER_ATTACK_SKILL);
        await TeleportNpcSteps.chooseDestination(context, players[1], npc);
        await CombatSkillCasting.expectNothingApplied(
            players[0].page,
            attacker,
            0,
            TestTeleportNpcObservers.LONG_CAST_TIME_MS,
            'The cast of the teleported player never hits'
        );
        expect(
            await TestTeleportNpcObservers.fetchFirstPlayerLife(context, Login.TOWN_ROOM_NAME),
            'The cast target keeps its life'
        ).toBe(lifeBefore);
    }

    static run()
    {
        test.describe('Teleport NPC Observers', () => {
            test('another player target of the teleported player is cleared and its own dialog stays open', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcObservers.runTargetAndDialogTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a dead player keeps its game over box when another player teleports', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcObservers.runDeadObserverTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a PvP skill sent on a player that teleported away finds no target', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcObservers.runTeleportedTargetTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a player that teleports while casting a skill gets the cast cancelled', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcObservers.runCastingTeleportTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTeleportNpcObservers.run();
