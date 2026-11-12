/**
 *
 * Reldens - Test Combat Broadcasts
 *
 * Tests what the other clients of the room get from a fight on a placed forest enemy (CombatSkillCasting): the attack,
 * hit and effect sprites of another player, the enemy life bar updates, the death animation, the removed life bar, the
 * cleared target and the enemy sprite hidden on both clients when the enemy dies, the restored full life bar and the
 * enemy sprite shown again on both clients when it respawns active (its sprite jumps to the respawn body position in
 * one frame, the respawn avoids the interpolation, and it is hidden again once the enemies are disabled from the
 * server), a single battle end, a single
 * experience reward and a single kill score (the players scores rows are preserved for the group reset) when two
 * players kill it at once, the enemy fighting only its first player, the second player out of its battle and never
 * attacked (or with chaseMultiple the second player in its battle and hit too: every enemy action gets an unlimited
 * range for the group, so the random action pick always attacks instead of a chase; the first player only holds the
 * aggression and leaves the enemy shot area, and the second player is placed on a clear shot line, so the enemy bullet
 * never ends on another body), and the PvP damage chat message sent to the attacker and the target but
 * not to a third player.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCombatBroadcasts
{

    static ATTACK_SHORT = 'attackShort';
    static HEAL = 'heal';
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};
    static LAST_LIFE_POINTS = 1;
    static QUIET_MS = 1500;
    static DEATH_ANIMATION_KEY = 'default_death';
    static FIRST_PLAYER_TILES = 3;
    static SECOND_PLAYER_TILES = [2, 3, 4, 5, 6];
    static ENEMY_TURNS_MS = 3000;
    static UNLIMITED_RANGE = 0;
    static READ_ENEMY_VISIBLE = (enemyKey) => Boolean(
        window.reldens.getActiveScene().objectsAnimations[enemyKey]?.sceneSprite?.visible
    );
    static RECORD_ENEMY_MOVES = (enemyKey) => {
        let scene = window.reldens.getActiveScene();
        let readSprite = () => [scene.objectsAnimations[enemyKey].sceneSprite].map((sprite) => [sprite.x, sprite.y]).pop();
        let recorder = {scene, moves: [], last: readSprite(), hadEntry: false};
        recorder.onPreUpdate = () => {
            recorder.hadEntry = enemyKey in scene.interpolateObjectsPositions;
        };
        recorder.onPostUpdate = () => {
            let current = readSprite();
            if(current[0] === recorder.last[0] && current[1] === recorder.last[1]){
                return;
            }
            let body = window.reldens.activeRoomEvents.room.state.bodies.get(enemyKey);
            recorder.moves.push({hadEntry: recorder.hadEntry, from: recorder.last, to: current, body: [body.x, body.y]});
            recorder.last = current;
        };
        scene.events.on('preupdate', recorder.onPreUpdate);
        scene.events.on('postupdate', recorder.onPostUpdate);
        window.e2eEnemyMovesRecorder = recorder;
    };
    static STOP_ENEMY_MOVES = () => {
        let recorder = window.e2eEnemyMovesRecorder;
        recorder.scene.events.off('preupdate', recorder.onPreUpdate);
        recorder.scene.events.off('postupdate', recorder.onPostUpdate);
        return recorder.moves;
    };

    static async prepareAttack(page, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let directAttack = TestCombatBroadcasts.DIRECT_ATTACK;
        await CombatSkillCasting.changeSkill(context, e2eGroup, TestCombatBroadcasts.ATTACK_SHORT, directAttack);
        return context;
    }

    static async prepareSecondAttacker(secondPage, context, e2eGroup, longRun)
    {
        await Login.loginRootPlayer(secondPage, context.gameConfig, longRun, '2');
        let secondContext = Object.assign({}, context, {playerName: context.gameConfig.e2ePlayerName2});
        let directAttack = TestCombatBroadcasts.DIRECT_ATTACK;
        await CombatSkillCasting.changeSkill(secondContext, e2eGroup, TestCombatBroadcasts.ATTACK_SHORT, directAttack);
        await GameplayE2eStateApi.recordPlayerSkills(context.gameConfig, context.roomName, secondContext.playerName);
        await CombatSkillCasting.targetEnemy(secondPage, context);
        return secondContext;
    }

    static async setEnemyLastLife(context)
    {
        await GameplayE2eStateApi.setEnemyBodyLife(
            context.gameConfig,
            context.roomName,
            context.bodyKey,
            TestCombatBroadcasts.LAST_LIFE_POINTS
        );
    }

    static async fetchClientEnemyBar(clientPage, enemyKey)
    {
        return await clientPage.evaluate((key) => {
            let lifeBarUi = window.reldens.features.featuresList.users.lifeBarUi;
            return {
                value: (lifeBarUi.lifeDataByKey[key] || {})[lifeBarUi.barPropertyValue()],
                isDrawn: Boolean(lifeBarUi.lifeBars[key] && lifeBarUi.lifeBars[key].active)
            };
        }, enemyKey);
    }

    static async loadRespawnTime(gameConfig)
    {
        return Number((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'respawn', {
            object_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'objects', {client_key: gameConfig.e2eEnemyKey})
        })).shift().respawn_time);
    }

    static async runOtherPlayerSpritesTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatBroadcasts.prepareAttack(page, gameConfig, e2eGroup, longRun);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await SceneSpritesRecorder.start(secondPage);
        await CombatSkillCasting.castSkill(page, context, TestCombatBroadcasts.ATTACK_SHORT, 1);
        await SceneSpritesRecorder.waitForTextures(
            secondPage,
            ['default'+ActionsConst.ACTIONS.SUFFIX.ATTACK, ActionsConst.DEFAULT_HIT_ANIMATION_KEY],
            context.timeout
        );
        await CombatSkillCasting.targetSelf(page);
        await CombatSkillCasting.expectSkillRun(page, context, TestCombatBroadcasts.HEAL, true, 'Heal cast');
        await SceneSpritesRecorder.waitForTextures(
            secondPage,
            [TestCombatBroadcasts.HEAL+ActionsConst.ACTIONS.SUFFIX.HIT],
            context.timeout
        );
        await screenshots.capture(secondPage, 'other-player-skill-sprites');
    }

    static async runEnemyDeathTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatBroadcasts.prepareAttack(page, gameConfig, e2eGroup, longRun);
        let respawnTime = await TestCombatBroadcasts.loadRespawnTime(gameConfig);
        test.setTimeout(respawnTime + context.timeout * 4);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await CombatSkillCasting.targetEnemy(secondPage, context);
        await SceneSpritesRecorder.start(secondPage);
        let firstHit = await CombatSkillCasting.castSkill(page, context, TestCombatBroadcasts.ATTACK_SHORT, 1);
        await expect.poll(
            async () => (await TestCombatBroadcasts.fetchClientEnemyBar(secondPage, context.enemyKey)).value,
            {message: 'The life bar update must reach the second client', timeout: context.timeout}
        ).toBe(firstHit.newValue);
        expect((await TestCombatBroadcasts.fetchClientEnemyBar(secondPage, context.enemyKey)).isDrawn).toBe(true);
        await TestCombatBroadcasts.setEnemyLastLife(context);
        await CombatSkillCasting.castSkill(page, context, TestCombatBroadcasts.ATTACK_SHORT, 2);
        await SceneSpritesRecorder.waitForTextures(secondPage, [TestCombatBroadcasts.DEATH_ANIMATION_KEY], context.timeout);
        await expect.poll(
            async () => await secondPage.evaluate(() => window.reldens.getCurrentPlayer().currentTarget),
            {message: 'The second client target must be cleared', timeout: context.timeout}
        ).toBe(false);
        let deadEnemyBar = await TestCombatBroadcasts.fetchClientEnemyBar(secondPage, context.enemyKey);
        expect(deadEnemyBar.isDrawn, 'The dead enemy life bar is removed').toBe(false);
        await expect.poll(
            async () => Promise.all([page, secondPage].map(
                (clientPage) => clientPage.evaluate(TestCombatBroadcasts.READ_ENEMY_VISIBLE, context.enemyKey)
            )),
            {message: 'Every client hides the dead enemy sprite', timeout: context.timeout}
        ).toEqual([false, false]);
        await screenshots.capture(secondPage, 'enemy-death-broadcast');
        await secondPage.evaluate(TestCombatBroadcasts.RECORD_ENEMY_MOVES, context.enemyKey);
        let totalLife = (await GameplayE2eStateApi.fetchEnemyLife(gameConfig, context.roomName, context.bodyKey)).totalLife;
        await expect.poll(
            async () => (await TestCombatBroadcasts.fetchClientEnemyBar(secondPage, context.enemyKey)).value,
            {message: 'The respawned full life must reach the second client', timeout: respawnTime + context.timeout}
        ).toBe(totalLife);
        expect(await CombatSkillCasting.fetchEnemyLife(context), 'Respawned with full stats').toBe(totalLife);
        await expect.poll(
            async () => Promise.all([page, secondPage].map(
                (clientPage) => clientPage.evaluate(TestCombatBroadcasts.READ_ENEMY_VISIBLE, context.enemyKey)
            )),
            {message: 'Every client shows the respawned active enemy sprite again', timeout: context.timeout}
        ).toEqual([true, true]);
        let respawnJumps = (await secondPage.evaluate(TestCombatBroadcasts.STOP_ENEMY_MOVES)).filter(
            (move) => !move.hadEntry && Navigation.TILE_SIZE < Math.hypot(move.to[0] - move.from[0], move.to[1] - move.from[1])
        );
        expect(
            respawnJumps.map((move) => sc.toJsonString(move.to) === sc.toJsonString(move.body)),
            'The respawned enemy sprite jumps to its body position in one frame with no interpolation entry'
        ).toEqual([true]);
        await RoomObjectsApi.disableEnemies(gameConfig, context.roomName, false);
        await expect.poll(
            async () => Promise.all([page, secondPage].map(
                (clientPage) => clientPage.evaluate(TestCombatBroadcasts.READ_ENEMY_VISIBLE, context.enemyKey)
            )),
            {message: 'Every client hides the disabled enemy sprite', timeout: context.timeout}
        ).toEqual([false, false]);
    }

    static async preservePlayersScores(gameConfig, e2eGroup, playersNames)
    {
        let playersIds = [];
        for(let playerName of playersNames){
            let playerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName});
            await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'scores', {player_id: playerId});
            playersIds.push(playerId);
        }
        return playersIds;
    }

    static async fetchPlayersScore(gameConfig, playersIds)
    {
        let scoresRows = [];
        for(let playerId of playersIds){
            scoresRows.push(...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'scores', {player_id: playerId}));
        }
        return scoresRows.reduce((playersScore, scoreRow) => playersScore + Number(scoreRow.total_score), 0);
    }

    static async runSimultaneousKillTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatBroadcasts.prepareAttack(page, gameConfig, e2eGroup, longRun);
        let secondContext = await TestCombatBroadcasts.prepareSecondAttacker(secondPage, context, e2eGroup, longRun);
        expect(context.enemyKillScore, 'The placed enemy must have its own kill score').toBeGreaterThan(0);
        let playersIds = await TestCombatBroadcasts.preservePlayersScores(
            gameConfig,
            e2eGroup,
            [context.playerName, secondContext.playerName]
        );
        let scoreBefore = await TestCombatBroadcasts.fetchPlayersScore(gameConfig, playersIds);
        let fetchExperience = async (playerName) => (await GameplayE2eStateApi.fetchPlayer(
            gameConfig,
            context.roomName,
            playerName
        )).experience;
        let fetchTotalExperience = async () => await fetchExperience(context.playerName)
            + await fetchExperience(secondContext.playerName);
        let experienceBefore = await fetchTotalExperience();
        await RoomMessagesRecorder.start(page);
        await RoomMessagesRecorder.start(secondPage);
        await TestCombatBroadcasts.setEnemyLastLife(context);
        let skillButton = Selectors.combat.skillButton(TestCombatBroadcasts.ATTACK_SHORT);
        await Promise.all([page.click(skillButton, {force: true}), secondPage.click(skillButton, {force: true})]);
        await RoomMessagesRecorder.waitForMessage(page, ActionsConst.BATTLE_ENDED, context.timeout);
        await page.waitForTimeout(TestCombatBroadcasts.QUIET_MS);
        let battleEndsCounts = [];
        for(let clientPage of [page, secondPage]){
            battleEndsCounts.push((await RoomMessagesRecorder.fetchMessages(clientPage, ActionsConst.BATTLE_ENDED)).filter(
                message => context.enemyKey === message[ActionsConst.DATA_OBJECT_KEY_TARGET]
            ).length);
        }
        expect(Math.min(...battleEndsCounts), 'One battle end broadcast to the player that did not kill').toBe(1);
        await expect.poll(
            fetchTotalExperience,
            {message: 'One experience reward', timeout: context.timeout}
        ).toBe(experienceBefore + context.enemyExperience);
        await expect.poll(
            async () => await TestCombatBroadcasts.fetchPlayersScore(gameConfig, playersIds),
            {message: 'One kill score', timeout: context.timeout}
        ).toBe(scoreBefore + context.enemyKillScore);
        await page.waitForTimeout(TestCombatBroadcasts.QUIET_MS);
        expect(
            await TestCombatBroadcasts.fetchPlayersScore(gameConfig, playersIds),
            'The kill score is never added twice'
        ).toBe(scoreBefore + context.enemyKillScore);
        await screenshots.capture(page, 'simultaneous-kill');
    }

    static async runEnemyBusyTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatBroadcasts.prepareAttack(page, gameConfig, e2eGroup, longRun);
        let secondContext = await TestCombatBroadcasts.prepareSecondAttacker(secondPage, context, e2eGroup, longRun);
        await CombatSkillCasting.placeByEnemy(
            page,
            context,
            RoomObjectsApi.placePlayerNextToObject,
            TestCombatBroadcasts.FIRST_PLAYER_TILES,
            'The first player must leave the enemy shot area'
        );
        await CombatSkillCasting.placeByEnemy(
            secondPage,
            context,
            RoomObjectsApi.placePlayerInLineOfObject,
            TestCombatBroadcasts.SECOND_PLAYER_TILES,
            'The second player must be placed on a clear shot line'
        );
        let fetchSecondLife = async () => (await GameplayE2eStateApi.fetchPlayer(
            gameConfig,
            context.roomName,
            secondContext.playerName
        )).life;
        let secondLife = await fetchSecondLife();
        let secondPlayerId = String(await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {
            name: secondContext.playerName
        }));
        let fetchInBattlePlayers = async () => (await CombatSkillCasting.fetchEnemySnapshot(context)).inBattlePlayers;
        expect(await CombatSkillCasting.fetchEnemyInBattle(context), 'Held in battle with the first player').toBe(1);
        await CombatSkillCasting.castSkill(secondPage, secondContext, TestCombatBroadcasts.ATTACK_SHORT, 1);
        await page.waitForTimeout(TestCombatBroadcasts.ENEMY_TURNS_MS);
        expect(await fetchInBattlePlayers(), 'The busy enemy ignores the second player').not.toContain(secondPlayerId);
        expect(await CombatSkillCasting.fetchEnemyInBattle(context), 'The busy enemy keeps only its first player').toBe(1);
        expect(await fetchSecondLife(), 'The busy enemy never attacks the second player').toBe(secondLife);
        await GameplayE2eStateApi.changeEnemyBattle(gameConfig, e2eGroup, context.roomName, context.bodyKey, {
            chaseMultiple: true
        });
        await GameplayE2eStateApi.changeEnemyActions(gameConfig, e2eGroup, context.roomName, context.bodyKey, {
            range: TestCombatBroadcasts.UNLIMITED_RANGE
        });
        await CombatSkillCasting.castSkill(secondPage, secondContext, TestCombatBroadcasts.ATTACK_SHORT, 2);
        await expect.poll(
            fetchInBattlePlayers,
            {message: 'With chaseMultiple the second player joins the enemy battle', timeout: context.timeout}
        ).toContain(secondPlayerId);
        await expect.poll(
            fetchSecondLife,
            {message: 'With chaseMultiple the enemy fights the second player too', timeout: context.timeout}
        ).toBeLessThan(secondLife);
        await screenshots.capture(page, 'enemy-busy-and-chase-multiple');
    }

    static async runPvpChatTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatBroadcasts.prepareAttack(page, gameConfig, e2eGroup, longRun);
        let players = await CombatSkillCasting.prepareTargetAndObserver(page, secondPage, context, longRun);
        let targetPlayer = players.targetPlayer;
        let thirdPage = players.observerClient.clientPage;
        for(let clientPage of [page, secondPage, thirdPage]){
            await clientPage.click(Selectors.hud.chatOpen);
        }
        await CombatSkillCasting.targetPlayer(page, targetPlayer.sessionId);
        let pvpHit = await CombatSkillCasting.castSkill(page, context, TestCombatBroadcasts.ATTACK_SHORT, 1);
        let damageText = pvpHit.damage+' damage on '+targetPlayer.playerName;
        await expect(page.locator(Selectors.chat.tabContentGeneral), 'Attacker').toContainText(damageText);
        await expect(secondPage.locator(Selectors.chat.tabContentGeneral), 'Target').toContainText(damageText);
        await page.waitForTimeout(TestCombatBroadcasts.QUIET_MS);
        await expect(thirdPage.locator(Selectors.chat.tabContentGeneral), 'Unrelated').not.toContainText(damageText);
        await screenshots.capture(secondPage, 'pvp-damage-chat');
        await players.observerClient.clientContext.close();
    }

    static run()
    {
        test.describe('Combat Broadcasts', () => {
            test('second client sees the attack, hit and effect sprites of another player', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatBroadcasts.runOtherPlayerSpritesTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('enemy life bar, death, cleared target and respawn reach a second client', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatBroadcasts.runEnemyDeathTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('two players killing the same enemy at once end the battle and reward once', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatBroadcasts.runSimultaneousKillTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('enemy fights only its first player unless chaseMultiple is enabled', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatBroadcasts.runEnemyBusyTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('PvP damage chat message reaches the attacker and the target only', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatBroadcasts.runPvpChatTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestCombatBroadcasts.run();
