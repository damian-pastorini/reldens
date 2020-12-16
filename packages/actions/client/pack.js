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
            uiScene.load.html('skillsClassPath', 'assets/features/skills/templates/ui-class-path.html');
            uiScene.load.html('skillsLevel', 'assets/features/skills/templates/ui-level.html');
            uiScene.load.html('skillsExperience', 'assets/features/skills/templates/ui-experience.html');
            uiScene.load.html('skills', 'assets/features/skills/templates/ui-skills.html');
            uiScene.load.html('skillBox', 'assets/features/skills/templates/ui-skill-box.html');
            uiScene.load.html('actionBox', 'assets/html/ui-action-box.html');
        });
        EventsManagerSingleton.on('reldens.createUiScene', (preloadScene) => {
            this.uiManager = new SkillsUi(preloadScene);
            this.uiManager.createUi();
        });
    }

}

module.exports.ActionsPack = ActionsPack;
