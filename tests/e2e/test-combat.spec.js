/**
 *
 * Reldens - Test Combat
 *
 * Tests targeting enemies, attack damage, skill casting by type, death, and revive.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { Navigation } = require('./helpers/navigation');
const { FileHandler } = require('@reldens/server-utils');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCombat
{
    static FOREST_TRANSITION_X = 608;
    static FOREST_TRANSITION_Y = 16;
    static TAB_TARGET_RANGE = 200;
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
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        let enemyKey = gameConfig.e2eEnemyKey || '';
        await Login.loginAndStartGame(page, username, password, playerName, longRun, false, 'reldens-forest');
        let pauseMs = longRun ? 800 : 0;
        let waitObjectTimeout = longRun ? 30000 : 15000;
        let inForest = await Navigation.ensureInRoom(
            page,
            'reldens-forest',
            TestCombat.FOREST_TRANSITION_X,
            TestCombat.FOREST_TRANSITION_Y,
            waitObjectTimeout
        );
        expect(inForest, 'Player must reach reldens-forest before continuing').toBeTruthy();
        await (enemyKey
            ? Phaser.waitForObjectByAssetKey(page, enemyKey, waitObjectTimeout)
            : Phaser.waitForObjectByType(page, 'enemy', waitObjectTimeout));
        return { enemyKey, pauseMs, waitObjectTimeout };
    }

    static async clickEnemy(page, enemyKey)
    {
        if(enemyKey) {
            await Phaser.clickObjectByAssetKey(page, enemyKey);
            return;
        }
        await Phaser.clickObjectByType(page, 'enemy');
    }

    static async targetEnemy(page, enemyKey)
    {
        return page.evaluate((eKey) => {
            let scene = window.reldens.getActiveScene();
            let room = window.reldens && window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!scene){
                return 'no-scene';
            }
            if(!room){
                return 'no-room';
            }
            let player = room.state && room.state.players && room.state.players[room.sessionId];
            let found = null;
            let minDist = Infinity;
            for(let anim of Object.values(scene.objectsAnimations)){
                if(!anim.sceneSprite || !anim.sceneSprite.visible){
                    continue;
                }
                if(eKey && anim.asset_key !== eKey){
                    continue;
                }
                if(!eKey && anim.key === anim.asset_key){
                    continue;
                }
                let dist = player ? Math.hypot(player.x - anim.sceneSprite.x, player.y - anim.sceneSprite.y) : 0;
                if(dist < minDist){
                    minDist = dist;
                    found = anim;
                }
            }
            if(!found){
                let allAnims = Object.values(scene.objectsAnimations).map(
                    a => 'key:'+a.key+'|asset:'+a.asset_key+'|type:'+a.type+'|vis:'+(a.sceneSprite ? a.sceneSprite.visible : 'no-sprite')+'|name:'+a.targetName
                );
                return 'no-enemy-found eKey:'+eKey+'|anims:'+allAnims.join(',');
            }
            let tempId = (found.key === found.asset_key) ? found.id : found.key;
            scene.player.currentTarget = {id: tempId, type: 'object'};
            window.reldens.gameEngine.showTarget(found.targetName || found.key, scene.player.currentTarget, false);
            return true;
        }, enemyKey || null);
    }

    static async walkToEnemyWithinRange(page, enemyKey, range, timeout)
    {
        if(enemyKey){
            return Phaser.moveToObjectWithinRange(page, 'asset_key', enemyKey, 'active', range, timeout);
        }
        return Phaser.moveToObjectWithinRange(page, null, null, null, range, timeout, true);
    }

    static async prepareEnemyTargetAndChat(page, data)
    {
        await TestCombat.targetEnemy(page, data.enemyKey);
        await page.waitForTimeout(data.pauseMs);
        await page.click(Selectors.hud.chatOpen);
        await page.waitForTimeout(data.pauseMs);
    }

    static async prepareSkillCastContext(page, screenshots, gameConfig, longRun, skill, prefix)
    {
        let data = await TestCombat.loginAndGetEnemyWithWorldPos(page, gameConfig, longRun);
        await TestCombat.walkToEnemyWithinRange(page, data.enemyKey, skill.range, data.waitObjectTimeout);
        await screenshots.capture(page, prefix+'-'+skill.key+'-within-range');
        await TestCombat.prepareEnemyTargetAndChat(page, data);
        await TestCombat.walkToEnemyWithinRange(page, data.enemyKey, Math.floor(skill.range / 2), data.waitObjectTimeout);
        await TestCombat.targetEnemy(page, data.enemyKey);
        return data;
    }

    static async runDamageSkillTest(page, screenshots, gameConfig, longRun, skill, prefix)
    {
        await TestCombat.prepareSkillCastContext(page, screenshots, gameConfig, longRun, skill, prefix);
        await page.click(Selectors.combat.skillButton(skill.key));
        await expect(page.locator(Selectors.chat.tabContentGeneral)).toContainText('damage', { timeout: 10000 });
        await screenshots.capture(page, prefix+'-'+skill.key+'-damage-in-chat');
    }

    static async runEffectSkillTest(page, screenshots, gameConfig, longRun, skill, prefix, buttonLabel)
    {
        let data = await TestCombat.prepareSkillCastContext(page, screenshots, gameConfig, longRun, skill, prefix);
        let skillButton = page.locator(Selectors.combat.skillButton(skill.key));
        await expect(skillButton, buttonLabel+' skill button must be present in HUD').toBeVisible({ timeout: 10000 });
        await skillButton.click();
        await page.waitForTimeout(2000 + data.pauseMs);
        await screenshots.capture(page, prefix+'-'+skill.key+'-cast-completed');
    }

    static async waitForPlayerHpCondition(page, condition, timeout)
    {
        return page.waitForFunction(
            (cond) => {
                let room = window.reldens && window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
                if(!room || !room.state || !room.state.players) {
                    return false;
                }
                let player = room.state.players[room.sessionId];
                if(!player || !player.stats) {
                    return false;
                }
                return 'dead' === cond ? Number(player.stats.hp) <= 0 : Number(player.stats.hp) > 0;
            },
            condition,
            { timeout }
        );
    }

    static getPlayerHpFromState(page)
    {
        return page.evaluate(() => {
            let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!room || !room.state || !room.state.players) {
                return null;
            }
            let player = room.state.players[room.sessionId];
            return player && player.stats ? player.stats.hp : null;
        });
    }

    static run()
    {
        test.describe('Combat System', () => {

            test('player can target and attack an enemy', async ({ page, screenshots, gameConfig, longRun }) => {
                let data = await TestCombat.loginAndGetEnemyWithWorldPos(page, gameConfig, longRun);
                await screenshots.capture(page, 'enemy-found-in-scene');
                await page.waitForTimeout(data.pauseMs);
                await TestCombat.walkToEnemyWithinRange(page, data.enemyKey, TestCombat.TAB_TARGET_RANGE, data.waitObjectTimeout);
                let targeted = await TestCombat.targetEnemy(page, data.enemyKey);
                expect(targeted === true, 'Enemy must be targetable: '+targeted).toBeTruthy();
                await expect(page.locator(Selectors.combat.targetBox)).toBeVisible();
                await screenshots.capture(page, 'enemy-targeted');
            });

            test('combat damage message appears in chat', async ({ page, screenshots, gameConfig, longRun }) => {
                let data = await TestCombat.loginAndGetEnemyWithWorldPos(page, gameConfig, longRun);
                let firstAttackSkill = TestCombat.attackSkills[0];
                let skillRange = firstAttackSkill ? firstAttackSkill.range : 100;
                await TestCombat.walkToEnemyWithinRange(page, data.enemyKey, skillRange, data.waitObjectTimeout);
                await screenshots.capture(page, 'within-attack-range');
                await TestCombat.prepareEnemyTargetAndChat(page, data);
                let availableActionKeys = await Phaser.getPlayerAvailableActionKeys(page);
                let firstAttackKey = firstAttackSkill ? firstAttackSkill.key : null;
                let resolvedAttackKey = firstAttackKey || availableActionKeys[0];
                expect(
                    resolvedAttackKey,
                    'No attack action available - ensure player has attack skills. Available: '+availableActionKeys.join(', ')
                ).toBeTruthy();
                await TestCombat.walkToEnemyWithinRange(page, data.enemyKey, Math.floor(skillRange / 2), data.waitObjectTimeout);
                await TestCombat.targetEnemy(page, data.enemyKey);
                await page.click(Selectors.combat.skillButton(resolvedAttackKey));
                await expect(page.locator(Selectors.chat.tabContentGeneral)).toContainText('damage', { timeout: 10000 });
                await screenshots.capture(page, 'damage-message-in-chat');
            });

            test('canvas changes visually after attacking enemy', async ({ page, screenshots, gameConfig, longRun }) => {
                let data = await TestCombat.loginAndGetEnemyWithWorldPos(page, gameConfig, longRun);
                let canvasBox = await page.locator(Selectors.canvas).boundingBox();
                let hashBefore = await Phaser.getCanvasPixelHash(page, 0, 0, canvasBox.width, canvasBox.height);
                await screenshots.capture(page, 'canvas-before-attack');
                await TestCombat.clickEnemy(page, data.enemyKey);
                await page.waitForTimeout(2000);
                let hashAfter = await Phaser.getCanvasPixelHash(page, 0, 0, canvasBox.width, canvasBox.height);
                expect(hashBefore).not.toBe(hashAfter);
                await screenshots.capture(page, 'canvas-after-attack');
            });

            test('player dies from enemy and revives after timeout', async ({ page, screenshots, gameConfig, longRun }) => {
                let data = await TestCombat.loginAndGetEnemyWithWorldPos(page, gameConfig, longRun);
                await TestCombat.walkToEnemyWithinRange(page, data.enemyKey, 30, data.waitObjectTimeout);
                let deathTimeout = longRun ? 120000 : 60000;
                await TestCombat.waitForPlayerHpCondition(page, 'dead', deathTimeout);
                await screenshots.capture(page, 'player-dead');
                let reviveTimeout = longRun ? 120000 : 60000;
                await TestCombat.waitForPlayerHpCondition(page, 'alive', reviveTimeout);
                let playerHpAfter = await TestCombat.getPlayerHpFromState(page);
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
                test('combat skill (effect) - '+skill.key+' applies effect on cast', async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestCombat.runEffectSkillTest(page, screenshots, gameConfig, longRun, skill, 'effect', 'Effect');
                });
            }

            for(let skill of TestCombat.skillsByType.physicalEffect) {
                test('combat skill (physical effect) - '+skill.key+' applies effect on cast', async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestCombat.runEffectSkillTest(page, screenshots, gameConfig, longRun, skill, 'physical-effect', 'Physical effect');
                });
            }

        });
    }
}

TestCombat.run();
