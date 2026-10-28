/**
 *
 * Reldens - PlayersSkinSwitcher
 *
 * Keeps every player sprite on the avatar of its player schema: the avatar key changes (an equipped or unequipped skin)
 * switch the sprite texture and the animations it plays, and a sprite added after the change is synchronized too.
 *
 */

const { RoomStateEntitiesManager } = require('../../game/client/communication/room-state-entities-manager');
const { UsersConst } = require('../constants');

class PlayersSkinSwitcher
{

    /**
     * @param {Object} props
     * @param {Object} props.gameManager
     */
    constructor(props)
    {
        /** @type {Object} */
        this.gameManager = props.gameManager;
    }

    /**
     * @param {Object} player
     * @param {string} playerKey
     * @param {Object} roomEvents
     * @returns {boolean}
     */
    listenPlayerSkin(player, playerKey, roomEvents)
    {
        RoomStateEntitiesManager.createManager(roomEvents.room).listen(
            player,
            UsersConst.SKINS.AVATAR_KEY_PROPERTY,
            (avatarKey) => this.switchSkin(roomEvents.getActiveScene()?.player, playerKey, avatarKey)
        );
        return true;
    }

    /**
     * @param {Object} playerEngine
     * @param {string} playerKey
     * @returns {boolean}
     */
    syncAddedPlayer(playerEngine, playerKey)
    {
        let player = playerEngine?.room?.state?.players?.get(playerKey);
        if(!player){
            return false;
        }
        return this.switchSkin(playerEngine, playerKey, player.avatarKey);
    }

    /**
     * @param {Object} playerEngine
     * @param {string} playerKey
     * @param {string} avatarKey
     * @returns {boolean}
     */
    switchSkin(playerEngine, playerKey, avatarKey)
    {
        let playerSprite = playerEngine?.players?.[playerKey];
        if(!playerSprite){
            return false;
        }
        if(avatarKey === playerSprite.avatarKey){
            return false;
        }
        let mappedAvatarKey = this.gameManager.mappedAvatars?.[avatarKey];
        if(!mappedAvatarKey){
            return false;
        }
        playerSprite.avatarKey = avatarKey;
        playerSprite.setTexture(mappedAvatarKey);
        if(playerEngine.playerId === playerKey){
            playerEngine.avatarKey = avatarKey;
        }
        return true;
    }

}

module.exports.PlayersSkinSwitcher = PlayersSkinSwitcher;
