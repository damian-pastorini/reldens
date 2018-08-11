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

var uniqid = require('uniqid');

io.sockets.on('connection', function(socket){
    socket.id = uniqid();
    SOCKET_LIST[socket.id] = socket;
    socket.on('disconnect', function(){
        delete SOCKET_LIST[socket.id];
    });
    socket.on('signIn', function(data){
		console.log(data);
    });
});
