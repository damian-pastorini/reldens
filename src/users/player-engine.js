/**
 *
 * Reldens - PlayerEngine
 *
 * PlayerEngine is the class that handle the player actions in the client side.
 *
 */

const share = require('../utils/constants');

class PlayerEngine
{

    constructor(scene, playerData, gameConfig, room)
    {
        this.scene = scene;
        this.config = gameConfig;
        this.username = playerData.username;
        this.roomName = playerData.state.scene;
        this.state = playerData.state;
        this.room = room;
        this.playerId = room.sessionId;
        this.players = {};
        this.mov = false;
    }

    create()
    {
        this.addPlayer(this.playerId, this.state);
        let fadeDuration = this.config.get('client/players/animations/fadeDuration') || share.FADE_DURATION;
        this.scene.cameras.main.fadeFrom(fadeDuration);
        this.scene.scene.setVisible(true, this.roomName);
        this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.startFollow(this.players[this.playerId], true);
        this.players[this.playerId].setCollideWorldBounds(true);
    }

    addPlayer(id, state)
    {
        // @TODO: implement player custom avatar.
        this.players[id] = this.scene.physics.add.sprite(state.x, state.y, share.IMAGE_PLAYER);
        this.players[id].anims.play(state.dir);
        this.players[id].anims.stop();
        return this.players[id];
    }

    runPlayerAnimation(playerId, player)
    {
        let playerSprite = this.players[playerId];
        // @NOTE: player speed is defined by the server.
        if(player.state.x !== playerSprite.x && playerSprite.anims){
            if(player.state.x < playerSprite.x){
                playerSprite.anims.play(share.LEFT, true);
            } else {
                playerSprite.anims.play(share.RIGHT, true);
            }
            playerSprite.x = player.state.x;
        }
        if(player.state.y !== playerSprite.y && playerSprite.anims){
            if(player.state.y < playerSprite.y){
                playerSprite.anims.play(share.UP, true);
            } else {
                playerSprite.anims.play(share.DOWN, true);
            }
            playerSprite.y = player.state.y;
            // @NOTE: depth has to be set dynamically, this way the player will be above or below other objects.
            playerSprite.setDepth(playerSprite.y + playerSprite.body.height);
        }
        // player stop action:
        if(player.mov !== playerSprite.mov && playerSprite.anims){
            if(!player.mov){
                playerSprite.anims.stop();
            }
            playerSprite.mov = player.mov;
        }
        // player change direction action:
        if(player.state.dir !== playerSprite.dir){
            playerSprite.dir = player.state.dir;
            playerSprite.anims.play(player.state.dir, true);
            playerSprite.anims.stop();
        }
    }

    removePlayer(key)
    {
        this.players[key].destroy();
        delete this.players[key];
    }

    left()
    {
        this.room.send({dir: share.LEFT});
    }

    right()
    {
        this.room.send({dir: share.RIGHT});
    }

    up()
    {
        this.room.send({dir: share.UP});
    }

    down()
    {
        this.room.send({dir: share.DOWN});
    }

    stop()
    {
        this.room.send({act: share.STOP});
    }

    runActions()
    {
        this.room.send({act: share.ACTION});
    }

}

module.exports = PlayerEngine;
