class Link
{

    constructor()
    {
        this.mysql = false;
        this.link = false;
    }

    getConnection()
    {
        if(!this.link){
            if(this.mysql){
                this.link = this.mysql.createConnection({
                    host: "localhost",
                    user: "root", // root
                    password: "admin22", // admin22
                    database: 'questworld'
                });
            } else {
                // error.
            }
        }
        return this.link;
    }

    connect()
    {
        var con = this.getConnection();
        return con.connect(function(err){
            if(err){
                throw err;
            }
        });
    }

    select(sql, callback, originalParams)
    {
        var con = this.getConnection();
        con.query(sql, function(err, result){
            if(err){
                throw err;
            }
            callback(err, result, originalParams);
        });
    }

    insert(table, values, callback, originalParams)
    {
        var con = this.getConnection();
        con.query('INSERT INTO '+table+' VALUES('+values+')', function(err, result) {
            if(err){
                throw err;
            }
            callback(result, originalParams);
        });
    }

}

exports.link = Link;