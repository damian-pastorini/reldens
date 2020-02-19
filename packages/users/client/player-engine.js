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

    constructor(scene, playerData, gameManager, room)
    {
        this.scene = scene;
        this.config = gameManager.config;
        this.gameManager = gameManager;
        this.username = playerData.username;
        this.roomName = playerData.state.scene;
        this.state = playerData.state;
        this.room = room;
        this.playerId = room.sessionId;
        this.players = {};
        this.mov = false;
        this.dir = false;
        this.currentTarget = false;
        this.animationBasedOnPress = this.config.get('client/players/animations/basedOnPress');
    }

    create()
    {
        let playerData = Object.assign({username: this.username}, this.state);
        this.addPlayer(this.playerId, playerData);
        let fadeDuration = this.config.get('client/players/animations/fadeDuration') || GameConst.FADE_DURATION;
        this.scene.cameras.main.fadeFrom(fadeDuration);
        this.scene.scene.setVisible(true, this.roomName);
        this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.startFollow(this.players[this.playerId], true);
        this.players[this.playerId].setCollideWorldBounds(true);
        this.createHealthBar();
    }

    addPlayer(id, state)
    {
        // @TODO: implement player custom avatar.
        this.players[id] = this.scene.physics.add.sprite(state.x, state.y, GameConst.IMAGE_PLAYER);
        this.players[id].username = state.username;
        this.players[id].anims.play(state.dir);
        this.players[id].anims.stop();
        this.players[id].setInteractive().on('pointerdown', () => {
            // @NOTE: we could send an specific action when the player is been targeted.
            // this.room.send({act: GameConst.TYPE_PLAYER, id: id});
            // update target ui:
            this.gameManager.gameEngine.showTarget(this.players[id].username);
            this.currentTarget = {id: id, type: GameConst.TYPE_PLAYER};
        });
        return this.players[id];
    }

    createHealthBar()
    {
        if(this.gameManager.config.get('client/ui/uiLifeBar/enabled')){
            // if the position is fixed then the bar has to go on the ui scene:
            let lifeBarScene = this.gameManager.getActiveScenePreloader();
            if(!this.gameManager.config.get('client/ui/uiLifeBar/fixedPosition')){
                // otherwise the bar will be added in the current scene:
                lifeBarScene = this.gameManager.getActiveScene();
            }
            if(lifeBarScene.uiLifeBar){
                // lifeBar already created in this scene:
                return;
            }
            this.uiLifeBar = lifeBarScene.add.graphics();
            this.redrawLifeBar();
        }
    }

    redrawLifeBar()
    {
        let barHeight = this.gameManager.config.get('client/ui/uiLifeBar/height');
        let fullBarWidth = this.gameManager.config.get('client/ui/uiLifeBar/width');
        let fullHp = this.gameManager.config.initialStats.hp;
        let filledBarWidth = (this.gameManager.playerData.stats.hp * fullBarWidth) / fullHp;
        let barX = this.gameManager.config.get('client/ui/uiLifeBar/x');
        let barY = this.gameManager.config.get('client/ui/uiLifeBar/y');
        if(!this.gameManager.config.get('client/ui/uiLifeBar/fixedPosition')){
            let currentPlayerState = this.gameManager.getCurrentPlayer().state;
            barX = currentPlayerState.x - (fullBarWidth / 2);
            barY = currentPlayerState.y - barHeight - (this.gameManager.config.get('client/players/size/height') / 2);
        }
        this.uiLifeBar.clear();
        this.uiLifeBar.fillStyle(0xff0000, 1);
        this.uiLifeBar.fillRect(
            barX,
            barY,
            filledBarWidth,
            barHeight
        );
        this.uiLifeBar.lineStyle(1, 0xffffff);
        this.uiLifeBar.strokeRect(barX, barY, fullBarWidth, barHeight);
        this.uiLifeBar.alpha = 0.6;
        this.uiLifeBar.setDepth(100000);
    }

    runPlayerAnimation(playerId, player)
    {
        let playerSprite = this.players[playerId];
        if(!playerSprite.anims){
            Logger.error('PlayerSprite animation not defined.');
        }
        this.playPlayerAnimation(playerSprite, player);
        playerSprite.x = player.state.x;
        playerSprite.y = player.state.y;
        // @NOTE: depth has to be set dynamically, this way the player will be above or below other objects.
        playerSprite.setDepth(playerSprite.y + playerSprite.body.height);
        // player stop action:
        if(!player.state.mov){
            playerSprite.anims.stop();
            playerSprite.mov = player.state.mov;
        }
        // redraw life bar all the time:
        this.redrawLifeBar();
    }

    playPlayerAnimation(playerSprite, player)
    {
        // @NOTE: player speed is defined by the server.
        if(this.animationBasedOnPress){
            playerSprite.anims.play(player.state.dir, true);
        } else {
            if(player.state.x !== playerSprite.x){
                if(player.state.x < playerSprite.x){
                    playerSprite.anims.play(GameConst.LEFT, true);
                } else {
                    playerSprite.anims.play(GameConst.RIGHT, true);
                }
            }
            if(player.state.y !== playerSprite.y){
                if(player.state.y < playerSprite.y){
                    playerSprite.anims.play(GameConst.UP, true);
                } else {
                    playerSprite.anims.play(GameConst.DOWN, true);
                }
            }
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

    moveToPointer(pointer)
    {
        let data = {
            act: GameConst.POINTER,
            column: pointer.worldColumn,
            row: pointer.worldRow,
            x: pointer.worldX,
            y: pointer.worldY
        };
        this.room.send(data);
    }

}

module.exports.PlayerEngine = PlayerEngine;
