/**
 *
 * Reldens - Clan Seed
 *
 * Seeds a clan for the running parallel spec group before its players log in: the clan row with the initial clan level
 * (the lowest level key of the stored clan levels) and one membership row per given player id, and a stat modifier of
 * that initial level, all created for the group, so the group reset deletes them; and reads a stored player stat.
 *
 */

const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');

class ClanSeed
{

    static async fetchInitialLevel(gameConfig)
    {
        let clanLevels = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'clanLevels', {});
        return [...clanLevels].sort((levelA, levelB) => Number(levelA.key) - Number(levelB.key)).shift();
    }

    static async seedClanWithMembers(gameConfig, e2eGroup, ownerId, membersIds)
    {
        let clan = await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'clan', {
            name: 'E2eClan'+Date.now(),
            owner_id: ownerId,
            level: (await ClanSeed.fetchInitialLevel(gameConfig)).key
        });
        for(let playerId of membersIds){
            await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'clanMembers', {
                clan_id: clan.id,
                player_id: playerId
            });
        }
        return clan.id;
    }

    static async seedLevelModifier(gameConfig, e2eGroup, statKey, operation, value)
    {
        return await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'clanLevelsModifiers', {
            level_id: (await ClanSeed.fetchInitialLevel(gameConfig)).id,
            key: 'e2e_clan_'+statKey,
            property_key: 'stats/'+statKey,
            operation,
            value: String(value)
        });
    }

    static async fetchStoredStatValue(gameConfig, playerId, statKey)
    {
        return Number([...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'playersStats', {
            player_id: playerId,
            stat_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'stats', {key: statKey})
        })].shift().value);
    }

}

module.exports.ClanSeed = ClanSeed;
