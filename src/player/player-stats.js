const DataLink = require('../driver/datalink');

class PlayerStats
{

    constructor(userId)
    {
        this.userId = userId;
    }

    loadSavedStats()
    {
        let queryString = `SELECT * FROM users_stats WHERE user_id = ${this.userId}`;
        return DataLink.query(queryString);
    }

    saveStats(playerId, statsData = false)
    {
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
