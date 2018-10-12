// game-client:
const Phaser = require('phaser');
const Init = require('./scenes/Init');
const Town = require('./scenes/Town');
const House1 = require('./scenes/House-1');
const House2 = require('./scenes/House-2');
const RoomListener = require('./objects/room-events');
const share = require('../shared/constants');

window.$ = require('jquery');
window.validate = require('jquery-validation');
window.Colyseus = require('colyseus.js');
window.host = window.document.location.host.replace(/:.*/, '');
window.gameClient = new Colyseus.Client(location.protocol.replace('http', 'ws')+host+(location.port ? ':'+location.port : ''));

$(document).ready(function($){

    var gameRoom = '';
    var activeRoom = '';
    var $register = $('#register_form');
    var $login = $('#login_form');
    var userData = '';

    function joinRoom(submitedForm, isNewUser=false){
        // validate form:
        if(!$(submitedForm).valid()){
            return false;
        }
        // login or register:
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
        // save username and password in client for later use:
        gameClient.userData = userData;
        gameClient.reconnectColyseus = function(message, previousRoom){
            // console.log('reconnectColyseus', message, previousRoom);
            var newRoom = new RoomListener(message.player.scene);
            var newColyseusRoom = newRoom.join(gameClient);
            newColyseusRoom.onJoin.add(function(){
                // as soon we join the room we set it in the Phaser client:
                // @TODO: see startPhaserScene in room-events.js line 165 in case of required refactor.
                phaserGame.colyseusRoom = newRoom;
                // joined new one:
                newRoom.startListen(newColyseusRoom, message.prev);
                // phaserGame.scene.start(newRoom.roomName);
                // newRoom.startPhaserScene(message, newColyseusRoom);
            });
            // leave old room:
            previousRoom.leave();
        };
        // join room:
        gameRoom = gameClient.join(share.ROOM_GAME, userData);
        var $errorBlock = $(submitedForm).find('.response-error');
        $(submitedForm).find('input').on('focus', function(){
            $errorBlock.hide();
        });
        // errors:
        if(isNewUser) {
            gameRoom.onError.add(function(data){
                $errorBlock.html('Registration error, please try again.');
                $errorBlock.show();
            });
        } else {
            if(userData){
                gameRoom.onError.add(function(data){
                    $errorBlock.html('Login error please try again.');
                    $errorBlock.show();
                });
            } else {
                gameRoom.onError.add(function(data){
                    alert('There was a connection error.');
                    window.location.reload();
                });
            }
        }
        // on join activate game:
        gameRoom.onJoin.add(function(){
            $('.forms-container').detach();
            $('.game-container').show();
            gameRoom.onError.add(function(data){
                alert('Connection error!');
                window.location.reload();
            });
            gameClient.userData.isNewUser = false;
        });
        gameRoom.onMessage.add(function(message){
            if(message.act == share.START_GAME && message.sessionId == gameRoom.sessionId){
                gameRoom.leave();
                activeRoom = new RoomListener(message.player.scene);
                var colyseusRoom = activeRoom.join(gameClient);
                colyseusRoom.onJoin.add(function(){
                    activeRoom.startListen(colyseusRoom);
                });
            }
        });
    }

    // on game-room join init phaser client:
    let config = {
        type: Phaser.AUTO,
        parent: 'dwd-game',
        width: 500,
        height: 500,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: true,
            },
        },
        // @TODO: this will be loaded dynamically when the client connects to the room-game.
        scene: [Init, Town, House1, House2],
    };

    // initialize game:
    window.phaserGame = new Phaser.Game(config);

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
