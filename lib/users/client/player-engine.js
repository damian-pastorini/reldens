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

    constructor(props)
    {
        let {scene, playerData, gameManager, room} = props;
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
        this.playedTime = playerData.playedTime;
        this.mov = false;
        this.dir = false;
        this.currentTarget = false;
        this.predictionBody = false;
        this.pointsValidator = false;
        this.animationBasedOnPress = this.config.get('client/players/animations/basedOnPress');
        this.topOff = this.gameManager.config.get('client/players/size/topOffset');
        this.leftOff = this.gameManager.config.get('client/players/size/leftOffset');
        this.collideWorldBounds = this.gameManager.config.get('client/players/animations/collideWorldBounds');
        this.fadeDuration = Number(this.config.get('client/players/animations/fadeDuration'));
        this.globalConfigNameText = this.gameManager.config.get('client/ui/players/nameText');
        this.globalConfigShowNames = Boolean(this.gameManager.config.get('client/ui/players/showNames'));
        this.lastKeyState = {};
    }

    create()
    {
        let addPlayerData = {
            x: this.state.x,
            y: this.state.y,
            dir: this.state.dir,
            playerName: this.playerName,
            avatarKey: this.avatarKey,
            playedTime: this.playedTime
        };
        this.addPlayer(this.playerId, addPlayerData);
        this.scene.cameras.main.fadeFrom(this.fadeDuration);
        this.scene.scene.setVisible(true, this.roomName);
        this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.startFollow(this.players[this.playerId], true);
    }

    addPlayer(id, addPlayerData)
    {
        // @TODO - BETA - Create a PlayersManager attached to the Scene and move all the CRUD methods into it.
        if(sc.hasOwn(this.players, id)){
            // player sprite already exists, update it and return it:
            return this.players[id];
        }
        let {x, y, dir, playerName, avatarKey, playedTime} = addPlayerData;
        this.players[id] = this.scene.physics.add.sprite(x, (y - this.topOff), avatarKey);
        this.players[id].playerName = playerName;
        this.players[id].playedTime = playedTime;
        this.players[id].avatarKey = avatarKey;
        this.players[id].playerId = id;
        this.players[id].anims.play(avatarKey+'_'+dir);
        this.players[id].anims.stop();
        this.showPlayerName(id);
        this.makePlayerInteractive(id);
        this.players[id].moveSprites = {};
        this.players[id].setDepth(this.players[id].y + this.players[id].body.height);
        this.players[id].setCollideWorldBounds(this.collideWorldBounds);
        this.events.emitSync('reldens.playerEngineAddPlayer', this, id, addPlayerData);
        return this.players[id];
    }

    makePlayerInteractive(id)
    {
        this.players[id].setInteractive({useHandCursor: true}).on('pointerdown', (e) => {
            // @NOTE: we avoid execute object interactions while the UI element is open, if we click on the UI the other
            // elements in the background scene should not be executed.
            if('CANVAS' !== e.downElement.nodeName){
                return false;
            }
            // @NOTE: we could send a specific action when the player has been targeted.
            // this.room.send('*', {act: GameConst.TYPE_PLAYER, id: id});
            // update target ui:
            let previousTarget = Object.assign({}, this.currentTarget);
            this.currentTarget = {id: id, type: GameConst.TYPE_PLAYER};
            this.gameManager.gameEngine.showTarget(this.players[id].playerName, this.currentTarget, previousTarget);
        });
    }

    showPlayerName(id)
    {
        if(!this.globalConfigShowNames){
            return false;
        }
        SpriteTextFactory.attachTextToSprite(
            this.players[id],
            this.players[id].playerName,
            this.globalConfigNameText,
            this.topOff,
            'nameSprite',
            this.scene
        );
    }

    updatePlayer(playerId, player)
    {
        let playerSprite = this.players[playerId];
        if(!playerSprite.anims){
            Logger.error('PlayerSprite animation not defined.');
        }
        if(this.scene.clientInterpolation){
            this.scene.interpolatePlayersPosition[playerId] = player.state;
            return;
        }
        this.playPlayerAnimation(playerSprite, player.state);
        this.stopPlayerAnimation(playerSprite, player.state);
        this.updateSpritePosition(playerSprite, (player.state.x - this.leftOff), (player.state.y - this.topOff));
        this.updatePlayerState(playerSprite, player.state, playerId);
    }

    updatePlayerState(playerSprite, playerState, playerId)
    {
        // @NOTE: depth has to be set dynamically, this way the player will be above or below other objects.
        let playerNewDepth = this.updateSpriteDepth(playerSprite);
        this.events.emitSync('reldens.runPlayerAnimation', this, playerId, playerState, playerSprite);
        this.updateNamePosition(playerSprite);
        this.moveAttachedSprites(playerSprite, playerNewDepth);
    }

    updateSpriteDepth(sprite)
    {
        let playerNewDepth = sprite.y + sprite.body.height;
        sprite.setDepth(playerNewDepth);
        return playerNewDepth;
    }

    updateSpritePosition(sprite, newX, newY)
    {
        sprite.x = newX;
        sprite.y = newY;
    }

    updateNamePosition(playerSprite)
    {
        if(!this.globalConfigShowNames || !playerSprite['nameSprite']){
            return false;
        }
        let relativeNamePosition = SpriteTextFactory.getTextPosition(
            playerSprite,
            playerSprite.playerName,
            this.globalConfigNameText,
            this.topOff
        );
        playerSprite['nameSprite'].x = relativeNamePosition.x;
        playerSprite['nameSprite'].y = relativeNamePosition.y;
    }

    moveAttachedSprites(playerSprite, playerNewDepth)
    {
        let playersKeys = Object.keys(playerSprite.moveSprites);
        if(0 === playersKeys.length){
            return false;
        }
        for(let i of playersKeys){
            let sprite = playerSprite.moveSprites[i];
            sprite.x = playerSprite.x;
            sprite.y = playerSprite.y;
            // by default moving sprites will be always below the player:
            sprite.setDepth((sc.get(sprite, 'depthByPlayer', '') === 'above' ? playerNewDepth+1 : playerNewDepth-0.1));
        }
    }

    playPlayerAnimation(playerSprite, playerState)
    {
        // @NOTE: player speed is defined by the server.
        if(this.animationBasedOnPress){
            playerSprite.anims.play(playerSprite.avatarKey+'_'+playerState.dir, true);
            return;
        }
        if(playerState.x !== playerSprite.x){
            let directionToPlayX = playerState.x < playerSprite.x
                ? playerSprite.avatarKey+'_'+GameConst.LEFT
                : playerSprite.avatarKey+'_'+GameConst.RIGHT;
            playerSprite.anims.play(directionToPlayX, true);
        }
        if(playerState.y !== playerSprite.y){
            let directionToPlayY = playerState.y < playerSprite.y
                ? playerSprite.avatarKey+'_'+GameConst.UP
                : playerSprite.avatarKey+'_'+GameConst.DOWN;
            playerSprite.anims.play(directionToPlayY, true);
        }
    }

    stopPlayerAnimation(playerSprite, playerState)
    {
        // if not moving then stop the player animation:
        if(playerState.mov){
            return;
        }
        playerSprite.anims.stop();
        playerSprite.mov = playerState.mov;
    }

    removePlayer(key)
    {
        if(!sc.hasOwn(this.players, key) || !sc.hasOwn(this.players[key], 'nameSprite')){
            return;
        }
        this.players[key].nameSprite.destroy();
        this.players[key].destroy();
        delete this.players[key];
    }

    left()
    {
        if('pressed' === this.lastKeyState[GameConst.LEFT]){
            return;
        }
        let sendData = {dir: GameConst.LEFT, time: this.scene.worldPredictionTimer.currentTime};
        this.lastKeyState[GameConst.LEFT] = 'pressed';
        if(this.predictionBody){
            this.predictionBody.initMove(GameConst.LEFT);
        }
        this.room.send('*', sendData);
    }

    right()
    {
        if('pressed' === this.lastKeyState[GameConst.RIGHT]){
            return;
        }
        this.lastKeyState[GameConst.RIGHT] = 'pressed';
        let sendData = {dir: GameConst.RIGHT, time: this.scene.worldPredictionTimer.currentTime};
        if(this.predictionBody){
            this.predictionBody.initMove(GameConst.RIGHT);
        }
        this.room.send('*', sendData);
    }

    up()
    {
        if('pressed' === this.lastKeyState[GameConst.UP]){
            return;
        }
        this.lastKeyState[GameConst.UP] = 'pressed';
        let sendData = {dir: GameConst.UP, time: this.scene.worldPredictionTimer.currentTime};
        if(this.predictionBody){
            this.predictionBody.initMove(GameConst.UP);
        }
        this.room.send('*', sendData);
    }

    down()
    {
        if('pressed' === this.lastKeyState[GameConst.DOWN]){
            return;
        }
        this.lastKeyState[GameConst.DOWN] = 'pressed';
        let sendData = {dir: GameConst.DOWN, time: this.scene.worldPredictionTimer.currentTime};
        if(this.predictionBody){
            this.predictionBody.initMove(GameConst.DOWN);
        }
        this.room.send('*', sendData);
    }

    stop()
    {
        this.lastKeyState[GameConst.LEFT] = '';
        this.lastKeyState[GameConst.RIGHT] = '';
        this.lastKeyState[GameConst.UP] = '';
        this.lastKeyState[GameConst.DOWN] = '';
        let sendData = {act: GameConst.STOP, time: this.scene.worldPredictionTimer.currentTime};
        if(this.predictionBody){
            this.predictionBody.stopFull();
        }
        this.room.send('*', sendData);
    }

    runActions()
    {
        let data = {
            act: ActionsConst.ACTION,
            type: this.config.get('client/ui/controls/defaultActionKey'),
            target: this.currentTarget
        };
        this.room.send('*', data);
    }

    moveToPointer(pointer)
    {
        this.lastKeyState[GameConst.LEFT] = '';
        this.lastKeyState[GameConst.RIGHT] = '';
        this.lastKeyState[GameConst.UP] = '';
        this.lastKeyState[GameConst.DOWN] = '';
        let data = {
            act: GameConst.POINTER,
            column: pointer.worldColumn,
            row: pointer.worldRow,
            x: pointer.worldX - this.leftOff,
            y: pointer.worldY - this.topOff
        };
        if(this.predictionBody && this.pointsValidator){
            let predictionData = Object.assign({}, data);
            predictionData = this.pointsValidator.makeValidPoints(predictionData);
            this.predictionBody.moveToPoint(predictionData);
        }
        this.room.send('*', data);
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
