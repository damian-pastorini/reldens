const share = require('../../shared/constants');

class Player
{

    constructor(scene, room, position)
    {
        this.username = '';
        this.scene = scene;
        this.room = room;
        this.position = position;
        this.socket = {};
        this.playerId = '';
        this.players = {};
    }

    create()
    {
        this.addPlayer(this.playerId, this.position.x, this.position.y, this.position.direction);
        this.scene.cameras.main.fadeFrom(share.FADE_DURATION);
        this.scene.scene.setVisible(true, this.room);
        this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.startFollow(this.players[this.playerId], true);
        this.players[this.playerId].setCollideWorldBounds(true);
    }

    addPlayer(id, x, y, direction)
    {
        this.players[id] = this.scene.physics.add.sprite(x, y, share.IMAGE_PLAYER);
        this.players[id].anims.play(direction);
        this.players[id].anims.stop();
    }

    left(send = true)
    {
        this.players[this.playerId].body.velocity.x = -share.SPEED;
        this.players[this.playerId].anims.play(share.LEFT, true);
        if(send) {
            this.socket.send({act: share.KEY_PRESS, dir: share.LEFT, x: this.players[this.playerId].x, y: this.players[this.playerId].y});
        }

    }

    right(send = true)
    {
        this.players[this.playerId].body.velocity.x = share.SPEED;
        this.players[this.playerId].anims.play(share.RIGHT, true);
        if(send) {
            this.socket.send({act: share.KEY_PRESS, dir: share.RIGHT, x: this.players[this.playerId].x, y: this.players[this.playerId].y});
        }
    }

    up(send = true)
    {
        this.players[this.playerId].body.velocity.y = -share.SPEED;
        this.players[this.playerId].anims.play(share.UP, true);
        if(send) {
            this.socket.send({act: share.KEY_PRESS, dir: share.UP, x: this.players[this.playerId].x, y: this.players[this.playerId].y});
        }
    }

    down(send = true)
    {
        this.players[this.playerId].body.velocity.y = share.SPEED;
        this.players[this.playerId].anims.play(share.DOWN, true);
        if(send) {
            this.socket.send({act: share.KEY_PRESS, dir: share.DOWN, x: this.players[this.playerId].x, y: this.players[this.playerId].y});
        }
    }

    stop(send = true)
    {
        this.players[this.playerId].body.velocity.x = 0;
        this.players[this.playerId].body.velocity.y = 0;
        this.players[this.playerId].anims.stop();
        if(send) {
            this.socket.send({act: share.STOP, x: this.players[this.playerId].x, y: this.players[this.playerId].y });
        }
    }

    registerChat()
    {
        // @TODO: create the chat feature.
        let chat = document.getElementById(share.CHAT);
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
