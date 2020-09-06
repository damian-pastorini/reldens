/**
 *
 * Reldens - Actions Client Package.
 *
 */

const { EventsManager } = require('@reldens/utils');
const { GameConst } = require('../../game/constants');

class ActionsPack
{

    constructor()
    {
        // eslint-disable-next-line no-unused-vars
        EventsManager.on('reldens.joinedRoom', (room, gameManager) => {
            this.listenMessages(room, gameManager);
        });
    }

    listenMessages(room, gameManager)
    {
        room.onMessage((message) => {
            let currentScene = gameManager.getActiveScene();
            if(!currentScene.player){
                return;
            }
            if(message.act === GameConst.ATTACK){
                EventsManager.emit('reldens.playerAttack', message, room);
                let ownerSprite = false;
                let targetSprite = false;
                let isPvP = (
                    {}.hasOwnProperty.call(currentScene.player.players, message.owner)
                    && {}.hasOwnProperty.call(currentScene.player.players, message.target)
                );
                if(isPvP){
                    ownerSprite = currentScene.player.players[message.owner];
                    targetSprite = currentScene.player.players[message.target];
                } else {
                    if({}.hasOwnProperty.call(currentScene.objectsAnimations, message.owner)){
                        ownerSprite = currentScene.objectsAnimations[message.owner].sceneSprite;
                        targetSprite = currentScene.player.players[message.target];
                    }
                    if({}.hasOwnProperty.call(currentScene.objectsAnimations, message.target)){
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
        });
    }

    runHitAnimation(x, y, currentScene)
    {
        let hitSprite = currentScene.physics.add.sprite(x, y, GameConst.HIT);
        hitSprite.setDepth(200000);
        hitSprite.anims.play(GameConst.HIT, true).on('animationcomplete', () => {
            hitSprite.destroy();
        });
    }

}

module.exports.ActionsPack = ActionsPack;
