/**
 *
 * Reldens - SkillsUi
 *
 * Manages the user interface for skills display and interaction.
 *
 */

const { ActionsConst } = require('../constants');

/**
 * @typedef {import('phaser').Scene} PhaserScene
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class SkillsUi
{

    /**
     * @param {PhaserScene} uiScene
     */
    constructor(uiScene)
    {
        /** @type {PhaserScene} */
        this.uiScene = uiScene;
        /** @type {GameManager} */
        this.gameManager = this.uiScene.gameManager;
        /** @type {string|null} */
        this.defaultAction = this.gameManager.config.get('client/ui/controls/defaultActionKey');
    }

    createUi()
    {
        let selector = ActionsConst.SELECTORS.UI_PLAYER_EXTRAS;
        this.appendToUiContainer(selector, ActionsConst.TEMPLATES.SKILLS_CLASS_PATH);
        this.appendToUiContainer(selector, ActionsConst.TEMPLATES.SKILLS_LEVEL);
        this.appendToUiContainer(selector, ActionsConst.TEMPLATES.SKILLS_EXPERIENCE, {
            experienceLabel: this.gameManager.services.translator.t(ActionsConst.SNIPPETS.EXPERIENCE_LABEL)
        });
        this.createUiBox(ActionsConst.TEMPLATES.SKILLS, 7);
    }

    /**
     * @param {Object<string, any>} skills
     * @returns {boolean|void}
     */
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

    /**
     * @param {string} containerSelector
     * @param {string} skillsUiTemplate
     * @param {Object<string, any>} [snippets]
     */
    appendToUiContainer(containerSelector, skillsUiTemplate, snippets = {})
    {
        let messageTemplate = this.uiScene.cache.html.get(skillsUiTemplate);
        let snippetsKeys = Object.keys(snippets);
        if(0 < snippetsKeys.length){
            messageTemplate = this.gameManager.gameEngine.parseTemplate(messageTemplate, snippets);
        }
        this.gameManager.gameDom.appendToElement(containerSelector, messageTemplate);
    }

    /**
     * @param {string} codeName
     * @param {number} depth
     */
    createUiBox(codeName, depth)
    {
        // @TODO - BETA - Replace by UserInterface.
        let {uiX, uiY} = this.uiScene.getUiConfig(codeName);
        let generatedUi = this.uiScene.add.dom(uiX, uiY).createFromCache(codeName);
        generatedUi.setDepth(depth);
        this.uiScene.elementsUi[codeName] = generatedUi;
    }

    /**
     * @param {string} skill
     */
    createSkillBox(skill)
    {
        let skillBox = this.parseSkillTemplate(skill);
        this.gameManager.gameDom.appendToElement(ActionsConst.SELECTORS.SKILLS_CONTAINER, skillBox);
        this.uiScene.setupActionButtonInBox(skill, this.uiScene.getUiElement(ActionsConst.TEMPLATES.SKILLS));
    }

    /**
     * @param {string} skill
     * @returns {string}
     */
    parseSkillTemplate(skill)
    {
        // @TODO - BETA - Get all the required skill data on the client, from the label to the delay time counter.
        return this.gameManager.gameEngine.parseTemplate(
            this.uiScene.cache.html.get(ActionsConst.TEMPLATES.SKILL_BOX),
            {key: skill, skillName: skill}
        );
    }

}

module.exports.SkillsUi = SkillsUi;
