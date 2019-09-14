// const DataLink = require('../storage/data-server');
const PlayersStatsModel = require('./players-stats-model');

class PlayerStats
{

    constructor(playerId)
    {
        this.playerId = playerId;
    }

    loadSavedStats()
    {
        /*
        let queryString = `SELECT * FROM users_stats WHERE user_id = ${this.playerId}`;
        return DataLink.query(queryString);
        */
        return PlayersStatsModel.query().where('player_id', this.playerId).first();
    }

    saveStats(playerId, statsData = false)
    {
        // @TODO: save stats.
        console.log('TODO - Save stats.');
        /*
        let statsDataString = '100, 100, 100, 100, 100, 100, 100';
        if(statsData) {
            statsDataString = `${statsData.hp}, 
            ${statsData.mp}, 
            ${statsData.stamina}, 
            ${statsData.atk}, 
            ${statsData.def}, 
            ${statsData.dodge}, 
            ${statsData.speed}`;
        }
        let queryString = `INSERT INTO users_stats VALUES(NULL, ?, ${statsDataString})`;
        return DataLink.query(queryString, playerId);
        */
    }

    setData(statsData)
    {
        // @TODO: the stats will be part of the configuration in the database.
        this.hp = statsData.hp;
        this.mp = statsData.mp;
        this.stamina = statsData.stamina;
        this.atk = statsData.atk;
        this.def = statsData.def;
        this.dodge = statsData.dodge;
        this.speed = statsData.speed;
    }

}

module.exports = PlayerStats;
