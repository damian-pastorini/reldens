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
            let currentScene = phaserGame.scene.getScene('Town');
            let currentPlayer = new PhaserPlayer(currentScene, 'Town', { x: 225, y: 280, direction: 'down' });
            currentPlayer.socket = room;
            currentPlayer.playerId = room.sessionId;
            currentPlayer.create();
            currentScene.player = currentPlayer;
            room.onError.add(function(data){
                alert('Connection error!');
                window.location.reload();
            });
        });
        if(room){
            // listen to patches coming from the server
            room.listen('players/:id', function(change){
                let currentScene = phaserGame.scene.getScene('Town');
                if (change.operation === 'add'){
                    if(change.path.id != room.sessionId) {
                        // console.log('PLAYER CREATED!', change.path.id, '!=', room.sessionId);
                        currentScene.player.addPlayer(change.path.id, 225, 280, 'down');
                        currentScene.player.players[change.path.id].anims.stop();
                    }
                }
                if (change.operation === 'remove'){
                    if(change.path.id == room.sessionId) {
                        alert('Your session expired! Please login again');
                        window.location.reload();
                    } else {
                        currentScene.player.players[change.path.id].destroy();
                        delete currentScene.player.players[change.path.id];
                    }
                    // console.log('PLAYER REMOVED!', change.path.id);
                }
            });
            room.listen('players/:id/:axis', function(change){
                // console.log('AXIS: ', change);
                if(change.path.id != room.sessionId){
                    let currentScene = phaserGame.scene.getScene('Town'); // temporal hardcoded scene - each room will be an scene.
                    let playerToMove = currentScene.player.players[change.path.id];
                    if(change.path.axis == 'x'){
                        if(change.value < playerToMove.x){
                            // console.log('go right (direction left): ', change.path.id);
                            playerToMove.anims.play('left', true);
                            playerToMove.x = change.value;
                        } else {
                            // console.log('go left (direction right): ', change.path.id);
                            playerToMove.anims.play('right', true);
                            playerToMove.x = change.value;
                        }
                    }
                    if(change.path.axis == 'y'){
                        if(change.value < playerToMove.y){
                            // console.log('go up: ', change.path.id);
                            playerToMove.anims.play('up', true);
                            playerToMove.y = change.value;
                        } else {
                            // console.log('go down: ', change.path.id);
                            playerToMove.anims.play('down', true);
                            playerToMove.y = change.value;
                        }
                    }
                }
            });
            room.listen('players/:id/:attribute', function(change){
                if(change.path.id != room.sessionId && change.operation == 'replace' && change.path.attribute == 'mov'){
                    let currentScene = phaserGame.scene.getScene('Town');
                    currentScene.player.players[change.path.id].anims.stop();
                }
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
