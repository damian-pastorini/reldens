/**
 *
 * Reldens - Actions Client Package.
 *
 */

const { ReceiverWrapper } = require('./receiver-wrapper');
const { SkillsUi } = require('./skills-ui');
const { EventsManagerSingleton } = require('@reldens/utils');

class ActionsPack
{

    constructor()
    {
        EventsManagerSingleton.on('reldens.playersOnAdd', (player, key, previousScene, roomEvents) => {
            if(key === roomEvents.room.sessionId){
                if(!roomEvents.gameManager.skills){
                    // create skills instance only once:
                    let receiverProps = {
                        owner: player
                    };
                    // create skills receiver instance:
                    roomEvents.gameManager.skills = new ReceiverWrapper(receiverProps, roomEvents);
                }
                // listen to room messages:
                roomEvents.room.onMessage((message) => {
                    roomEvents.gameManager.skills.processMessage(message);
                });
            }
        });
        EventsManagerSingleton.on('reldens.playersOnAddReady', (player, key, previousScene, roomEvents) => {
            if(key === roomEvents.room.sessionId){
                if(roomEvents.gameManager.skills.queueMessages.length){
                    for(let message of roomEvents.gameManager.skills.queueMessages){
                        // process queue messages:
                        roomEvents.gameManager.skills.processMessage(message);
                    }
                }
            }
        });
        EventsManagerSingleton.on('reldens.preloadUiScene', (uiScene) => {
            uiScene.load.html('uiClassPath', 'assets/features/skills/templates/ui-class-path.html');
            uiScene.load.html('uiLevel', 'assets/features/skills/templates/ui-level.html');
            uiScene.load.html('uiExperience', 'assets/features/skills/templates/ui-experience.html');
            // @TODO - BETA.16 - R16-1a: make skills buttons on client side load dynamically.
            // uiScene.load.html('uiSkills', 'assets/features/skills/templates/ui-skills.html');
        });
        EventsManagerSingleton.on('reldens.createUiScene', (preloadScene) => {
            this.uiManager = new SkillsUi(preloadScene);
            this.uiManager.createUi();
        });
    }

}

module.exports.ActionsPack = ActionsPack;
