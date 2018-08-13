// server configuration:
var express = require('express');
var app = express();
var serv = require('http').Server(app);
// client configuration:
app.get('/', function(req, res){
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
// server start:
serv.listen(process.env.PORT || 8080);
console.log('Server started.');

var SOCKET_LIST = {};
var io = require('socket.io')(serv, {});

// mysql:
var mysql = require('mysql');
// link module:
var db = require('./server/dblink.js').link;
db.mysql = mysql;
// test db:
db.connect();

// unique sessions ids:
var uniqid = require('uniqid');

// player:
var player = require('./server/player.js').player;
// configure db link in player object:
player.db = db;

// main server actions:
io.sockets.on('connection', function(socket){

    // set unique id:
    socket.id = uniqid();
    // save socket in list:
    SOCKET_LIST[socket.id] = socket;

    // disconnect:
    socket.on('disconnect', function(){
        delete SOCKET_LIST[socket.id];
    });

    // login:
    socket.on('login', function(data){
		var result = false;
        if(player.login(data)){
            socket.player = player;
            result = true;
        }
        socket.emit('loginResponse', {success: result});
    });

    // register:
    socket.on('register', function(data){
        var self = this;
        data.player = player;
        data.socket = self;
        data.db = db;
        player.register(data);
    });

});
