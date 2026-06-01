/**
 *
 * Reldens - Player State Reset
 *
 * Captures and restores player stats, room state, and inventory equipped status between
 * e2e tests to ensure isolation. All test players are reset to full HP, placed in the safe
 * town room, and have all equipped items unequipped.
 *
 */

const { Logger } = require('@reldens/utils');
const { TestDataSetup } = require('./test-data-setup');

class PlayerStateReset
{
    static SAFE_ROOM_ID = 4;
    static SAFE_X = 400;
    static SAFE_Y = 345;
    static SAFE_DIR = 'down';

    static async captureSnapshots(dataServer, config)
    {
        let testUsers = [
            { username: config.e2eUsername || 'root', playerName: config.e2ePlayerName || 'ImRoot' },
            { username: config.e2eUsername2 || 'root2', playerName: config.e2ePlayerName2 || 'ImRoot2' },
            { username: config.e2eUsername3 || 'root3', playerName: config.e2ePlayerName3 || 'ImRoot3' }
        ];
        let snapshots = {};
        for(let u of testUsers){
            let user = await dataServer.getEntity('users').loadOneBy('username', u.username);
            if(!user){
                continue;
            }
            let players = await dataServer.getEntity('players').loadBy('user_id', user.id);
            if(!players || !players.length){
                continue;
            }
            let matched = players.find(p => p.name === u.playerName) || players[0];
            let playerId = matched.id;
            Logger.info('[player-state-reset] Snapshot for: '+matched.name+' (id: '+playerId+')');
            let stats = await dataServer.getEntity('playersStats').loadBy('player_id', playerId);
            let state = await dataServer.getEntity('playersState').loadOneBy('player_id', playerId);
            let inventoryItems = await dataServer.getEntity('itemsInventory').loadBy('owner_id', playerId);
            snapshots[String(playerId)] = { stats, state, inventoryItems: inventoryItems || [], userId: user.id };
        }
        Logger.info('[player-state-reset] Snapshots captured for '+Object.keys(snapshots).length+' players.');
        return snapshots;
    }

    static async restorePlayerStats(dataServer, stats)
    {
        for(let stat of stats){
            await dataServer.getEntity('playersStats').updateById(stat.id, { value: stat.base_value });
        }
    }

    static async restorePlayerInventory(dataServer, inventoryItems)
    {
        for(let invItem of inventoryItems){
            await dataServer.getEntity('itemsInventory').updateById(invItem.id, {
                'is_active': 0,
                qty: invItem.qty,
                remaining_uses: invItem.remaining_uses
            });
        }
    }

    static async clearRewardsState(dataServer, playerId)
    {
        try {
            let rewardsStateRepo = dataServer.getEntity('rewardsEventsState');
            let existing = await rewardsStateRepo.loadBy('player_id', playerId);
            if(!existing || !existing.length){
                return;
            }
            let now = new Date();
            let todayString = now.getFullYear()
                +'-'+String(now.getMonth() + 1).padStart(2, '0')
                +'-'+String(now.getDate()).padStart(2, '0');
            for(let stateRow of existing){
                let readyState = { 'ready': true, 'date': todayString, 'complete': false };
                await rewardsStateRepo.updateById(stateRow.id, { 'state': JSON.stringify(readyState) });
            }
            Logger.info('[player-state-reset] Reset '+existing.length+' rewards states to ready for player '+playerId);
        } catch(error){
            Logger.warning('[player-state-reset] Could not reset rewards state for player '+playerId+': '+error.message);
        }
    }

    static async ensureTodayLogin(dataServer, userId)
    {
        try {
            let usersLoginRepo = dataServer.getEntity('usersLogin');
            await usersLoginRepo.create({ 'user_id': userId, 'login_date': new Date() });
            Logger.info('[player-state-reset] Added users_login row for user '+userId);
        } catch(error){
            Logger.warning('[player-state-reset] Could not add users_login for user '+userId+': '+error.message);
        }
    }

    static async restoreSnapshots(dataServer, snapshots)
    {
        for(let playerId of Object.keys(snapshots)){
            let snap = snapshots[playerId];
            await PlayerStateReset.restorePlayerStats(dataServer, snap.stats);
            await PlayerStateReset.restorePlayerInventory(dataServer, snap.inventoryItems || []);
            await PlayerStateReset.clearRewardsState(dataServer, playerId);
            if(snap.userId){
                await PlayerStateReset.ensureTodayLogin(dataServer, snap.userId);
            }
            if(!snap.state){
                continue;
            }
            await dataServer.getEntity('playersState').updateById(snap.state.id, {
                room_id: PlayerStateReset.SAFE_ROOM_ID,
                x: PlayerStateReset.SAFE_X,
                y: PlayerStateReset.SAFE_Y,
                'dir': PlayerStateReset.SAFE_DIR
            });
        }
        Logger.info('[player-state-reset] Players restored: '+Object.keys(snapshots).length);
    }

    static registerResetEndpoint(serverManager, snapshots, config)
    {
        serverManager.app.post('/api/e2e/reset-players', async (request, response) => {
            try {
                await PlayerStateReset.restoreSnapshots(serverManager.dataServer, snapshots);
                if(config){
                    await TestDataSetup.ensureRequiredItems(serverManager.dataServer, config);
                }
                response.json({ ok: true });
            } catch(error){
                Logger.error('[player-state-reset] Reset failed: '+error.message);
                response.status(500).json({ ok: false, error: error.message });
            }
        });
        Logger.info('[player-state-reset] Reset endpoint registered.');
    }
}

module.exports.PlayerStateReset = PlayerStateReset;
