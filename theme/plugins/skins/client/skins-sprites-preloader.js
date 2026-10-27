/**
 *
 * Reldens - Theme - SkinsSpritesPreloader
 *
 * Loads the sprite sheets of the configured skins that are not class paths (the class paths sprites are loaded by the
 * actions plugin) and creates their players animations, so a player sprite can switch to any configured skin.
 *
 */

const { UsersConst } = require('reldens/lib/users/constants');
const { GameConst } = require('reldens/lib/game/constants');

class SkinsSpritesPreloader
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
     * @param {Object} uiScene
     * @returns {number}
     */
    preloadSkins(uiScene)
    {
        let preloadedSkins = 0;
        for(let skinKey of this.fetchCustomSkinsKeys()){
            uiScene.load.spritesheet(
                skinKey,
                UsersConst.SKINS.SPRITES_BUCKET+skinKey+GameConst.FILES.EXTENSIONS.PNG,
                uiScene.playerSpriteSize
            );
            preloadedSkins++;
        }
        return preloadedSkins;
    }

    /**
     * @param {Object} preloadScene
     * @returns {number}
     */
    createSkinsAnimations(preloadScene)
    {
        if(!this.gameManager.mappedAvatars){
            this.gameManager.mappedAvatars = {};
        }
        let createdSkins = 0;
        for(let skinKey of this.fetchCustomSkinsKeys()){
            if(this.gameManager.mappedAvatars[skinKey]){
                continue;
            }
            if(!preloadScene.textures.exists(skinKey)){
                continue;
            }
            this.gameManager.mappedAvatars[skinKey] = skinKey;
            preloadScene.createPlayerAnimations(skinKey);
            createdSkins++;
        }
        return createdSkins;
    }

    /**
     * @returns {Array<string>}
     */
    fetchCustomSkinsKeys()
    {
        let skinsKeys = this.gameManager.config.getWithoutLogs(UsersConst.SKINS.CONFIG_PATHS.KEYS, []);
        if(!Array.isArray(skinsKeys)){
            return [];
        }
        let classesData = this.gameManager.initialGameData?.classesData || {};
        return skinsKeys.filter(
            skinKey => !Object.keys(classesData).some(classId => skinKey === classesData[classId].key)
        );
    }

}

module.exports.SkinsSpritesPreloader = SkinsSpritesPreloader;
