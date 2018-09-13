const Phaser = require('phaser');
const Game = Phaser.Game;
var PhaserPlayer = require('./objects/player');
const Init = require('./scenes/Init');
const Town = require('./scenes/Town');
const House1 = require('./scenes/House-1');
const House2 = require('./scenes/House-2');

window.$ = require('jquery');
window.Colyseus = require('colyseus.js');
window.validate = require('jquery-validation');
var phaserGame = '';

$(document).ready(function($){

    var room = '';
    var players = {};
    var colors = ['red', 'green', 'yellow', 'blue', 'cyan', 'magenta'];
    var $register = $('#register_form');
    var $login = $('#login_form');
    var host = window.document.location.host.replace(/:.*/, '');
    var client = new Colyseus.Client(location.protocol.replace('http', 'ws')+host+(location.port ? ':'+location.port : ''));
    var userData = '';

    function joinRoom(submitedForm, isNewUser=false){
        if(!$(submitedForm).valid()){
            return false;
        }
        userData = {};
        if(isNewUser){
            userData.isNewUser = true;
            userData.username = $('#reg_username').val();
            userData.password = $('#reg_password').val();
            userData.email = $('#reg_email').val();
        } else {
            userData.username = $('#username').val();
            userData.password = $('#password').val();
        }
        room = client.join('game_room', userData);
        var $errorBlock = $(submitedForm).find('.response-error');
        $(submitedForm).find('input').on('focus', function(){
            $errorBlock.hide();
        });
        if(isNewUser) {
            room.onError.add(function(data){
                $errorBlock.html('Registration error, please try again.');
                $errorBlock.show();
            });
        } else {
            room.onError.add(function(data){
                $errorBlock.html('Login error please try again.');
                $errorBlock.show();
            });
        }
        room.onJoin.add(function(){
            $('.forms-container').detach();
            $('.game-container').show();
            window.ColyseusRoom = room;
            phaserGame.scene.start('Town');
            // listen to patches coming from the server
            /*
            room.listen('players/:id', function(change){
                console.log('room listen:', change.operation, change);
                if (change.operation === 'add'){
                    var currentScene = phaserGame.scene.getScene('Town'); // temporal hardcoded scene - each room will be an scene.
                    // console.log('Town > players :)', currentScene.player.players);
                    let newPhaserPlayer = new PhaserPlayer(currentScene, 'Town', { x: 225, y: 280, direction: 'down' });
                    currentScene.player = newPhaserPlayer;
                    newPhaserPlayer.socket = room;
                    newPhaserPlayer.playerId = change.path.id;
                    newPhaserPlayer.create();
                    // currentScene.player.players[change.path.id] = newPhaserPlayer;
                    // currentScene.player.addPlayer(change.path.id, change.path.x, change.path.y, change.path.direction);
                    // players[change.path.id] = change.path.id;
                } else if (change.operation === 'remove'){
                    // document.body.removeChild(players[change.path.id]);
                    // delete players[change.path.id];
                }
            });
            */
            /*
            room.listen('players/:id/:axis', function(change){
                var currentScene = phaserGame.scene.getScene('Town'); // temporal hardcoded scene - each room will be an scene.
                console.log('Town > players :)', currentScene.player.players);
                console.log('player axis:', change);
                let direction = '';
                console.log('currentScene.player.players[change.path.id].x:', currentScene.player.players[change.path.id].x);
                console.log('currentScene.player.players[change.path.id].y:', currentScene.player.players[change.path.id].y);
                console.log('dir:', change.path.axis, ' > val:', change.value);
                if(change.path.axis == 'x') {
                    if(currentScene.player.players[change.path.id].x > change.value) {
                        direction = 'left';
                        currentScene.player.left();
                    } else {
                        direction = 'right';
                        currentScene.player.right();
                    }
                    // currentScene.player.players[change.path.id].x = change.value;
                }
                if(change.path.axis == 'y') {
                    if(currentScene.player.players[change.path.id].y > change.value) {
                        direction = 'up';
                        currentScene.player.up();
                    } else {
                        direction = 'down';
                        currentScene.player.down();
                    }
                    // currentScene.player.players[change.path.id].y = change.value;
                }
                // currentScene.player.players[change.path.id].anims.play(direction, true);
                // this.players[data.id].anims.stop();
                // var dom = players[change.path.id];
                // var styleAttribute = (change.path.axis === 'x') ? 'left' : 'top';
                // dom.style[styleAttribute] = change.value+'px';
            });
            */
        });

        if(room){
            function up(){
                room.send({y: -1});
            }
            function right(){
                room.send({x: 1});
            }
            function down(){
                room.send({y: 1});
            }
            function left(){
                room.send({x: -1});
            }
            // listen to patches coming from the server
            room.listen('players/:id', function(change){
                if (change.operation === 'add'){
                    console.log('PLAYER CREATED!', change.path.id);
                    let dom = document.createElement('div');
                    dom.className = 'player';
                    dom.style.left = change.value.x + 'px';
                    dom.style.top = change.value.y + 'px';
                    dom.style.background = colors[Math.floor(Math.random() * colors.length)];
                    dom.id = change.path.id;
                    dom.innerHTML = 'Player '+change.path.id;
                    document.body.appendChild(dom);
                    let currentScene = phaserGame.scene.getScene('Town');
                    players[change.path.id] = new PhaserPlayer(currentScene, 'Town', { x: 225, y: 280, direction: 'down' });
                    players[change.path.id].socket = room;
                    players[change.path.id].playerId = change.path.id;
                    players[change.path.id].create();
                    players[change.path.id].element = dom;
                    players[change.path.id].stop();
                    currentScene.player = players[change.path.id];
                }
                if (change.operation === 'remove'){
                    console.log('PLAYER REMOVED!', change.path.id);
                    document.body.removeChild(change.path.id);
                    players[change.path.id].destroy();
                    delete players[change.path.id];
                } else {
                    console.log('PLAYER OTHERS!', change);
                }
            });
            room.listen('players/:id/:axis', function(change){
                console.log('AXIS: ', change);
                var dom = $('#'+change.path.id);
                var styleAttribute = (change.path.axis === 'x') ? 'left' : 'top';
                dom.css(styleAttribute, change.value+'px');
                console.log(change.path.id, '==', room.sessionId);
                if(change.path.id != room.sessionId){
                    if(change.path.axis == 'x') {
                        if(change.value < players[change.path.id].x){
                            console.log('go right: ', change.path.id);
                            players[change.path.id].right(false);
                        } else {
                            players[change.path.id].left(false);
                            console.log('go left: ', change.path.id);
                        }
                    }
                    if(change.path.axis == 'y') {
                        if(change.value < players[change.path.id].y){
                            players[change.path.id].up(false);
                            console.log('go up: ', change.path.id);
                        } else {
                            players[change.path.id].down(false);
                            console.log('go down: ', change.path.id);
                        }
                    }
                    if(change.path.axis == 'mov') {
                        console.log('don not move: ', change.path.id);
                        changePlayer.stop(false);
                    }
                }
            });

            $('#up').on('click', function(){
                up();
            });
            $('#right').on('click', function(){
                right();
            });
            $('#down').on('click', function(){
                down();
            });
            $('#left').on('click', function(){
                left();
            });
        }

    }

    // on room join init phaser client:
    var config = {
        type: Phaser.AUTO,
        parent: 'questworld-epic-adventure',
        width: 500,
        height: 500,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: true,
            },
        },
        scene: [Init, Town, House1, House2],
    };

    phaserGame = new Game(config);
    window.phaserGame = phaserGame;
    window.phaserConfig = config;

    if($register.length){
        $register.on('submit', function(e){
            e.preventDefault();
            joinRoom(this, true);
        });
        $register.validate({
            rules: {
                reg_re_password: {
                    equalTo: '#reg_password'
                }
            }
        });
    }

    if($login.length){
        $login.on('submit', function(e){
            e.preventDefault();
            joinRoom(this);
        });
        $login.validate();
    }

    if($('#logout').length){
        $('#logout').on('click', function(){
            window.location.reload(true);
        });
    }

});
