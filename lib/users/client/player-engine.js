/**
 *
 * Reldens - PlayerEngine
 *
 */

const { SpriteTextFactory } = require('../../game/client/engine/sprite-text-factory');
const { GameConst } = require('../../game/constants');
const { ActionsConst } = require('../../actions/constants');
const { Logger, sc } = require('@reldens/utils');

class PlayerEngine
{

    constructor(props)
    {
        // @TODO - BETA - Refactor entirely.
        let {scene, playerData, gameManager, room, roomEvents} = props;
        this.scene = scene;
        this.config = gameManager.config;
        this.gameManager = gameManager;
        this.events = gameManager.events;
        this.playerName = playerData.playerName;
        this.avatarKey = playerData.avatarKey;
        this.roomName = playerData.state.scene;
        this.state = playerData.state;
        this.room = room;
        this.roomEvents = roomEvents;
        this.playerId = room.sessionId;
        this.player_id = playerData.player_id; // id from storage
        this.players = {};
        this.playedTime = playerData.playedTime;
        this.mov = false;
        this.dir = false;
        this.currentTarget = false;
        this.pointsValidator = false;
        // @TODO - BETA - Set all the configs in a single config property.
        this.animationBasedOnPress = this.config.get('client/players/animations/basedOnPress');
        // @TODO - BETA - Make size configurations depend on class-paths assets if present.
        this.topOff = this.config.get('client/players/size/topOffset');
        this.leftOff = this.config.get('client/players/size/leftOffset');
        this.collideWorldBounds = this.config.get('client/players/animations/collideWorldBounds');
        this.fadeDuration = Number(this.config.get('client/players/animations/fadeDuration'));
        this.cameraRoundPixels = Boolean(
            this.config.getWithoutLogs('client/general/engine/cameraRoundPixels', true)
        );
        this.cameraInterpolationX = Number(
            this.config.getWithoutLogs('client/general/engine/cameraInterpolationX', 0.02)
        );
        this.cameraInterpolationY = Number(
            this.config.getWithoutLogs('client/general/engine/cameraInterpolationY', 0.02)
        );
        this.globalConfigNameText = this.config.get('client/ui/players/nameText');
        this.globalConfigShowNames = Boolean(this.config.get('client/ui/players/showNames'));
        this.globalConfigShowNamesLimit = this.config.getWithoutLogs('client/ui/players/showNamesLimit', 10);
        this.defaultActionKeyConfig = this.config.get('client/ui/controls/defaultActionKey');
        this.highlightOnOver = Boolean(this.config.getWithoutLogs('client/ui/players/highlightOnOver', true));
        this.highlightColor = this.config.getWithoutLogs('client/ui/players/highlightColor', '0x00ff00');
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
            playedTime: this.playedTime,
            player_id: this.player_id
        };
        this.addPlayer(this.playerId, addPlayerData);
        this.scene.cameras.main.startFollow(this.players[this.playerId]);
        this.scene.scene.setVisible(true, this.roomName);
        this.scene.cameras.main.fadeFrom(this.fadeDuration);
        this.scene.physics.world.fixedStep = false;
        this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.setIsSceneCamera(true);
        this.scene.cameras.main.on('camerafadeincomplete', () => {
            this.scene.cameras.main.startFollow(this.players[this.playerId]);
            this.scene.cameras.main.setLerp(this.cameraInterpolationX, this.cameraInterpolationY);
            this.scene.cameras.main.setRoundPixels(this.cameraRoundPixels);
        });
    }

    addPlayer(id, addPlayerData)
    {
        // @TODO - BETA - Create a PlayersManager attached to the Scene and move all the players handler methods there.
        if(sc.hasOwn(this.players, id)){
            // player sprite already exists, update it and return it:
            return this.players[id];
        }
        let {x, y, dir, playerName, avatarKey, playedTime, player_id} = addPlayerData;
        let mappedAvatarKey = this.gameManager.mappedAvatars[avatarKey];
        Logger.debug({mappedAvatarKey, avatarKey, mappedAvatars: this.gameManager.mappedAvatars});
        this.players[id] = this.scene.physics.add.sprite(x, (y - this.topOff), mappedAvatarKey);
        this.players[id].playerName = playerName;
        this.players[id].playedTime = playedTime;
        this.players[id].avatarKey = avatarKey;
        this.players[id].playerId = id;
        this.players[id].player_id = player_id;
        this.players[id].anims.play(mappedAvatarKey+'_'+dir);
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
            if(GameConst.SELECTORS.CANVAS !== e.downElement.nodeName){
                return false;
            }
            // @NOTE: we could send a specific action when the player has been targeted.
            // this.roomEvents.send('*', {act: GameConst.TYPE_PLAYER, id: id});
            // update target ui:
            this.setTargetPlayerById(id);
        });
        if(this.highlightOnOver){
            this.players[id].on('pointerover', () => {
                this.players[id].setTint(this.highlightColor);
            });
            this.players[id].on('pointerout', () => {
                this.players[id].clearTint();
            });
        }
    }

    setTargetPlayerById(id)
    {
        if(!sc.get(this.players, id, false)){
            Logger.info('Target player ID "'+id+'" was not found.');
            this.gameManager.gameEngine.clearTarget();
            return false;
        }
        let previousTarget = Object.assign({}, this.currentTarget);
        this.currentTarget = {id: id, type: GameConst.TYPE_PLAYER, player_id: this.players[id].player_id};
        this.gameManager.gameEngine.showTarget(this.players[id].playerName, this.currentTarget, previousTarget);
    }

    showPlayerName(id)
    {
        if(!this.globalConfigShowNames){
            return false;
        }
        if(!this.players[id]){
            Logger.critical('Player ID "'+id+'" not found.', this.players);
            return false;
        }
        let showName = this.players[id].playerName;
        if(!showName){
            Logger.critical('Player name not found on player ID "'+id+'".', this.players[id]);
            return false;
        }
        SpriteTextFactory.attachTextToSprite(
            this.players[id],
            this.applyNameLengthLimit(showName),
            this.globalConfigNameText,
            this.topOff,
            'nameSprite',
            this.scene
        );
    }

    applyNameLengthLimit(showName)
    {
        if(0 < this.globalConfigShowNamesLimit && showName.length > this.globalConfigShowNamesLimit){
            showName = showName.slice(0, this.globalConfigShowNamesLimit) + '...';
        }
        return showName;
    }

    updatePlayer(playerId, player)
    {
        let playerSprite = this.players[playerId];
        if(!playerSprite){
            Logger.error('PlayerSprite not defined.', this.players, playerId);
            return;
        }
        Logger.debug('Updating player ID "'+playerId+'". - Current player ID "'+this.player_id+'".');
        if(this.scene.clientInterpolation){
            this.scene.interpolatePlayersPosition[playerId] = player.state;
            return;
        }
        this.processPlayerPositionAnimationUpdate(
            playerSprite,
            player.state,
            playerId,
            player.state.x - this.leftOff,
            player.state.y - this.topOff
        );
    }

    processPlayerPositionAnimationUpdate(playerSprite, playerState, playerId, newX = 0, newY = 0)
    {
        Logger.debug('Process player position animation update.', {playerSprite, playerState, playerId, newX, newY});
        if(!playerSprite){
            Logger.error('Missing player sprite to process animation update.', playerSprite, playerState, playerId);
            return;
        }
        if(!playerState){
            Logger.error('Missing player state to process animation update.', playerSprite, playerState, playerId);
            return;
        }
        if(!playerId){
            Logger.error('Missing player ID to process animation update.', playerSprite, playerState, playerId);
            return;
        }
        let currentInterpolations = Object.keys(this.scene.interpolatePlayersPosition);
        if(0 === currentInterpolations.length){
            return;
        }
        if(GameConst.STATUS.DEATH === playerState.inState || GameConst.STATUS.DISABLED === playerState.inState){
            delete this.scene.interpolatePlayersPosition[playerId];
            return;
        }
        this.playPlayerAnimation(playerSprite, playerState, playerId);
        this.stopPlayerAnimation(playerSprite, playerState);
        this.updateSpritePosition(playerSprite, newX, newY);
        this.updatePlayerState(playerSprite, playerState, playerId);
    }

    updatePlayerState(playerSprite, playerState, playerId)
    {
        // @NOTE: depth has to be set dynamically, this way the player will be above or below other objects.
        let playerNewDepth = playerSprite.y + playerSprite.body.height;
        if(playerSprite.depth !== playerNewDepth){
            playerSprite.setDepth(playerNewDepth);
        }
        this.events.emitSync('reldens.runPlayerAnimation', this, playerId, playerState, playerSprite);
        this.updateNamePosition(playerSprite);
        this.moveAttachedSprites(playerSprite, playerNewDepth);
    }

    updateSpritePosition(sprite, newX, newY)
    {
        if(sprite.x !== newX){
            sprite.x = newX;
        }
        if(sprite.y !== newY){
            sprite.y = newY;
        }
    }

    updateNamePosition(playerSprite)
    {
        if(!this.globalConfigShowNames || !playerSprite['nameSprite']){
            return false;
        }
        let relativeNamePosition = SpriteTextFactory.getTextPosition(
            playerSprite,
            this.applyNameLengthLimit(playerSprite.playerName),
            this.globalConfigNameText,
            this.topOff
        );
        playerSprite['nameSprite'].x = relativeNamePosition.x;
        playerSprite['nameSprite'].y = relativeNamePosition.y;
    }

    moveAttachedSprites(playerSprite, playerNewDepth)
    {
        let moveSpriteKeys = Object.keys(playerSprite.moveSprites);
        if(0 === moveSpriteKeys.length){
            return false;
        }
        for(let i of moveSpriteKeys){
            let sprite = playerSprite.moveSprites[i];
            if(sprite.x === playerSprite.x && sprite.y === playerSprite.y){
                continue;
            }
            sprite.x = playerSprite.x;
            sprite.y = playerSprite.y;
            // by default moving sprites will be always below the player:
            let newSpriteDepth = playerNewDepth + (sc.get(sprite, 'depthByPlayer', '') === 'above' ? 1 :  -0.1);
            Logger.debug('Sprite "'+i+'" new depth: '+newSpriteDepth+'.', sprite);
            sprite.setDepth(newSpriteDepth);
        }
    }

    playPlayerAnimation(playerSprite, playerState, playerId)
    {
        if(this.isDeath(playerState) || this.isDisabled(playerState)){
            Logger.debug('Player with ID "'+playerId+'" is disabled to play the animation.', playerState);
            return false;
        }
        Logger.debug('Play player animation.', playerSprite.avatarKey, playerState);
        // @NOTE: player speed is defined by the server.
        let activeAvatarKey = this.gameManager.mappedAvatars[playerSprite.avatarKey];
        if(this.animationBasedOnPress){
            let directionKey = activeAvatarKey+'_'+playerState.dir;
            if(playerState.x === playerSprite.x && playerState.y === playerSprite.y){
                Logger.debug('Player has not changed, skipped animation "'+directionKey+'".');
                return false;
            }
            Logger.debug('Animation played based on press active.', activeAvatarKey,
                {
                    x: playerState.x+' / '+playerSprite.x,
                    y: playerState.y+' / '+playerSprite.y
                }
            );
            playerSprite.anims.play(directionKey, true);
            return;
        }
        if(playerState.x !== playerSprite.x){
            let directionToPlayX = playerState.x < playerSprite.x
                ? activeAvatarKey+'_'+GameConst.LEFT
                : activeAvatarKey+'_'+GameConst.RIGHT;
            playerSprite.anims.play(directionToPlayX, true);
        }
        if(playerState.y !== playerSprite.y){
            let directionToPlayY = playerState.y < playerSprite.y
                ? activeAvatarKey+'_'+GameConst.UP
                : activeAvatarKey+'_'+GameConst.DOWN;
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
        this.players[key]['nameSprite'].destroy();
        this.players[key].destroy();
        delete this.players[key];
    }

    left()
    {
        if('pressed' === this.lastKeyState[GameConst.LEFT]){
            return;
        }
        this.lastKeyState[GameConst.LEFT] = 'pressed';
        this.roomEvents.send({dir: GameConst.LEFT});
    }

    right()
    {
        if('pressed' === this.lastKeyState[GameConst.RIGHT]){
            return;
        }
        this.lastKeyState[GameConst.RIGHT] = 'pressed';
        this.roomEvents.send({dir: GameConst.RIGHT});
    }

    up()
    {
        if('pressed' === this.lastKeyState[GameConst.UP]){
            return;
        }
        this.lastKeyState[GameConst.UP] = 'pressed';
        this.roomEvents.send({dir: GameConst.UP});
    }

    down()
    {
        if('pressed' === this.lastKeyState[GameConst.DOWN]){
            return;
        }
        this.lastKeyState[GameConst.DOWN] = 'pressed';
        this.roomEvents.send({dir: GameConst.DOWN});
    }

    stop()
    {
        this.lastKeyState[GameConst.LEFT] = '';
        this.lastKeyState[GameConst.RIGHT] = '';
        this.lastKeyState[GameConst.UP] = '';
        this.lastKeyState[GameConst.DOWN] = '';
        this.roomEvents.send({act: GameConst.STOP});
    }

    runActions()
    {
        this.roomEvents.send({
            act: ActionsConst.ACTION,
            type: this.defaultActionKeyConfig,
            target: this.currentTarget
        });
    }

    moveToPointer(pointer)
    {
        if(this.isDeath() || this.isDisabled()){
            this.fullStop();
            return false;
        }
        this.lastKeyState[GameConst.LEFT] = '';
        this.lastKeyState[GameConst.RIGHT] = '';
        this.lastKeyState[GameConst.UP] = '';
        this.lastKeyState[GameConst.DOWN] = '';
        this.roomEvents.send({
            act: GameConst.POINTER,
            column: pointer.worldColumn,
            row: pointer.worldRow,
            x: pointer.worldX - this.leftOff,
            y: pointer.worldY - this.topOff
        });
    }

    isDisabled(state)
    {
        if(!state){
            state = this.state;
        }
        return GameConst.STATUS.DISABLED === state.inState;
    }

    isDeath(state)
    {
        if(!state){
            state = this.state;
        }
        return GameConst.STATUS.DEATH === state.inState;
    }

    fullStop()
    {
        delete this.scene.interpolatePlayersPosition[this.player_id];
        this.stop();
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
