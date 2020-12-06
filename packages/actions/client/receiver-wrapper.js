/**
 *
 * Reldens - ReceiverWarpper
 *
 * Reldens/Skills Receiver custom implementation to include gameManager and room references.
 *
 */

const { Receiver } = require('@reldens/skills');
const { EventsManagerSingleton, sc } = require('@reldens/utils');
const { GameConst } = require('../../game/constants');

class ReceiverWrapper extends Receiver
{

    constructor(props, roomEvents)
    {
        super(props);
        this.gameManager = roomEvents.gameManager;
        this.room = roomEvents.room;
        this.queueMessages = [];
    }

    processMessage(message)
    {
        let currentScene = this.gameManager.getActiveScene();
        if(!currentScene.player){
            // @NOTE: if player still not set and it's a skills message we will process the message after the player
            // instance was created.
            if(this.isValidMessage(message)){
                this.queueMessages.push(message);
            }
            return true;
        }
        super.processMessage(message);
        if(message.act === GameConst.ATTACK){
            EventsManagerSingleton.emit('reldens.playerAttack', message, this.room);
            let ownerSprite = false;
            let targetSprite = false;
            let isPvP = (
                sc.hasOwn(currentScene.player.players, message.owner)
                && sc.hasOwn(currentScene.player.players, message.target)
            );
            if(isPvP){
                ownerSprite = currentScene.player.players[message.owner];
                targetSprite = currentScene.player.players[message.target];
            } else {
                if(sc.hasOwn(currentScene.objectsAnimations, message.owner)){
                    ownerSprite = currentScene.objectsAnimations[message.owner].sceneSprite;
                    targetSprite = currentScene.player.players[message.target];
                }
                if(sc.hasOwn(currentScene.objectsAnimations, message.target)){
                    targetSprite = currentScene.objectsAnimations[message.target].sceneSprite;
                    ownerSprite = currentScene.player.players[message.owner];
                }
            }
            if(ownerSprite){
                let ownerAnim = currentScene.physics.add.sprite(ownerSprite.x, ownerSprite.y, GameConst.ATTACK);
                ownerAnim.setDepth(200000);
                ownerAnim.anims.play(GameConst.ATTACK, true).on('animationcomplete', () => {
                    ownerAnim.destroy();
                });
            }
            if(targetSprite){
                this.runHitAnimation(targetSprite.x, targetSprite.y, currentScene);
            }
        }
        if(message.act === GameConst.HIT){
            this.runHitAnimation(message.x, message.y, currentScene);
        }
    }

    runHitAnimation(x, y, currentScene)
    {
        let hitSprite = currentScene.physics.add.sprite(x, y, GameConst.HIT);
        hitSprite.setDepth(200000);
        hitSprite.anims.play(GameConst.HIT, true).on('animationcomplete', () => {
            hitSprite.destroy();
        });
    }

    updateLevelAndExperience(message)
    {
        this.gameManager.gameDom.updateContent('.level-container .level-label', 'Level '+message.data.lvl);
        this.gameManager.gameDom.updateContent('.experience-container .current-experience', message.data.exp);
        if(message.data.lab){
            this.gameManager.gameDom.updateContent('.class-path-container .class-path-label', message.data.lab);
        }
        // @NOTE: level label could override the path label.
        if(message.data.nl){
            this.gameManager.gameDom.updateContent('.class-path-container .class-path-label', message.data.nl);
        }
        if(message.data.ne){
            this.gameManager.gameDom.updateContent('.experience-container .next-level-experience', message.data.ne);
        }
    }

    onInitClassPathEnd(message)
    {
        this.updateLevelAndExperience(message);
        // @TODO- TEST: update skills, etc. is this needed?
    }

    onLevelUp(message)
    {
        this.updateLevelAndExperience(message);
    }

    onLevelExperienceAdded(message)
    {
        this.gameManager.gameDom.updateContent('.experience-container .current-experience', message.data.exp);
    }

}

module.exports.ReceiverWrapper = ReceiverWrapper;
