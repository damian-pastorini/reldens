const NEW_PLAYER = 'newPlayer';
const ALL_PLAYERS = 'allPlayers';
const CHAT = 'chat';
const KEY_PRESS = 'keyPress';
const MOVE = 'move';
const STOP = 'stop';
const REMOVE = 'remove';
const UP = 'up';
const LEFT = 'left';
const DOWN = 'down';
const RIGHT = 'right';

const IMAGE_PLAYER = 'player';
const SPEED = 200;
const FADE_DURATION = 1000;

class Player
{

    constructor(scene, room, position)
    {
        this.scene = scene;
        this.room = room;
        this.position = position;
        this.socket = window.ColyseusRoom;
        this.playerId = window.ColyseusRoom.sessionId;
        this.players = {};
    }

    create()
    {
        // this.socket.emit(NEW_PLAYER, this.room, this.position);
        // this.socket.on(NEW_PLAYER, (data) => {
        this.addPlayer(this.playerId, 225, 280, 'down');
        this.scene.cameras.main.fadeFrom(FADE_DURATION);
        this.scene.scene.setVisible(true, this.room);
        /*for (let i = 0; i < this.players.length; i++) {
            this.addPlayer(this.players[i].id, this.players[i].x, this.players[i].y, this.players[i].direction);
        }*/
        this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.startFollow(this.players[this.playerId], true);
        this.players[this.playerId].setCollideWorldBounds(true);
        // });
        /* this.socket.on(ALL_PLAYERS, (data) => {
            this.scene.cameras.main.fadeFrom(FADE_DURATION);
            this.scene.scene.setVisible(true, this.room);
            for (let i = 0; i < data.length; i++) {
                this.addPlayer(data[i].id, data[i].x, data[i].y, data[i].direction);
            }
            this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
            this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
            this.scene.cameras.main.startFollow(this.players[this.playerId], true);
            this.players[this.playerId].setCollideWorldBounds(true);
            this.socket.on(MOVE, (data) => {
                this.players[data.id].x = data.x;
                this.players[data.id].y = data.y;
                this.players[data.id].anims.play(data.direction, true);
            });
            this.socket.on(STOP, (data) => {
                this.players[data.id].x = data.x;
                this.players[data.id].y = data.y;
                this.players[data.id].anims.stop();
            });
            this.socket.on(REMOVE, (id) => {
                this.players[id].destroy();
                delete this.players[id];
            });
            this.registerChat();
        }); */
    }

    addPlayer(id, x, y, direction)
    {
        this.players[id] = this.scene.physics.add.sprite(x, y, IMAGE_PLAYER);
        this.players[id].anims.play(direction);
        this.players[id].anims.stop();
    }

    left()
    {
        this.players[this.playerId].body.velocity.x = -SPEED;
        this.players[this.playerId].anims.play(LEFT, true);
        this.socket.send(KEY_PRESS, LEFT, { x: this.players[this.playerId].x, y: this.players[this.playerId].y });
    }

    right()
    {
        this.players[this.playerId].body.velocity.x = SPEED;
        this.players[this.playerId].anims.play(RIGHT, true);
        this.socket.send(KEY_PRESS, RIGHT, { x: this.players[this.playerId].x, y: this.players[this.playerId].y });
    }

    up()
    {
        this.players[this.playerId].body.velocity.y = -SPEED;
        this.players[this.playerId].anims.play(UP, true);
        this.socket.send(KEY_PRESS, UP, { x: this.players[this.playerId].x, y: this.players[this.playerId].y });
    }

    down()
    {
        this.players[this.playerId].body.velocity.y = SPEED;
        this.players[this.playerId].anims.play(DOWN, true);
        this.socket.send(KEY_PRESS, DOWN, { x: this.players[this.playerId].x, y: this.players[this.playerId].y });
    }

    stop()
    {
        this.players[this.playerId].body.velocity.x = 0;
        this.players[this.playerId].body.velocity.y = 0;
        this.players[this.playerId].anims.stop();
        this.socket.send(STOP, { x: this.players[this.playerId].x, y: this.players[this.playerId].y });
    }

    registerChat()
    {
        let chat = document.getElementById(CHAT);
        let messages = document.getElementById('messages');
        chat.onsubmit = (e) => {
            e.preventDefault();
            let message = document.getElementById('message');

            this.socket.send(CHAT, message.value);
            message.value = '';
        };
        /*this.socket.on(CHAT, (name, message) => {
            messages.innerHTML += `${name}: ${message}<br>`;
            messages.scrollTo(0, messages.scrollHeight);
        });*/
    }

}

module.exports = Player;
