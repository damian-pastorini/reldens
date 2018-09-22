// game-client:
const Phaser = require('phaser');
const PhaserPlayer = require('./objects/player');
const Init = require('./scenes/Init');
const Town = require('./scenes/Town');
const House1 = require('./scenes/House-1');
const House2 = require('./scenes/House-2');
var share = require('../shared/constants');
var phaserGame = '';

window.$ = require('jquery');
window.Colyseus = require('colyseus.js');
window.validate = require('jquery-validation');

$(document).ready(function($){

    var room = '';
    var $register = $('#register_form');
    var $login = $('#login_form');
    var host = window.document.location.host.replace(/:.*/, '');
    var client = new Colyseus.Client(location.protocol.replace('http', 'ws')+host+(location.port ? ':'+location.port : ''));
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
        // join room:
        room = client.join('game_room', userData);
        var $errorBlock = $(submitedForm).find('.response-error');
        $(submitedForm).find('input').on('focus', function(){
            $errorBlock.hide();
        });
        // errors:
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
        // on join activate game:
        room.onJoin.add(function(){
            $('.forms-container').detach();
            $('.game-container').show();
            phaserGame.scene.start(share.TOWN);
            phaserGame.colyseusRoom = room;
            // @NOTE: 'Town' is hardcoded below since it's the initial scene for every player.
            // @TODO: if we save the user state in the DB then we can replace Town by the last user scene.
            let currentScene = phaserGame.scene.getScene('Town');
            let currentPlayer = new PhaserPlayer(currentScene, 'Town', {x: 225, y: 280, direction: 'down'});
            currentPlayer.socket = room;
            currentPlayer.playerId = room.sessionId;
            currentPlayer.create();
            currentScene.player = currentPlayer;
            room.onError.add(function(data){
                alert('Connection error!');
                window.location.reload();
            });
        });
        // listen to patches coming from the server
        room.listen('players/:id', function(change){
            // player creation after login:
            if (change.operation === 'add'){
                if(change.path.id != room.sessionId){
                    // @TODO: change position based on the current scene.
                    // let currentScene = phaserGame.scene.getScene('Town');
                    let currentScene = getActiveScene();
                    currentScene.player.addPlayer(change.path.id, 225, 280, share.DOWN);
                }
            }
            // remove player on disconnect or logout:
            if (change.operation === 'remove'){
                if(change.path.id == room.sessionId){
                    alert('Your session expired! Please login again');
                    window.location.reload();
                } else {
                    let currentScene = getActiveScene();
                    if(currentScene.player.players.hasOwnProperty(change.path.id)){
                        currentScene.player.players[change.path.id].destroy();
                        delete currentScene.player.players[change.path.id];
                    }
                }
            }
        });
        // move other clients:
        room.listen('players/:id/:axis', function(change){
            if(change.path.id != room.sessionId){
                let currentScene = getActiveScene();
                if(currentScene.player.players.hasOwnProperty(change.path.id)){
                    let playerToMove = currentScene.player.players[change.path.id];
                    if(change.path.axis == 'x'){
                        if(change.value < playerToMove.x){
                            playerToMove.anims.play(share.LEFT, true);
                            playerToMove.x = change.value;
                        } else {
                            playerToMove.anims.play(share.RIGHT, true);
                            playerToMove.x = change.value;
                        }
                    }
                    if(change.path.axis == 'y'){
                        if(change.value < playerToMove.y){
                            playerToMove.anims.play(share.UP, true);
                            playerToMove.y = change.value;
                        } else {
                            playerToMove.anims.play(share.DOWN, true);
                            playerToMove.y = change.value;
                        }
                    }
                }
            }
        });
        // stop movement:
        room.listen('players/:id/:attribute', function(change){
            // player stop action:
            if(change.path.id != room.sessionId && change.operation == 'replace' && change.path.attribute == 'mov'){
                let currentScene = getActiveScene();
                if(currentScene.player.players.hasOwnProperty(change.path.id)){
                    currentScene.player.players[change.path.id].anims.stop();
                }
            }
            // player change direction action:
            if(change.path.id != room.sessionId && change.path.attribute == 'dir'){
                let currentScene = getActiveScene();
                if(currentScene.player.players.hasOwnProperty(change.path.id)){
                    currentScene.player.players[change.path.id].anims.stop();
                }
            }
        });
        room.onMessage.add(function(message){
            if(message.act == share.CHANGE_SCENE){
                let currentScene = getActiveScene();
                // if other users move to a different scene from the current one we need to remove them:
                if(message.scene != currentScene.key && currentScene.player.players.hasOwnProperty(message.id) && currentScene.player.playerId != message.id){
                    currentScene.player.players[message.id].destroy();
                    delete currentScene.player.players[message.id];
                }
                // if other users enter in the current scene we need to add them:
                if(message.scene == currentScene.key && currentScene.player.playerId != message.id){
                    // @TODO: this will be coming from a single method in each scene.
                    let pos = {};
                    if(currentScene.key == share.TOWN){
                        pos = currentScene.getPosition(message.prev);
                    }
                    if(currentScene.key == share.HOUSE_1){
                        pos = {x: 240, y: 365, direction: share.UP};
                    }
                    if(currentScene.key == share.HOUSE_2){
                        pos = {x: 240, y: 397, direction: share.UP};
                    }
                    currentScene.player.addPlayer(message.id, pos.x, pos.y, pos.direction);
                }
                // if current user change scene we need to get the other users from that scene:
                if(currentScene.player.playerId == message.id){
                    room.send({act: share.GET_PLAYERS, next: message.scene});
                }
            }
            // the get-players will send the request to the server to get the other players in the current scene:
            if(message.act == share.ADD_FROM_SCENE){
                let currentScene = phaserGame.scene.getScene(message.scene);
                for(let i in message.p){
                    let toAdd = message.p[i];
                    if(toAdd.id != currentScene.player.playerId){
                        currentScene.player.addPlayer(toAdd.id, toAdd.x, toAdd.y, toAdd.dir);
                    }
                }
            }
        });
    }

    // on room join init phaser client:
    var config = {
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
        scene: [Init, Town, House1, House2],
    };

    // initialize game:
    phaserGame = new Phaser.Game(config);
    window.phaserGame = phaserGame;

    function getActiveScene()
    {
        // default scene:
        let currentScene = share.TOWN;
        if(phaserGame.currentScene){
            currentScene = phaserGame.currentScene;
        }
        return phaserGame.scene.getScene(currentScene);
    }

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
