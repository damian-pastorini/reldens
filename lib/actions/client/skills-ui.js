/**
 *
 * Reldens - SkillsUi
 *
 * This class will handle the skills UI and assign all the related events and actions.
 *
 */

class SkillsUi
{

    constructor(uiSceneManager)
    {
        this.uiSceneManager = uiSceneManager;
        this.defaultAction = this.uiSceneManager.configManager.get('client/ui/controls/defaultActionKey');
    }

    createUi()
    {
        this.appendToUiContainer('#ui-player-extras', 'skillsClassPath');
        this.appendToUiContainer('#ui-player-extras', 'skillsLevel');
        this.appendToUiContainer('#ui-player-extras', 'skillsExperience');
        this.createUiBox('skills', 7);
    }

    appendSkills(skills)
    {
        // @TODO - BETA - Implement skills groups.
        let skillsList = Object.keys(skills);
        // if the default action is a skill we won't show a duplicated box:
        if(0 === skillsList.length){
            return false;
        }
        for(let i of skillsList){
            let skill = skills[i];
            if(skill === this.defaultAction){
                continue;
            }
            this.createSkillBox(skill);
        }
    }

    appendToUiContainer(containerSelector, skillsUiTemplate)
    {
        let messageTemplate = this.uiSceneManager.uiSceneDriver.getCacheHtml(skillsUiTemplate);
        this.uiSceneManager.gameDom.appendToElement(containerSelector, messageTemplate);
    }

    createUiBox(codeName, depth)
    {
        let {uiX, uiY} = this.uiSceneManager.getUiConfig(codeName);
        let generatedUi = this.uiSceneManager.uiSceneDriver.addDomCreateFromCache(uiX, uiY, {the: codeName});
        generatedUi.setDepth(depth);
        this.uiSceneManager.uiSceneDriver.setUiElement(codeName, generatedUi);
    }

    createSkillBox(skill)
    {
        let skillBox = this.parseSkillTemplate(skill);
        this.uiSceneManager.gameDom.appendToElement('.skills-container', skillBox);
        this.uiSceneManager.setupActionButtonInBox(skill, this.uiSceneManager.uiSceneDriver.getUiElement('skills'));
    }

    parseSkillTemplate(skill)
    {
        let skillTemplate = this.uiSceneManager.uiSceneDriver.getCacheHtml('skillBox');
        return this.uiSceneManager.parseTemplateCallback(skillTemplate, {
            key: skill,
            // @TODO - BETA - Get all the required skill data on the client, from the label to the delay time counter.
            skillName: skill
        });
    }

}

module.exports.SkillsUi = SkillsUi;
