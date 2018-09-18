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
            phaserGame.scene.start('Town');
            phaserGame.colyseusRoom = room;
            // @NOTE: 'Town' is hardcoded below since it's the initial scene for every player.
            // @RFA: if we save the user state in the DB then we can replace Town by the last user scene.
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
        if(room){
            // listen to patches coming from the server
            room.listen('players/:id', function(change){
                // player creation after login:
                if (change.operation === 'add'){
                    if(change.path.id != room.sessionId){
                        let currentScene = getActiveScene();
                        // let currentScene = phaserGame.scene.getScene('Town');
                        currentScene.player.addPlayer(change.path.id, 225, 280, 'down');
                    }
                }
                // remove player on disconnect or logout:
                if (change.operation === 'remove'){
                    if(change.path.id == room.sessionId){
                        alert('Your session expired! Please login again');
                        window.location.reload();
                    } else {
                        // @TODO: fix hardocoded 'Town' scene.
                        // let currentScene = phaserGame.scene.getScene('Town');
                        let currentScene = getActiveScene();
                        currentScene.player.players[change.path.id].destroy();
                        delete currentScene.player.players[change.path.id];
                    }
                }
            });
            room.listen('players/:id/:axis', function(change){
                if(change.path.id != room.sessionId){
                    // @TODO: fix hardocoded 'Town' scene.
                    // let currentScene = phaserGame.scene.getScene('Town');
                    let currentScene = getActiveScene();
                    if(currentScene.player.players.hasOwnProperty(change.path.id)){
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
                }
            });
            room.listen('players/:id/:attribute', function(change){
                // player stop action:
                if(change.path.id != room.sessionId && change.operation == 'replace' && change.path.attribute == 'mov'){
                    // @TODO: fix hardocoded 'Town' scene.
                    // let currentScene = phaserGame.scene.getScene('Town');
                    let currentScene = getActiveScene();
                    if(currentScene.player.players.hasOwnProperty(change.path.id)){
                        currentScene.player.players[change.path.id].anims.stop();
                    }
                }
                // player change direction action:
                if(change.path.id != room.sessionId && change.path.attribute == 'dir'){
                    // @TODO: fix hardocoded 'Town' scene.
                    // let currentScene = phaserGame.scene.getScene('Town');
                    let currentScene = getActiveScene();
                    if(currentScene.player.players.hasOwnProperty(change.path.id)){
                        currentScene.player.players[change.path.id].anims.stop();
                    }
                }
            });
            room.onMessage.add(function(message){
                // console.log('server message: ', message);
                // @TODO: fix scene change sync.
                if(message.act == 'change-scene'){
                    // @TODO: fix hardocoded 'Town' scene.
                    // let currentScene = phaserGame.scene.getScene('Town');
                    let currentScene = getActiveScene();
                    if(message.scene != 'Town' && currentScene.player.players.hasOwnProperty(message.id) && currentScene.player.playerId != message.id){
                        console.log('player removed: ', message.id);
                        currentScene.player.players[message.id].destroy();
                        delete currentScene.player.players[message.id];
                    }
                    if(message.scene == 'Town' && currentScene.player.playerId != message.id){
                        console.log('player entered in scene', message.id);
                        currentScene.player.addPlayer(message.id, 225, 280, 'down');
                    }
                    if(currentScene.player.playerId == message.id){
                        // @TODO: fix hardocoded 'Town' scene.
                        room.send({act: 'get-players', next: message.scene});
                    }
                }
                if(message.act == 'add-from-scene'){
                    console.log(message);
                    let currentScene = phaserGame.scene.getScene(message.scene);
                    for(let i in message.p){
                        // console.log('i: ', i, ' > currentScene.player.playerId: ', currentScene.player.playerId);
                        let toAdd = message.p[i];
                        if(toAdd.id != currentScene.player.playerId){
                            console.log('toadd: ', toAdd);
                            currentScene.player.addPlayer(toAdd.id, toAdd.x, toAdd.y, toAdd.dir);
                        }
                    }
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

    function getActiveScene()
    {
        var result = false;
        for(let i in phaserGame.scene.keys){
            scene = phaserGame.scene.keys[i];
            if(scene.key && phaserGame.scene.isActive(scene.key)){
                // console.log('scene: '+scene.key+' is active: '+phaserGame.scene.isActive(scene.key));
                result = scene;
            }
        }
        return result;
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
