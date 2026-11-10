/**
 *
 * Reldens - Test Combat
 *
 * Tests targeting enemies, attack damage, skill casting by type, death, and revive. Every attack case places the
 * enemy from the server next to the player with its random movement stopped and targets that exact enemy body.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { TimeConstants } = require('./helpers/time-constants');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { ModifierConst } = require('@reldens/modifiers');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCombat
{
    static DIRECT_ATTACK_KEY = 'attackShort';
    static gameDataPath = FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'game-data.json');
    static gameData = FileHandler.exists(TestCombat.gameDataPath) ? FileHandler.fetchFileJson(TestCombat.gameDataPath) : null;
    static rootPlayerData = TestCombat.gameData && TestCombat.gameData.players && TestCombat.gameData.players.root
        ? TestCombat.gameData.players.root
        : null;
    static playerSkills = TestCombat.rootPlayerData && TestCombat.rootPlayerData.skills
        ? TestCombat.rootPlayerData.skills
        : [];
    static attackSkills = TestCombat.playerSkills.filter(skill => skill.hasAttackData);
    static skillsByType = TestCombat.rootPlayerData && TestCombat.rootPlayerData.skillsByType
        ? TestCombat.rootPlayerData.skillsByType
        : { attack: [], effect: [], physicalAttack: [], physicalEffect: [] };

    static async loginAndGetEnemyWithWorldPos(page, gameConfig, longRun)
    {
        let enemyKey = gameConfig.e2eEnemyKey || '';
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        let pauseMs = forestData.pauseMs;
        let sceneLoadTimeout = forestData.sceneTimeout;
        let navigationTimeout = forestData.navTimeout;
        await (enemyKey
            ? Phaser.waitForObjectByAssetKey(page, enemyKey, sceneLoadTimeout)
            : Phaser.waitForObjectByType(page, 'enemy', sceneLoadTimeout));
        await page.waitForFunction(() => {
            let room = window.reldens && window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!room || !room.state || !room.state.players){
                return false;
            }
            return !!(window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId));
        }, null, { timeout: sceneLoadTimeout }).catch(async (error) => {
            let stateInfo = await page.evaluate(() => {
                let r = window.reldens && window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
                if(!r){
                    return 'no-room';
                }
                if(!r.state){
                    return 'no-state';
                }
                if(!r.state.players){
                    return 'no-players';
                }
                let player = window.reldens.activeRoomEvents.playerBySessionIdFromState(r, r.sessionId);
                if(!player){
                    return 'no-player for sessionId:'+r.sessionId;
                }
                return 'player found, state:'+JSON.stringify({x: player.state && player.state.x, y: player.state && player.state.y});
            });
            Logger.error('[loginAndGetEnemyWithWorldPos] waitForFunction timeout - '+stateInfo);
            throw error;
        });
        let gameOverVisible = await page.evaluate(() => {
            return null !== document.querySelector('#game-over:not(.hidden)');
        });
        if(gameOverVisible){
            await TestCombatDeath.waitForPlayerHpCondition(page, 'alive', sceneLoadTimeout);
            let healSkillEntry = TestCombat.skillsByType.effect.find(s => 'heal' === s.key);
            if(healSkillEntry){
                for(let i = 0; i < 3; i++){
                    await page.click(Selectors.combat.skillButton(healSkillEntry.key));
                    await page.waitForTimeout(pauseMs * 3);
                }
            }
        }
        return { enemyKey, pauseMs, sceneLoadTimeout, navigationTimeout };
    }

    static async placeAndTargetEnemy(page, gameConfig, data)
    {
        let placement = await RoomObjectsApi.placeAndTargetEnemy(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            data.enemyKey,
            0,
            data.sceneLoadTimeout
        );
        expect(placement.targeted, 'The placed enemy must be targeted: '+sc.toJsonString(placement)).toBe(true);
        return placement;
    }

    static async openChat(page, data)
    {
        await page.click(Selectors.hud.chatOpen);
        await page.waitForTimeout(data.pauseMs);
    }

    static async prepareSkillCastContext(page, screenshots, gameConfig, longRun, skill, prefix)
    {
        let data = await TestCombat.loginAndGetEnemyWithWorldPos(page, gameConfig, longRun);
        await TestCombat.placeAndTargetEnemy(page, gameConfig, data);
        await screenshots.capture(page, prefix+'-'+skill.key+'-within-range');
        await TestCombat.openChat(page, data);
        return data;
    }

    static async runDamageSkillTest(page, screenshots, gameConfig, longRun, skill, prefix)
    {
        await TestCombat.prepareSkillCastContext(page, screenshots, gameConfig, longRun, skill, prefix);
        await page.click(Selectors.combat.skillButton(skill.key));
        await expect(page.locator(Selectors.chat.tabContentGeneral)).toContainText(
            'damage',
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
        await screenshots.capture(page, prefix+'-'+skill.key+'-damage-in-chat');
    }

    static async runEffectSkillTest(page, screenshots, gameConfig, e2eGroup, longRun, skill, prefix)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let targetEffect = await CombatSkillCasting.loadSkillRow(gameConfig, 'skillsSkillTargetEffects', skill.key);
        let effectValue = Number(targetEffect.value);
        let statKey = targetEffect.property_key.split('/').pop();
        expect(Number(targetEffect.operation), 'The effect increases the property').toBe(ModifierConst.OPS.INC);
        expect(targetEffect.maxProperty, 'The effect stops at the base value').toBe('statsBase/'+statKey);
        let baseValue = (await GameplayE2eStateApi.fetchPlayer(gameConfig, context.roomName, context.playerName))
            .statsBase[statKey];
        await CombatSkillCasting.changeSkill(context, e2eGroup, skill.key, {criticalChance: 0});
        await CombatSkillCasting.targetSelf(page);
        await CombatSkillCasting.setPlayerStats(context, {[statKey]: baseValue - effectValue * 2});
        await CombatSkillCasting.clickWhenReady(page, context, skill.key);
        await CombatSkillCasting.waitForEndStates(context, skill.key, 1);
        expect(await CombatSkillCasting.fetchPlayerStat(context, statKey), 'Raised by the stored value').toBe(
            baseValue - effectValue
        );
        await CombatSkillCasting.setPlayerStats(context, {[statKey]: baseValue - 1});
        await CombatSkillCasting.clickWhenReady(page, context, skill.key);
        await CombatSkillCasting.waitForEndStates(context, skill.key, 2);
        expect(await CombatSkillCasting.fetchPlayerStat(context, statKey), 'Stops at the base value').toBe(baseValue);
        await screenshots.capture(page, prefix+'-'+skill.key+'-applied');
    }

    static async runAttackSpritesTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let attackKey = TestCombat.DIRECT_ATTACK_KEY;
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackKey, {criticalChance: 0, range: 0});
        await SceneSpritesRecorder.start(page);
        await CombatSkillCasting.castSkill(page, context, attackKey, 1);
        let ownerAnimationKey = 'default'+ActionsConst.ACTIONS.SUFFIX.ATTACK;
        let addedTextures = await SceneSpritesRecorder.waitForTextures(
            page,
            [ownerAnimationKey, ActionsConst.DEFAULT_HIT_ANIMATION_KEY],
            context.timeout
        );
        expect(addedTextures.filter(textureKey => ownerAnimationKey === textureKey), 'One attack sprite').toHaveLength(
            1
        );
        await screenshots.capture(page, 'attack-and-hit-sprites');
    }

    static async resolveAttackKey(page, firstAttackSkill, context)
    {
        let availableActionKeys = await Phaser.getPlayerAvailableActionKeys(page);
        let resolved = (firstAttackSkill ? firstAttackSkill.key : null) || availableActionKeys[0];
        expect(resolved, 'No attack action available '+context+'. Available: '+availableActionKeys.join(', ')).toBeTruthy();
        return resolved;
    }

    static run()
    {
        test.describe('Combat System', () => {
            test('player can target and attack an enemy', async ({ page, screenshots, gameConfig, longRun }) => {
                let data = await TestCombat.loginAndGetEnemyWithWorldPos(page, gameConfig, longRun);
                await screenshots.capture(page, 'enemy-found-in-scene');
                await TestCombat.placeAndTargetEnemy(page, gameConfig, data);
                await expect(page.locator(Selectors.combat.targetBox)).toBeVisible();
                await screenshots.capture(page, 'enemy-targeted');
            });
            test('combat damage message appears in chat', async ({ page, screenshots, gameConfig, longRun }) => {
                let data = await TestCombat.loginAndGetEnemyWithWorldPos(page, gameConfig, longRun);
                let firstAttackSkill = TestCombat.attackSkills[0];
                await TestCombat.placeAndTargetEnemy(page, gameConfig, data);
                await screenshots.capture(page, 'within-attack-range');
                await TestCombat.openChat(page, data);
                let resolvedAttackKey = await TestCombat.resolveAttackKey(page, firstAttackSkill, '- ensure player has attack skills');
                await page.click(Selectors.combat.skillButton(resolvedAttackKey));
                await expect(page.locator(Selectors.chat.tabContentGeneral)).toContainText(
                    'damage',
                    { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
                );
                await screenshots.capture(page, 'damage-message-in-chat');
            });
            test('own client plays the attack sprite on the owner and the hit sprite on the target', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombat.runAttackSpritesTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('player dies from enemy and revives after timeout', async ({ page, screenshots, gameConfig, longRun }) => {
                test.setTimeout(
                    TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun)
                    + TimeConstants.ENEMY_KILL
                    + TimeConstants.PLAYER_REVIVE
                );
                let data = await TestCombat.loginAndGetEnemyWithWorldPos(page, gameConfig, longRun);
                await TestCombatDeath.killPlayerWithEnemyAttack(page, gameConfig, data.enemyKey, TimeConstants.ENEMY_KILL);
                await screenshots.capture(page, 'player-dead');
                await TestCombatDeath.waitForPlayerHpCondition(page, 'alive', TimeConstants.PLAYER_REVIVE);
                let playerHpAfter = await TestCombatDeath.getPlayerHpFromState(page);
                expect(playerHpAfter, 'Player HP must be restored after revive').toBeGreaterThan(0);
                await screenshots.capture(page, 'player-revived');
            });
            for(let skill of TestCombat.skillsByType.attack) {
                test('combat skill (attack) - '+skill.key+' deals damage in chat', async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestCombat.runDamageSkillTest(page, screenshots, gameConfig, longRun, skill, 'attack');
                });
            }
            for(let skill of TestCombat.skillsByType.physicalAttack) {
                test('combat skill (physical attack) - '+skill.key+' deals damage in chat', async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestCombat.runDamageSkillTest(page, screenshots, gameConfig, longRun, skill, 'physical-attack');
                });
            }
            for(let skill of TestCombat.skillsByType.effect) {
                test('combat skill (effect) - '+skill.key+' applies effect on cast', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                    await TestCombat.runEffectSkillTest(page, screenshots, gameConfig, e2eGroup, longRun, skill, 'effect');
                });
            }
            for(let skill of TestCombat.skillsByType.physicalEffect) {
                test('combat skill (physical effect) - '+skill.key+' applies effect on cast', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                    await TestCombat.runEffectSkillTest(page, screenshots, gameConfig, e2eGroup, longRun, skill, 'physical-effect');
                });
            }
        });
    }
}

TestCombat.run();
