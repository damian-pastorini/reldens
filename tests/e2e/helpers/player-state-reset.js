/**
 *
 * Reldens - Player State Reset
 *
 * Captures and restores player stats and room state between e2e tests to ensure isolation.
 * All test players are reset to full HP and placed in the safe town room.
 *
 */

const { Logger } = require('@reldens/utils');

class PlayerStateReset
{
    static SAFE_ROOM_ID = 4;
    static SAFE_X = 400;
    static SAFE_Y = 345;
    static SAFE_DIR = 'down';

    static async captureSnapshots(dataServer, config)
    {
        let testUsers = [
            { username: config.e2eUsername || 'root' },
            { username: config.e2eUsername2 || 'root2' },
            { username: config.e2eUsername3 || 'root3' }
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
            let playerId = players[0].id;
            let stats = await dataServer.getEntity('playersStats').loadBy('player_id', playerId);
            let state = await dataServer.getEntity('playersState').loadOneBy('player_id', playerId);
            snapshots[String(playerId)] = { stats, state };
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

    static async restoreSnapshots(dataServer, snapshots)
    {
        for(let playerId of Object.keys(snapshots)){
            let snap = snapshots[playerId];
            await PlayerStateReset.restorePlayerStats(dataServer, snap.stats);
            if(!snap.state){
                continue;
            }
            await dataServer.getEntity('playersState').updateById(snap.state.id, {
                room_id: PlayerStateReset.SAFE_ROOM_ID,
                x: PlayerStateReset.SAFE_X,
                y: PlayerStateReset.SAFE_Y,
                dir: PlayerStateReset.SAFE_DIR
            });
        }
        Logger.info('[player-state-reset] Players restored: '+Object.keys(snapshots).length);
    }

    static registerResetEndpoint(serverManager, snapshots)
    {
        serverManager.app.post('/api/e2e/reset-players', async (req, res) => {
            try {
                await PlayerStateReset.restoreSnapshots(serverManager.dataServer, snapshots);
                res.json({ ok: true });
            } catch(error){
                Logger.error('[player-state-reset] Reset failed: '+error.message);
                res.status(500).json({ ok: false, error: error.message });
            }
        });
        Logger.info('[player-state-reset] Reset endpoint registered.');
    }
}

module.exports.PlayerStateReset = PlayerStateReset;
