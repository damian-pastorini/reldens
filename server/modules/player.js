var link = require('./dblink');
// var Promise = require('bluebird');
// var getSqlConnection = require('./link');

class Player
{

    constructor()
    {
        this.id = '';
        this.roleId = 2;
        this.status = 1;
        this.state = 1;
        this.password = '123123';
        this.x = Math.floor(Math.random() * 400);
        this.y = Math.floor(Math.random() * 400);
    }

    register()
    {
        var currentPlayer = this;
        if(this.id === '') {
            // test query:
            let queryString = 'INSERT INTO users VALUES('
                +'NULL, '
                +'"'+this.newId+'@game.com", '
                +'"'+this.newId+'", '
                +'"'+this.password+'", '
                +'"'+this.roleId+'", '
                +'"'+this.status+'", '+
                '"'+this.state+'"'
            +')';
            console.log(queryString);
            link.query(queryString).then(rows => {
                console.log(rows);
                currentPlayer.row = rows;
                return link; // .close();
            }).catch(err => {
                console.log(err);
            });
            /*
            var currentPlayer = this;
            if(this.id === '') {
                Promise.using(getSqlConnection(), function(connection) {
                    let queryString = 'INSERT INTO users VALUES(NULL, "'+this.name+'", "'+this.email+'", "'+this.roleId+'", "'+this.status+'", "'+this.state+'")';
                    return connection.query(queryString).then(function(rows) {
                        currentPlayer.id = rows.id;
                        return console.log(rows);
                    }).catch(function(error) {
                        console.log(error);
                    });
                })
            }
            */
        }
    }

}

exports.player = Player;
