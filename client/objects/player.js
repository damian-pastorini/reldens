const CHAT = 'chat';
const KEY_PRESS = 'keyPress';
const STOP = 'stop';
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
        this.socket = {};
        this.playerId = '';
        this.players = {};
    }

    create()
    {
        // console.log('player creation: ', this.playerId);
        this.addPlayer(this.playerId, this.position.x, this.position.y, this.position.direction);
        this.scene.cameras.main.fadeFrom(FADE_DURATION);
        this.scene.scene.setVisible(true, this.room);
        this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.startFollow(this.players[this.playerId], true);
        this.players[this.playerId].setCollideWorldBounds(true);
        // this.registerChat();
    }

    addPlayer(id, x, y, direction)
    {
        this.players[id] = this.scene.physics.add.sprite(x, y, IMAGE_PLAYER);
        this.players[id].anims.play(direction);
        this.players[id].anims.stop();
    }

    left(send = true)
    {
        this.players[this.playerId].body.velocity.x = -SPEED;
        this.players[this.playerId].anims.play(LEFT, true);
        if(send) {
            this.socket.send({act: KEY_PRESS, dir: LEFT, x: this.players[this.playerId].x, y: this.players[this.playerId].y});
        }

    }

    right(send = true)
    {
        this.players[this.playerId].body.velocity.x = SPEED;
        this.players[this.playerId].anims.play(RIGHT, true);
        if(send) {
            this.socket.send({act: KEY_PRESS, dir: RIGHT, x: this.players[this.playerId].x, y: this.players[this.playerId].y});
        }
    }

    up(send = true)
    {
        this.players[this.playerId].body.velocity.y = -SPEED;
        this.players[this.playerId].anims.play(UP, true);
        if(send) {
            this.socket.send({act: KEY_PRESS, dir: UP, x: this.players[this.playerId].x, y: this.players[this.playerId].y});
        }
    }

    down(send = true)
    {
        this.players[this.playerId].body.velocity.y = SPEED;
        this.players[this.playerId].anims.play(DOWN, true);
        if(send) {
            this.socket.send({act: KEY_PRESS, dir: DOWN, x: this.players[this.playerId].x, y: this.players[this.playerId].y});
        }
    }

    stop(send = true)
    {
        this.players[this.playerId].body.velocity.x = 0;
        this.players[this.playerId].body.velocity.y = 0;
        this.players[this.playerId].anims.stop();
        if(send) {
            this.socket.send({act: STOP, x: this.players[this.playerId].x, y: this.players[this.playerId].y });
        }
    }

    registerChat()
    {
        let chat = document.getElementById(CHAT);
        let messages = document.getElementById('messages');
        chat.onsubmit = (e) => {
            e.preventDefault();
            let message = document.getElementById('message');
            // this.socket.send(CHAT, message.value);
            message.value = '';
        };
        /*this.socket.on(CHAT, (name, message) => {
            messages.innerHTML += `${name}: ${message}<br>`;
            messages.scrollTo(0, messages.scrollHeight);
        });*/
    }

}

module.exports = Player;
