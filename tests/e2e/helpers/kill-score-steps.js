/**
 *
 * Reldens - Kill Score Steps
 *
 * The steps of the kill score specs: the stored scores rows of a player (preserved for the group, so the group reset
 * restores them) and its total score, the forest enemy with its own "killScore" placed next to the player and targeted
 * (ForestEnemyKill), the attack repeated until a condition is reached (the expected total score, the experience of the
 * kill), the wait for a late score (the long run walks the player during it, so the video never freezes) and the second
 * group player placed next to the first one in the forest with one life point (some life points in the long run) and
 * targeted with a click, returning its level. The long run opens the scores panel before its recording starts. The
 * next enemy to kill is placed without a new login, a method of the kill score subscriber (or of its updater, provider
 * and sender) is delayed or failed for the group and its calls are read (KillScoreSubscriberOverrides), and the
 * subscriber runs a kill event mapped like the scores plugin listener maps it. A player named with the stored HTML
 * payload is created for a user, and a shown name is checked as text with no script run and no payload image created.
 *
 */

const { expect } = require('@playwright/test');
const { BaseE2eTest } = require('../base-e2e-test');
const { Login } = require('./login');
const { Phaser } = require('./phaser');
const { Navigation } = require('./navigation');
const { RoomObjectsApi } = require('./room-objects-api');
const { ForestEnemyKill } = require('./forest-enemy-kill');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./long-run-showcase');
const { SecurityApi } = require('./security-api');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class KillScoreSteps
{

    static VICTIM_CLICK_OFFSET_PIXELS = 16;
    static VICTIM_ONE_HIT_LIFE = 1;
    static VICTIM_SHOWCASE_LIFE = 30;
    static LATE_SCORE_WALK_KEYS = ['ArrowDown', 'ArrowUp'];
    static LATE_SCORE_WALK_MS = TimeConstants.SERVER_RESPONSE / 2;
    static CALLS_KEY_PREFIX = 'killScore.';
    static STORED_HTML_PATH = FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'assets', 'stored-html-payload.html');

    static async createHtmlNamedPlayer(gameConfig, e2eGroup, username)
    {
        let htmlName = FileHandler.readFile(KillScoreSteps.STORED_HTML_PATH).trim();
        await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'players', {
            user_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'users', {username}),
            name: htmlName
        });
        return htmlName;
    }

    static async expectNameAsText(nameLocator, htmlName)
    {
        await expect(nameLocator, 'The name shown as text').toHaveText(htmlName);
        expect(
            await nameLocator.page().evaluate(() => [
                Boolean(window.e2eStoredScriptRan),
                document.querySelectorAll('img[src="x"]').length
            ]),
            'No script ran and no image of the name was created'
        ).toEqual([false, 0]);
    }

    static async fetchScoreRows(gameConfig, playerId)
    {
        return await E2eSeedAndRestoreApi.loadRows(gameConfig, 'scores', {player_id: playerId});
    }

    static async fetchTotalScore(gameConfig, playerId)
    {
        return (await KillScoreSteps.fetchScoreRows(gameConfig, playerId)).reduce(
            (totalScore, scoreRow) => totalScore + Number(scoreRow.total_score),
            0
        );
    }

    static async prepareKillScore(gameConfig, e2eGroup, longRun, playerName = gameConfig.e2ePlayerName)
    {
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'scores', {player_id: playerId});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'scoresDetail', {player_id: playerId});
        return {playerId, scoreBefore: await KillScoreSteps.fetchTotalScore(gameConfig, playerId)};
    }

    static async placeEnemyWithKillScore(page, gameConfig, longRun)
    {
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        let placement = await ForestEnemyKill.placeEnemyToKill(page, gameConfig, forestData.sceneTimeout, longRun);
        expect(placement.killScore, 'The placed enemy must have its own kill score').toBeGreaterThan(0);
        await LongRunShowcase.openPanel(page, Selectors.hud.scoresOpen, Selectors.scores.dialog, longRun);
        return placement;
    }

    static async openScoresPanel(page, longRun)
    {
        if(await page.locator(Selectors.scores.dialog).isVisible()){
            return;
        }
        let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
        await page.locator(Selectors.hud.scoresOpen).waitFor({state: 'visible', timeout: uiTimeout});
        await page.click(Selectors.hud.scoresOpen);
        await expect(page.locator(Selectors.scores.dialog)).toBeVisible({timeout: uiTimeout});
    }

    static async fetchPanelContent(page)
    {
        return await page.evaluate((selectors) => ({
            rows: [...document.querySelectorAll(selectors.dialogRows)].map(row => ({
                playerName: row.querySelector(selectors.rowPlayerName).textContent.trim(),
                totalScore: Number(row.querySelector(selectors.rowValue).textContent)
            })),
            myScore: Number((document.querySelector(selectors.myScore)?.textContent || '').split(':').pop())
        }), Selectors.scores);
    }

    static async showScore(page, expectedScore, longRun)
    {
        return await LongRunShowcase.showWhen(
            page,
            async () => (await page.locator(Selectors.scores.dialogContent).innerText()).includes(String(expectedScore)),
            'The scores panel must show the score '+expectedScore,
            TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun),
            longRun
        );
    }

    static async attackUntil(page, isReached, message, skillKey = ForestEnemyKill.ATTACK_SKILL_KEY)
    {
        let reached = await RoomObjectsApi.attackTargetUntil(page, skillKey, isReached, TimeConstants.ENEMY_KILL);
        expect(reached, message).toBe(true);
    }

    static async attackUntilScore(page, gameConfig, scoreData, expectedScore, longRun)
    {
        await LongRunShowcase.showStepWhenText(
            page,
            Selectors.scores.dialogContent,
            String(expectedScore),
            'Score after the kill: '+expectedScore+' (it was '+scoreData.scoreBefore+')',
            longRun
        );
        await KillScoreSteps.attackUntil(
            page,
            async () => expectedScore === await KillScoreSteps.fetchTotalScore(gameConfig, scoreData.playerId),
            'The kill must add its kill score, the player score must be '+expectedScore
        );
    }

    static async attackUntilKill(page, gameConfig)
    {
        let fetchExperience = async () => (await GameplayE2eStateApi.fetchPlayer(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName
        )).experience;
        let experienceBefore = await fetchExperience();
        await KillScoreSteps.attackUntil(
            page,
            async () => experienceBefore < await fetchExperience(),
            'The enemy must be killed and give its experience'
        );
        return {experienceBefore, experienceAfter: await fetchExperience()};
    }

    static async placeNextEnemy(page, gameConfig, longRun)
    {
        let placement = await ForestEnemyKill.placeEnemyToKill(
            page,
            gameConfig,
            TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun),
            longRun
        );
        expect(placement.killScore, 'The next placed enemy must have its own kill score').toBeGreaterThan(0);
        return placement;
    }

    static async overrideSubscriberMethod(context, targetKey, methodKey, behavior)
    {
        let override = await SecurityApi.request(
            context.gameConfig,
            'POST',
            '/api/e2e/kill-score/method-override',
            Object.assign({group: context.e2eGroup, targetKey, methodKey}, behavior)
        );
        expect(override.methodKey, 'The kill score '+targetKey+' method must change: '+override.error).toBe(methodKey);
        return override;
    }

    static async fetchMethodCalls(context, targetKey, methodKey)
    {
        return await SecurityApi.request(
            context.gameConfig,
            'GET',
            '/api/e2e/live-objects/room-method-failures?callsKey='+encodeURIComponent(
                KillScoreSteps.CALLS_KEY_PREFIX+targetKey
            )+'&methodKey='+encodeURIComponent(methodKey)
        );
    }

    static async runKillEvent(gameConfig, killData)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/kill-score/kill-event',
            Object.assign({roomName: Login.FOREST_ROOM_NAME}, killData)
        );
    }

    static async waitForLateScore(page, longRun)
    {
        if(!longRun){
            return await page.waitForTimeout(TimeConstants.SERVER_RESPONSE);
        }
        for(let walkKey of KillScoreSteps.LATE_SCORE_WALK_KEYS){
            await Navigation.walkInDirection(page, walkKey, KillScoreSteps.LATE_SCORE_WALK_MS);
        }
    }

    static async placeTargetedVictim(page, secondPage, gameConfig, longRun)
    {
        let victimName = gameConfig.e2ePlayerName2;
        await Login.loginAndStartGame(
            secondPage,
            gameConfig.e2eUsername2,
            sc.get(gameConfig, 'e2ePassword2', 'root'),
            victimName,
            longRun,
            false,
            Login.FOREST_ROOM_NAME
        );
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, !longRun);
        let placement = await RoomObjectsApi.placePlayerNearPlayer(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            victimName,
            gameConfig.e2ePlayerName
        );
        expect(placement.position, 'The victim must be placed next to the player: '+sc.get(placement, 'error', ''))
            .toBeTruthy();
        let victimLife = longRun ? KillScoreSteps.VICTIM_SHOWCASE_LIFE : KillScoreSteps.VICTIM_ONE_HIT_LIFE;
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            victimName,
            victimLife
        );
        expect(lowered.value, 'The victim life must be lowered: '+sc.get(lowered, 'error', '')).toBe(victimLife);
        let victimSessionId = await (await page.waitForFunction((name) => {
            let playerEngine = window.reldens.getActiveScene()?.player;
            if(!playerEngine?.players){
                return false;
            }
            return Object.keys(playerEngine.players).find(id => name === playerEngine.players[id].playerName) || false;
        }, victimName, {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)})).jsonValue();
        await page.waitForFunction((args) => {
            let playerEngine = window.reldens.getActiveScene()?.player;
            let victimSprite = playerEngine?.players?.[args.sessionId];
            if(!victimSprite){
                return false;
            }
            return args.x - playerEngine.leftOff === victimSprite.x && args.y - playerEngine.topOff === victimSprite.y;
        }, {sessionId: victimSessionId, x: placement.position.x, y: placement.position.y}, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await BaseE2eTest.waitForCameraStill(page);
        await Phaser.clickPlayerAwayFromOwnPlayer(page, victimSessionId, KillScoreSteps.VICTIM_CLICK_OFFSET_PIXELS);
        await expect(page.locator(Selectors.combat.targetBox), 'The clicked victim must be targeted').toContainText(
            victimName
        );
        await LongRunShowcase.openPanel(page, Selectors.hud.scoresOpen, Selectors.scores.dialog, longRun);
        return (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, victimName)).level;
    }

}

module.exports.KillScoreSteps = KillScoreSteps;
