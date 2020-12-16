/**
 *
 * Reldens - SkillsUi
 *
 * This class will handle the skills UI and assign all the related events and actions.
 *
 */

class SkillsUi
{

    constructor(uiScene)
    {
        this.uiScene = uiScene;
        this.gameManager = this.uiScene.gameManager;
        this.defaultAction = this.gameManager.config.get('client/ui/controls/defaultActionKey');
    }

    createUi()
    {
        this.appendToUiContainer('#ui-player-extras', 'skillsClassPath');
        this.appendToUiContainer('#ui-player-extras', 'skillsLevel');
        this.appendToUiContainer('#ui-player-extras', 'skillsExperience');
        this.createUiBox('skills', 7);
    }

    appendSkills(skills, waitLoad = false)
    {
        let skillsList = Object.keys(skills);
        // if the default action is a skill we won't show a duplicated box:
        if(skillsList.length){
            for(let i of skillsList){
                let skill = skills[i];
                if(skill === this.defaultAction){
                    continue;
                }
                if(waitLoad){
                    /*
                    this.uiScene.load.spritesheet(skill, 'assets/custom/sprites/skills'+skill+'.png', {
                        frameWidth: skill.animationData.frameWidth || 64,
                        frameHeight: skill.animationData.frameHeight || 64
                    });
                    this.uiScene.load.on('complete', () => {

                    });
                    */
                } else {
                    this.createSkillBox(skill);
                }
            }
        }
    }

    appendToUiContainer(containerSelector, skillsUiTemplate)
    {
        let messageTemplate = this.uiScene.cache.html.get(skillsUiTemplate);
        this.gameManager.gameDom.appendToElement(containerSelector, messageTemplate);
    }

    createUiBox(codeName, depth)
    {
        let {uiX, uiY} = this.uiScene.getUiConfig(codeName);
        let generatedUi = this.uiScene.add.dom(uiX, uiY).createFromCache(codeName);
        generatedUi.setDepth(depth);
        this.uiScene.elementsUi[codeName] = generatedUi;
    }

    createSkillBox(skill)
    {
        let skillBox = this.parseSkillTemplate(skill);
        this.gameManager.gameDom.appendToElement('.skills-container', skillBox);
        this.uiScene.setupActionButtonInBox(skill, this.uiScene.getUiElement('skills'));
    }

    parseSkillTemplate(skill)
    {
        let skillTemplate = this.uiScene.cache.html.get('skillBox');
        return this.gameManager.gameEngine.parseTemplate(skillTemplate, {
            key: skill,
            // @TODO - BETA.17: get all the required skill data on the client, from the label to the delay time counter.
            skillName: skill
        });
    }

}

module.exports.SkillsUi = SkillsUi;
