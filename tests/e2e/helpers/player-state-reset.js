/**
 *
 * Reldens - Player State Reset
 *
 * Captures and restores player stats, room state, and inventory equipped status between
 * e2e tests to ensure isolation. The reset first waits until no scene room holds a test player (the closed page of the
 * previous test makes its session leave, and the room leave saves the player and then removes it, so its pending save
 * never overwrites the restored state and its body never stays in a room the next test uses), then
 * all test players are reset to full HP, placed in the safe town room, and have all equipped items unequipped.
 *
 */

const { setTimeout: waitMs } = require('timers/promises');
const { Logger, sc } = require('@reldens/utils');
const { TestDataSetup } = require('./test-data-setup');
const { RoomEnemiesReset } = require('./room-enemies-reset');
const { RoomMovementState } = require('./room-movement-state');
const { SecurityState } = require('./security-state');

class PlayerStateReset
{
    static SAFE_ROOM_ID = 41;
    static SAFE_X = 1520;
    static SAFE_Y = 1424;
    static SAFE_DIR = 'down';
    static LEAVE_CHECKS = 100;
    static LEAVE_CHECK_MS = 100;

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
            snapshots[String(playerId)] = {
                stats,
                state,
                inventoryItems: inventoryItems || [],
                userId: user.id,
                username: u.username,
                playerName: matched.name
            };
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

    static async restorePlayerInventory(dataServer, playerId, inventoryItems)
    {
        let inventoryRepository = dataServer.getEntity('itemsInventory');
        let snapshotItemsIds = inventoryItems.map((invItem) => String(invItem.id));
        let currentItems = await inventoryRepository.loadBy('owner_id', playerId) || [];
        let removedItems = currentItems.filter((currentItem) => -1 === snapshotItemsIds.indexOf(String(currentItem.id)));
        for(let removedItem of removedItems){
            await inventoryRepository.deleteById(removedItem.id);
        }
        Logger.info('[player-state-reset] Removed '+removedItems.length+' items added by the tests to player '+playerId);
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
            await PlayerStateReset.restorePlayerInventory(dataServer, playerId, snap.inventoryItems || []);
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

    static findTestPlayersSessions(createdInstances, playerNames)
    {
        let sessions = [];
        for(let instanceId of Object.keys(createdInstances)){
            let room = createdInstances[instanceId];
            if(!sc.isFunction(room.disconnectBySessionId)){
                continue;
            }
            PlayerStateReset.appendRoomTestSessions(sessions, room, playerNames);
        }
        return sessions;
    }

    static appendRoomTestSessions(sessions, room, playerNames)
    {
        for(let sessionId of room.state.players.keys()){
            if(playerNames.includes(room.state.players.get(sessionId).playerName)){
                sessions.push({room, sessionId});
            }
        }
    }

    static async waitForTestPlayersToLeave(createdInstances, snapshots)
    {
        let playerNames = Object.keys(snapshots).map(playerId => snapshots[playerId].playerName);
        for(let check = 0; check < PlayerStateReset.LEAVE_CHECKS; check++){
            let remaining = PlayerStateReset.findTestPlayersSessions(createdInstances, playerNames);
            if(0 === remaining.length){
                return true;
            }
            await waitMs(PlayerStateReset.LEAVE_CHECK_MS);
        }
        Logger.error('[player-state-reset] Test players still in a room after '+PlayerStateReset.LEAVE_CHECKS+' checks.');
        return false;
    }

    static registerResetEndpoint(serverManager, snapshots, config)
    {
        serverManager.app.post('/api/e2e/reset-players', async (request, response) => {
            try {
                await PlayerStateReset.waitForTestPlayersToLeave(serverManager.roomsManager.createdInstances, snapshots);
                await SecurityState.resetAll(serverManager);
                await PlayerStateReset.restoreSnapshots(serverManager.dataServer, snapshots);
                if(config){
                    await TestDataSetup.ensureRequiredItems(serverManager.dataServer, config);
                }
                await RoomEnemiesReset.restoreAll(serverManager.roomsManager);
                RoomMovementState.restoreRandomMovement(serverManager.roomsManager);
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
