const share = require('../../shared/constants');

class Player
{

    constructor(scene, room, position)
    {
        this.username = '';
        this.scene = scene;
        this.room = room;
        this.position = position;
        this.dir = '';
        this.mov = false;
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
        if(send){
            this.socket.send({dir: share.LEFT});
        }
        this.players[this.playerId].anims.play(share.LEFT, true);
    }

    right(send = true)
    {
        if(send){
            this.socket.send({dir: share.RIGHT});
        }
        this.players[this.playerId].anims.play(share.RIGHT, true);
    }

    up(send = true)
    {
        if(send){
            this.socket.send({dir: share.UP});
        }
        this.players[this.playerId].anims.play(share.UP, true);
    }

    down(send = true)
    {
        if(send){
            this.socket.send({dir: share.DOWN});
        }
        this.players[this.playerId].anims.play(share.DOWN, true);
    }

    stop(send = true)
    {
        if(send){
            this.socket.send({act: share.STOP});
        }
        // @NOTE: we are not using Phaser velocity for now, position is coming from the server where the speed is controlled.
        // this.players[this.playerId].body.velocity.x = 0;
        // this.players[this.playerId].body.velocity.y = 0;
        this.players[this.playerId].anims.stop();
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
