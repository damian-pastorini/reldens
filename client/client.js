// game-client:
const Phaser = require('phaser');
const SceneInit = require('./objects/scene-init');
const RoomListener = require('./objects/room-events');
const share = require('../shared/constants');
const gameConfig = require('../shared/game-config');

window.$ = require('jquery');
window.validate = require('jquery-validation');
window.Colyseus = require('colyseus.js');
window.host = window.document.location.host.replace(/:.*/, '');
window.gameClient = new Colyseus.Client(location.protocol.replace('http', 'ws')+host+(location.port ? ':'+location.port : ''));

$(document).ready(function($){

    let gameRoom,
        activeRoom = '',
        $register = $('#register_form'),
        $login = $('#login_form'),
        $logout = $('#logout'),
        userData;

    function joinRoom(submitedForm, isNewUser = false){
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
            let newRoom = new RoomListener(message.player.scene);
            let newColyseusRoom = newRoom.join(gameClient);
            // as soon we join the room we set it in the Phaser client:
            phaserGame.colyseusRoom = newColyseusRoom;
            newColyseusRoom.onJoin.add(() => {
                // leave old room:
                previousRoom.leave();
                // start listen to room events:
                newRoom.startListen(newColyseusRoom, message.prev);
            });
        };
        // join room:
        gameRoom = gameClient.join(share.ROOM_GAME, userData);
        let $errorBlock = $(submitedForm).find('.response-error');
        $(submitedForm).find('input').on('focus', () => {
            $errorBlock.hide();
        });
        // errors:
        if(isNewUser){
            gameRoom.onError.add((data) => {
                $errorBlock.html('Registration error, please try again.');
                $errorBlock.show();
            });
        } else {
            if(userData){
                gameRoom.onError.add((data) => {
                    $errorBlock.html('Login error please try again.');
                    $errorBlock.show();
                });
            } else {
                gameRoom.onError.add((data) => {
                    alert('There was a connection error.');
                    window.location.reload();
                });
            }
        }
        // on join activate game:
        gameRoom.onJoin.add(() => {
            $('.forms-container').detach();
            $('.game-container').show();
            gameRoom.onError.add((data) => {
                alert('Connection error!');
                window.location.reload();
            });
            gameClient.userData.isNewUser = false;
        });
        gameRoom.onMessage.add((message) => {
            if(message.act === share.START_GAME && message.sessionId === gameRoom.sessionId){
                activeRoom = new RoomListener(message.player.scene);
                let colyseusRoom = activeRoom.join(gameClient);
                colyseusRoom.onJoin.add(() => {
                    gameRoom.leave();
                    activeRoom.startListen(colyseusRoom);
                });
            }
        });
    }

    // on game-room join init phaser client:
    let config = gameConfig;
    config.type = Phaser.AUTO;
    config.parent = 'dwd-game';
    config.scene = [SceneInit];

    // initialize game:
    window.phaserGame = new Phaser.Game(config);

    if($register.length){
        $register.on('submit', (e) => {
            e.preventDefault();
            joinRoom($register, true);
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
        $login.on('submit', (e) => {
            e.preventDefault();
            joinRoom($login);
        });
        $login.validate();
    }

    if($logout.length){
        $logout.on('click', () => {
            window.location.reload(true);
        });
    }

});
