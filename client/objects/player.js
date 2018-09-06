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
        this.socket = io();
        this.players = {};
    }

    create() {
        this.socket.emit(NEW_PLAYER, this.room, this.position);

        this.socket.on(NEW_PLAYER, (data) => {
            this.addPlayer(data.id, data.x, data.y, data.direction);
        });

        this.socket.on(ALL_PLAYERS, (data) => {
            this.scene.cameras.main.fadeFrom(FADE_DURATION);
            this.scene.scene.setVisible(true, this.room);

            for (let i = 0; i < data.length; i++) {
                this.addPlayer(data[i].id, data[i].x, data[i].y, data[i].direction);
            }

            this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
            this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
            this.scene.cameras.main.startFollow(this.players[this.socket.id], true);
            this.players[this.socket.id].setCollideWorldBounds(true);

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
        });
    }

    addPlayer(id, x, y, direction) {
        this.players[id] = this.scene.physics.add.sprite(x, y, IMAGE_PLAYER);
        this.players[id].anims.play(direction);
        this.players[id].anims.stop();
    }

    left() {
        this.players[this.socket.id].body.velocity.x = -SPEED;
        this.players[this.socket.id].anims.play(LEFT, true);
        this.socket.emit(KEY_PRESS, LEFT, { x: this.players[this.socket.id].x, y: this.players[this.socket.id].y });
    }

    right() {
        this.players[this.socket.id].body.velocity.x = SPEED;
        this.players[this.socket.id].anims.play(RIGHT, true);
        this.socket.emit(KEY_PRESS, RIGHT, { x: this.players[this.socket.id].x, y: this.players[this.socket.id].y });
    }

    up() {
        this.players[this.socket.id].body.velocity.y = -SPEED;
        this.players[this.socket.id].anims.play(UP, true);
        this.socket.emit(KEY_PRESS, UP, { x: this.players[this.socket.id].x, y: this.players[this.socket.id].y });
    }

    down() {
        this.players[this.socket.id].body.velocity.y = SPEED;
        this.players[this.socket.id].anims.play(DOWN, true);
        this.socket.emit(KEY_PRESS, DOWN, { x: this.players[this.socket.id].x, y: this.players[this.socket.id].y });
    }

    stop() {
        this.players[this.socket.id].body.velocity.x = 0;
        this.players[this.socket.id].body.velocity.y = 0;
        this.players[this.socket.id].anims.stop();
        this.socket.emit(STOP, { x: this.players[this.socket.id].x, y: this.players[this.socket.id].y });
    }

    registerChat() {
        let chat = document.getElementById(CHAT);
        let messages = document.getElementById('messages');

        chat.onsubmit = (e) => {
            e.preventDefault();
            let message = document.getElementById('message');

            this.socket.emit(CHAT, message.value);
            message.value = '';
        };

        this.socket.on(CHAT, (name, message) => {
            messages.innerHTML += `${name}: ${message}<br>`;
            messages.scrollTo(0, messages.scrollHeight);
        });
    }
}

module.export = Player;
