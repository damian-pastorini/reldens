/**
 *
 * Reldens - Test Combat Animations
 *
 * Tests the skill animations other clients play in the forest (CombatSkillCasting places the forest enemy next to the
 * first player): a third client plays the attack animation on the attacker and the hit animation on the target of a
 * PvP hit; a second client plays the heal hit animation on the healed player; for a fireball cast on the enemy a second
 * client plays the cast animation on the caster (the fireball cast animation is stored in skills_skill_animations),
 * turns the caster sprite to the enemy when the physical skill is cast and plays the hit at the hit enemy; and the cast
 * of an enemy physical skill reaches the clients with an enemy owner type, so every client skips the owner turn
 * without an error. The animation sprites are recorded with their positions (SceneSpritesRecorder) and compared with the
 * sprites positions on the same client, within one tile.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
const { SkillConst } = require('@reldens/skills');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCombatAnimations
{

    static ATTACK_SHORT = 'attackShort';
    static HEAL = 'heal';
    static FIREBALL = 'fireball';
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};
    static NO_CRITICAL = {criticalChance: 0};
    static QUIET_MS = 1500;

    static async fetchSessionId(clientPage)
    {
        return await clientPage.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
    }

    static async readPlayerPosition(observerPage, sessionId)
    {
        return await observerPage.evaluate((playerSessionId) => ({
            x: window.reldens.getActiveScene().player.players[playerSessionId].x,
            y: window.reldens.getActiveScene().player.players[playerSessionId].y
        }), sessionId);
    }

    static async readEnemyPosition(observerPage, enemyKey)
    {
        return await observerPage.evaluate((key) => ({
            x: window.reldens.getActiveScene().objectsAnimations[key].sceneSprite.x,
            y: window.reldens.getActiveScene().objectsAnimations[key].sceneSprite.y
        }), enemyKey);
    }

    static async expectSpriteAt(observerPage, textureKey, position, label)
    {
        let distances = (await SceneSpritesRecorder.fetchSprites(observerPage, textureKey)).map(
            addedSprite => Math.hypot(addedSprite.x - position.x, addedSprite.y - position.y)
        );
        expect(Math.min(...distances), label).toBeLessThan(Navigation.TILE_SIZE);
    }

    static async recordCasterTurn(observerPage, casterSessionId, enemyKey)
    {
        await observerPage.evaluate((args) => {
            window.e2eCasterTurns = [];
            window.e2eRecordCasterTurn = () => {
                let scene = window.reldens.getActiveScene();
                let casterSprite = scene.player.players[args.casterSessionId];
                window.e2eCasterTurns.push({
                    animationKey: (casterSprite.anims.currentAnim || {}).key,
                    avatarKey: casterSprite.avatarKey,
                    playX: scene.objectsAnimations[args.enemyKey].sceneSprite.x - casterSprite.x,
                    playY: scene.objectsAnimations[args.enemyKey].sceneSprite.y - casterSprite.y
                });
            };
            window.reldens.activeRoomEvents.room.onMessage('*', (message) => {
                if(args.afterCastAct === message.act){
                    queueMicrotask(window.e2eRecordCasterTurn);
                }
            });
        }, {casterSessionId, enemyKey, afterCastAct: SkillConst.ACTION_SKILL_AFTER_CAST});
    }

    static expectedDirection(turn)
    {
        let direction = 0 <= turn.playX ? GameConst.RIGHT : GameConst.LEFT;
        if(Math.abs(turn.playX) < Math.abs(turn.playY)){
            direction = 0 <= turn.playY ? GameConst.DOWN : GameConst.UP;
        }
        return direction;
    }

    static async runPvpThirdClientTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let players = await CombatSkillCasting.prepareTargetAndObserver(page, secondPage, context, longRun);
        let targetPlayer = players.targetPlayer;
        let thirdPage = players.observerClient.clientPage;
        let attackShort = TestCombatAnimations.ATTACK_SHORT;
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, TestCombatAnimations.DIRECT_ATTACK);
        await CombatSkillCasting.targetPlayer(page, targetPlayer.sessionId);
        await SceneSpritesRecorder.start(thirdPage);
        await CombatSkillCasting.castSkill(page, context, attackShort, 1);
        let attackKey = 'default'+ActionsConst.ACTIONS.SUFFIX.ATTACK;
        let hitKey = ActionsConst.DEFAULT_HIT_ANIMATION_KEY;
        await SceneSpritesRecorder.waitForTextures(thirdPage, [attackKey, hitKey], context.timeout);
        let attackerSessionId = await TestCombatAnimations.fetchSessionId(page);
        let attackerPosition = await TestCombatAnimations.readPlayerPosition(thirdPage, attackerSessionId);
        let targetPosition = await TestCombatAnimations.readPlayerPosition(thirdPage, targetPlayer.sessionId);
        await TestCombatAnimations.expectSpriteAt(thirdPage, attackKey, attackerPosition, 'Attack on the attacker');
        await TestCombatAnimations.expectSpriteAt(thirdPage, hitKey, targetPosition, 'Hit on the target');
        await screenshots.capture(thirdPage, 'pvp-animations-third-client');
        await players.observerClient.clientContext.close();
    }

    static async runHealHitTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await SceneSpritesRecorder.start(secondPage);
        await CombatSkillCasting.targetSelf(page);
        await CombatSkillCasting.expectSkillRun(page, context, TestCombatAnimations.HEAL, true, 'Heal cast');
        let healHitKey = TestCombatAnimations.HEAL+ActionsConst.ACTIONS.SUFFIX.HIT;
        await SceneSpritesRecorder.waitForTextures(secondPage, [healHitKey], context.timeout);
        await TestCombatAnimations.expectSpriteAt(
            secondPage,
            healHitKey,
            await TestCombatAnimations.readPlayerPosition(secondPage, await TestCombatAnimations.fetchSessionId(page)),
            'The heal hit plays on the healed player'
        );
        await screenshots.capture(secondPage, 'heal-hit-second-client');
    }

    static async runFireballTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let fireball = TestCombatAnimations.FIREBALL;
        await CombatSkillCasting.changeSkill(context, e2eGroup, fireball, TestCombatAnimations.NO_CRITICAL);
        let casterSnapshot = await GameplayE2eStateApi.fetchPlayer(gameConfig, context.roomName, context.playerName);
        await CombatSkillCasting.setPlayerStats(context, {mp: casterSnapshot.statsBase.mp});
        let casterSessionId = await TestCombatAnimations.fetchSessionId(page);
        await SceneSpritesRecorder.start(secondPage);
        await TestCombatAnimations.recordCasterTurn(secondPage, casterSessionId, context.enemyKey);
        await CombatSkillCasting.castSkill(page, context, fireball, 1);
        let castKey = fireball+'_cast';
        let hitKey = ActionsConst.DEFAULT_HIT_ANIMATION_KEY;
        await SceneSpritesRecorder.waitForTextures(secondPage, [castKey, hitKey], context.timeout);
        let casterPosition = await TestCombatAnimations.readPlayerPosition(secondPage, casterSessionId);
        let enemyPosition = await TestCombatAnimations.readEnemyPosition(secondPage, context.enemyKey);
        await TestCombatAnimations.expectSpriteAt(secondPage, castKey, casterPosition, 'Cast plays on the caster');
        await TestCombatAnimations.expectSpriteAt(secondPage, hitKey, enemyPosition, 'Hit plays on the hit enemy');
        await expect.poll(
            async () => (await secondPage.evaluate(() => window.e2eCasterTurns)).length,
            {message: 'The physical skill cast reaches the second client', timeout: context.timeout}
        ).toBeGreaterThan(0);
        let turn = [...await secondPage.evaluate(() => window.e2eCasterTurns)].shift();
        expect(turn.animationKey, 'The caster turns to the enemy').toBe(
            turn.avatarKey+'_'+TestCombatAnimations.expectedDirection(turn)
        );
        await screenshots.capture(secondPage, 'fireball-animations-second-client');
    }

    static async runEnemyCastTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let pageErrors = [];
        for(let clientPage of [page, secondPage]){
            clientPage.on('pageerror', error => pageErrors.push(error.message));
            await RoomMessagesRecorder.start(clientPage);
        }
        let battle = await RoomObjectsApi.startEnemyBattle(
            gameConfig,
            context.roomName,
            context.playerName,
            context.enemyKey
        );
        expect(battle.enemyKey, 'The enemy battle must start: '+battle.error).toBe(context.enemyKey);
        await RoomMessagesRecorder.waitForMessage(secondPage, SkillConst.ACTION_SKILL_AFTER_CAST, context.timeout);
        await RoomMessagesRecorder.waitForMessage(page, SkillConst.ACTION_SKILL_AFTER_CAST, context.timeout);
        let enemyCast = [...await RoomMessagesRecorder.fetchMessages(secondPage, SkillConst.ACTION_SKILL_AFTER_CAST)].shift();
        expect(enemyCast.data.extraData[ActionsConst.DATA_OWNER_TYPE], 'Cast by an enemy').toBe(
            ActionsConst.DATA_TYPE_VALUE_ENEMY
        );
        await page.waitForTimeout(TestCombatAnimations.QUIET_MS);
        expect(pageErrors, 'Every client skips the object owner turn').toEqual([]);
        await screenshots.capture(secondPage, 'enemy-cast-second-client');
    }

    static run()
    {
        test.describe('Combat Animations', () => {
            test('third client plays the PvP attack on the attacker and the hit on the target', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatAnimations.runPvpThirdClientTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('second client plays the heal hit on the healed player', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatAnimations.runHealHitTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('second client plays the fireball cast on the caster, turns it to the enemy and plays the hit on the enemy', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatAnimations.runFireballTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('enemy physical skill cast reaches the clients with an enemy owner and no turn error', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatAnimations.runEnemyCastTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestCombatAnimations.run();
