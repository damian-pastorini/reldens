const DataLink = require('./datalink');

class PlayerStats
{

    constructor(userId)
    {
        this.userId = userId;
    }

    loadSavedStats()
    {
        let queryString = `SELECT * FROM users_stats WHERE user_id = ${this.userId}`;
        return new Promise((resolve, reject) => {
            DataLink.connection.query(queryString, {}, (err, rows) => {
                if(err){
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    setData(data)
    {
        // @TODO: the stats will be part of the configuration in the database.
        this.hp = data.hp;
        this.mp = data.mp;
        this.stamina = data.stamina;
        this.atk = data.atk;
        this.def = data.def;
        this.dodge = data.dodge;
        this.speed = data.speed;
    }

}

module.exports = PlayerStats;
