/**
 *
 * Reldens - PlayerEngine
 *
 * PlayerEngine is the class that handle the player actions in the client side.
 *
 */

const { Logger } = require('../../game/logger');
const { GameConst } = require('../../game/constants');

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
        this.currentTarget = false;
    }

    create()
    {
        this.addPlayer(this.playerId, this.state);
        let fadeDuration = this.config.get('client/players/animations/fadeDuration') || GameConst.FADE_DURATION;
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
        this.players[id] = this.scene.physics.add.sprite(state.x, state.y, GameConst.IMAGE_PLAYER);
        this.players[id].anims.play(state.dir);
        this.players[id].anims.stop();
        this.players[id].setInteractive().on('pointerdown', () => {
            // @NOTE: we could send an specific action when the player is been targeted.
            // this.room.send({act: GameConst.TYPE_PLAYER, id: id});
            this.currentTarget = {id: id, type: GameConst.TYPE_PLAYER};
        });
        return this.players[id];
    }

    runPlayerAnimation(playerId, player)
    {
        let playerSprite = this.players[playerId];
        if(!playerSprite.anims){
            Logger.error('PlayerSprite animation not defined.');
        }
        // @NOTE: player speed is defined by the server.
        if(player.state.x !== playerSprite.x){
            if(player.state.x < playerSprite.x){
                playerSprite.anims.play(GameConst.LEFT, true);
            } else {
                playerSprite.anims.play(GameConst.RIGHT, true);
            }
            playerSprite.x = player.state.x;
        }
        if(player.state.y !== playerSprite.y){
            if(player.state.y < playerSprite.y){
                playerSprite.anims.play(GameConst.UP, true);
            } else {
                playerSprite.anims.play(GameConst.DOWN, true);
            }
            playerSprite.y = player.state.y;
            // @NOTE: depth has to be set dynamically, this way the player will be above or below other objects.
            playerSprite.setDepth(playerSprite.y + playerSprite.body.height);
        }
        // player stop action:
        if(!player.state.mov){
            playerSprite.anims.stop();
            playerSprite.mov = player.state.mov;
        }
    }

    removePlayer(key)
    {
        this.players[key].destroy();
        delete this.players[key];
    }

    left()
    {
        this.room.send({dir: GameConst.LEFT});
    }

    right()
    {
        this.room.send({dir: GameConst.RIGHT});
    }

    up()
    {
        this.room.send({dir: GameConst.UP});
    }

    down()
    {
        this.room.send({dir: GameConst.DOWN});
    }

    stop()
    {
        this.room.send({act: GameConst.STOP});
    }

    runActions()
    {
        this.room.send({act: GameConst.ACTION, target: this.currentTarget});
    }

}

module.exports.PlayerEngine = PlayerEngine;
