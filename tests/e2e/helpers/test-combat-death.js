/**
 *
 * Reldens - Test Combat Death
 *
 * Death detection and revive waiting helpers for combat tests, and the deterministic death: the server sets the player
 * life to the points one hit removes and places an enemy next to the player with its battle started, so the death
 * comes from a real enemy hit without depending on the enemies damage rate.
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { RoomObjectsApi } = require('./room-objects-api');
const { Logger, sc } = require('@reldens/utils');

class TestCombatDeath
{
    static POLL_STEP_MS = 500;
    static LAST_HIT_POINTS = 1;

    static async killPlayerWithEnemyAttack(page, gameConfig, enemyAssetKey, timeout)
    {
        let playerName = sc.get(gameConfig, 'e2ePlayerName', 'ImRoot');
        let lastHitPoints = await RoomObjectsApi.setPlayerAffectedProperty(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            playerName,
            TestCombatDeath.LAST_HIT_POINTS
        );
        expect(lastHitPoints.value, 'The player last hit points must be set: '+sc.get(lastHitPoints, 'error', ''))
            .toBe(TestCombatDeath.LAST_HIT_POINTS);
        let enemyAttack = await RoomObjectsApi.startEnemyAttack(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            playerName,
            enemyAssetKey
        );
        expect(enemyAttack.enemyKey, 'The enemy attack must start: '+sc.get(enemyAttack, 'error', '')).toBeTruthy();
        await TestCombatDeath.waitForPlayerHpCondition(page, 'dead', timeout);
    }

    static async waitForPlayerHpCondition(page, condition, timeout)
    {
        if('alive' === condition){
            let deadline = Date.now() + timeout;
            let maxSteps = Math.ceil(timeout / TestCombatDeath.POLL_STEP_MS) + 1;
            for(let i = 0; i < maxSteps; i++){
                let state = await TestCombatDeath.evaluateReviveState(page);
                TestCombatDeath.logReviveState('[waitForPlayerAlive] step:'+i, state);
                if(TestCombatDeath.isRevived(state)){
                    return true;
                }
                let remaining = deadline - Date.now();
                if(0 >= remaining){
                    break;
                }
                await page.waitForTimeout(Math.min(TestCombatDeath.POLL_STEP_MS, remaining));
            }
            Logger.critical('[waitForPlayerAlive] timed out after '+timeout+'ms');
            return false;
        }
        return page.waitForFunction(
            (cond) => {
                let playerData = window.reldens && window.reldens.playerData;
                if(!playerData || !playerData.stats){
                    return false;
                }
                return Number(playerData.stats.hp) <= 0;
            },
            condition,
            { timeout }
        );
    }

    static isRevived(state)
    {
        if(!state.gameOverHidden){
            return false;
        }
        if(null !== state.statsHp){
            return 0 < state.statsHp;
        }
        if(null === state.barHp){
            return true;
        }
        return 0 < TestCombatDeath.parseBarHp(state.barHp);
    }

    static parseBarHp(barHp)
    {
        return Number([...(barHp.split(' / '))].shift());
    }

    static logReviveState(prefix, state)
    {
        Logger.error(prefix
            +' statsHp:'+state.statsHp
            +' barHp:'+state.barHp
            +' hasReldens:'+state.hasReldens
            +' hasPlayerData:'+state.hasPlayerData
            +' hasStats:'+state.hasStats
        );
    }

    static evaluateReviveState(page)
    {
        return page.evaluate(() => {
            let gameOver = document.querySelector('#game-over');
            let gameOverHidden = !gameOver || gameOver.classList.contains('hidden');
            let playerData = window.reldens && window.reldens.playerData;
            return {
                gameOverHidden,
                statsHp: playerData && playerData.stats ? Number(playerData.stats.hp) : null,
                barHp: document.querySelector('.stat-bar-hp .stat-bar-text')
                    ? (document.querySelector('.stat-bar-hp .stat-bar-text').textContent || '').trim()
                    : null,
                hasReldens: !!window.reldens,
                hasPlayerData: !!playerData,
                hasStats: !!(playerData && playerData.stats)
            };
        });
    }

    static async getPlayerHpFromState(page)
    {
        let state = await TestCombatDeath.evaluateReviveState(page);
        TestCombatDeath.logReviveState('[getPlayerHpFromState]', state);
        if(null !== state.statsHp){
            return state.statsHp;
        }
        if(null !== state.barHp){
            return TestCombatDeath.parseBarHp(state.barHp);
        }
        return 0;
    }
}

module.exports.TestCombatDeath = TestCombatDeath;
