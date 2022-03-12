/**
 *
 * Reldens - PlayerEngine
 *
 * PlayerEngine is the class that handle the player actions in the client side.
 *
 */

const { SpriteTextFactory } = require('../../game/client/engine/sprite-text-factory');
const { Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../../game/constants');
const { ActionsConst } = require('../../actions/constants');

class PlayerEngine
{

    constructor(scene, playerData, gameManager, room)
    {
        this.scene = scene;
        this.config = gameManager.config;
        this.gameManager = gameManager;
        this.events = gameManager.events;
        this.playerName = playerData.playerName;
        this.avatarKey = playerData.avatarKey;
        this.roomName = playerData.state.scene;
        this.state = playerData.state;
        this.room = room;
        this.playerId = room.sessionId;
        this.players = {};
        this.mov = false;
        this.dir = false;
        this.currentTarget = false;
        this.animationBasedOnPress = this.config.get('client/players/animations/basedOnPress');
        this.topOff = this.gameManager.config.get('client/players/size/topOffset');
        this.leftOff = this.gameManager.config.get('client/players/size/leftOffset');
        this.collideWorldBounds = this.gameManager.config.get('client/players/animations/collideWorldBounds');
    }

    create()
    {
        let addPlayerData = {
            x: this.state.x,
            y: this.state.y,
            dir: this.state.dir,
            playerName: this.playerName,
            avatarKey: this.avatarKey
        };
        this.addPlayer(this.playerId, addPlayerData);
        let fadeDuration = this.config.get('client/players/animations/fadeDuration') || GameConst.FADE_DURATION;
        this.scene.cameras.main.fadeFrom(fadeDuration);
        this.scene.scene.setVisible(true, this.roomName);
        this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.startFollow(this.players[this.playerId], true);
    }

    addPlayer(id, addPlayerData)
    {
        if(sc.hasOwn(this.players, id)){
            // player sprite already exists, update it and return it:
            return this.players[id];
        }
        let {x, y, dir, playerName, avatarKey} = addPlayerData;
        this.players[id] = this.scene.physics.add.sprite(x, (y - this.topOff), avatarKey);
        this.players[id].playerName = playerName;
        this.players[id].avatarKey = avatarKey;
        this.players[id].playerId = id;
        this.players[id].anims.play(avatarKey+'_'+dir);
        this.players[id].anims.stop();
        if(this.gameManager.config.get('client/ui/players/showNames')){
            SpriteTextFactory.attachTextToSprite(
                this.players[id],
                this.players[id].playerName,
                this.gameManager.config.get('client/ui/players/nameText'),
                this.topOff,
                'nameSprite',
                this.scene
            );
        }
        this.players[id].setInteractive({useHandCursor: true}).on('pointerdown', (e) => {
            // @NOTE: we avoid execute object interactions while the UI element is open, if we click on the UI the other
            // elements in the background scene should not be executed.
            if(e.downElement.nodeName !== 'CANVAS'){
                return false;
            }
            // @NOTE: we could send a specific action when the player has been targeted.
            // this.room.send({act: GameConst.TYPE_PLAYER, id: id});
            // update target ui:
            let previousTarget = Object.assign({}, this.currentTarget);
            this.currentTarget = {id: id, type: GameConst.TYPE_PLAYER};
            this.gameManager.gameEngine.showTarget(this.players[id].playerName, this.currentTarget, previousTarget);
        });
        this.players[id].moveSprites = {};
        this.players[id].setDepth(this.players[id].y + this.players[id].body.height);
        this.players[id].setCollideWorldBounds(this.collideWorldBounds);
        this.events.emitSync('reldens.playerEngineAddPlayer', this, id, addPlayerData);
        return this.players[id];
    }

    runPlayerAnimation(playerId, player)
    {
        let playerSprite = this.players[playerId];
        if(!playerSprite.anims){
            Logger.error('PlayerSprite animation not defined.');
        }
        this.playPlayerAnimation(playerSprite, player);
        playerSprite.x = player.state.x - this.leftOff;
        playerSprite.y = player.state.y - this.topOff;
        // @NOTE: depth has to be set dynamically, this way the player will be above or below other objects.
        let playerNewDepth = playerSprite.y + playerSprite.body.height;
        playerSprite.setDepth(playerNewDepth);
        // player stop action:
        if(!player.state.mov){
            playerSprite.anims.stop();
            playerSprite.mov = player.state.mov;
        }
        this.events.emitSync('reldens.runPlayerAnimation', this, playerId, player);
        let nameConfig = this.gameManager.config.get('client/ui/players');
        if(nameConfig.showNames && playerSprite.nameSprite){
            let relativeNamePosition = SpriteTextFactory.getTextPosition(
                playerSprite,
                playerSprite.playerName,
                nameConfig,
                this.topOff
            );
            playerSprite.nameSprite.x = relativeNamePosition.x;
            playerSprite.nameSprite.y = relativeNamePosition.y;
        }
        if(Object.keys(playerSprite.moveSprites).length){
            for(let i of Object.keys(playerSprite.moveSprites)){
                let sprite = playerSprite.moveSprites[i];
                sprite.x = playerSprite.x;
                sprite.y = playerSprite.y;
                // by default moving sprites will be always below the player:
                let spriteDepth = sc.hasOwn(sprite, 'depthByPlayer') && sprite['depthByPlayer'] === 'above'
                    ? playerNewDepth + 1 : playerNewDepth - 0.1;
                sprite.setDepth(spriteDepth);
            }
        }
    }

    playPlayerAnimation(playerSprite, player)
    {
        // @NOTE: player speed is defined by the server.
        if(this.animationBasedOnPress){
            playerSprite.anims.play(player.avatarKey+'_'+player.state.dir, true);
        } else {
            let { avatarKey } = player;
            if(player.state.x !== playerSprite.x){
                if(player.state.x < playerSprite.x){
                    playerSprite.anims.play(avatarKey+'_'+GameConst.LEFT, true);
                } else {
                    playerSprite.anims.play(avatarKey+'_'+GameConst.RIGHT, true);
                }
            }
            if(player.state.y !== playerSprite.y){
                if(player.state.y < playerSprite.y){
                    playerSprite.anims.play(avatarKey+'_'+GameConst.UP, true);
                } else {
                    playerSprite.anims.play(avatarKey+'_'+GameConst.DOWN, true);
                }
            }
        }
    }

    removePlayer(key)
    {
        this.players[key].nameSprite.destroy();
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
        this.room.send({
            act: ActionsConst.ACTION,
            type: this.config.get('client/ui/controls/defaultActionKey'),
            target: this.currentTarget
        });
    }

    moveToPointer(pointer)
    {
        let data = {
            act: GameConst.POINTER,
            column: pointer.worldColumn,
            row: pointer.worldRow,
            x: pointer.worldX - this.leftOff,
            y: pointer.worldY - this.topOff
        };
        this.room.send(data);
    }

    getPosition()
    {
        return {
            x: this.players[this.playerId].x,
            y: this.players[this.playerId].y
        };
    }

}

module.exports.PlayerEngine = PlayerEngine;
