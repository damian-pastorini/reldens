/**
 *
 * Reldens - SkillsUi
 *
 * This class will handle the skills UI and assign all the related events and actions.
 *
 */

// const { Logger, sc } = require('@reldens/utils');

class SkillsUi
{

    constructor(uiScene)
    {
        this.uiScene = uiScene;
        this.gameManager = this.uiScene.gameManager;
    }

    createUi()
    {
        this.appendToUiContainer('#ui-player-extras', 'uiClassPath');
        this.appendToUiContainer('#ui-player-extras', 'uiLevel');
        this.appendToUiContainer('#ui-player-extras', 'uiExperience');
        // @TODO - BETA.16 - R16-1a: make skills buttons on client side load dynamically.
        // this.create('skills', 2);
        /*
        let skillsPanel = this.uiScene.skillsPanel.getChildByProperty('id', 'skills-list');
        if(!skillsPanel){
            Logger.error(['Skills UI not found.', skillsPanel]);
            return false;
        }
        let skillsManager = this.uiScene.gameManager.skills.manager;
        // first time load and then we listen the events to get the updates:
        if(Object.keys(skillsManager.skills).length){
            for(let i of Object.keys(manager.skills)){
                let item = manager.skills[i];
                this.displaySkill(skill, this.uiScene, skillsPanel, i);
            }
        }
        // listen for skills events:
        this.listenSkillsEvents(this.uiScene, skillsPanel);
        */
    }

    appendToUiContainer(containerSelector, skillsUiTemplate)
    {
        let messageTemplate = this.uiScene.cache.html.get(skillsUiTemplate);
        this.gameManager.gameDom.appendToElement(containerSelector, messageTemplate);
    }

    create(codeName, depth)
    {
        let {uiX, uiY} = this.uiScene.getUiConfig(codeName);
        let generatedUi = this.uiScene.add.dom(uiX, uiY).createFromCache(codeName);
        generatedUi.setDepth(depth);
        this.uiScene.elementsUi[codeName] = generatedUi;
    }

    updateContainer()
    {
        /*
        let box = this.uiScene[uiName].getChildByProperty('id', 'skills-list');
        dialogBox.innerHTML = this.uiScene.gameManager.gameEngine.parseTemplate(messageTemplate, {
            title: this.initialTitle,
            content: this.initialContent
        });
        */
    }

    /*
    listenSkillsEvents(uiScene, skillsPanel)
    {
        let gameManager = uiScene.gameManager;
        let masterKey = 'p'+gameManager.skills.manager.getOwnerId();
        gameManager.skills.manager.listenEvent(ItemsEvents.ADD_ITEM, (skills, skill) => {
            let output = this.createItemBox(skill, gameManager, uiScene);
            gameManager.gameDom.appendToElement('#'+InventoryConst.INVENTORY_ITEMS, output);
            this.setupButtonsActions(skillsPanel, skill.id, skill, uiScene);
        }, 'addItemPack', masterKey);
        gameManager.skills.manager.listenEvent(ItemsEvents.SET_ITEMS, (props) => {
            skillsPanel.innerHTML = '';
            for(let i of Object.keys(props.skills)){
                let skill = props.skills[i];
                this.displayItem(skill, uiScene, equipmentPanel, skillsPanel, i);
            }
        }, 'setItemsPack', masterKey);
        // eslint-disable-next-line no-unused-vars
        gameManager.skills.manager.listenEvent(ItemsEvents.MODIFY_ITEM_QTY, (skill, skills, op, key, qty) => {
            let qtyBox = uiScene.getUiElement('inventory').getChildByID('skill-qty-'+skill.id);
            qtyBox.innerHTML = skill.qty;
        }, 'modifyItemQtyPack', masterKey);
    }
    */

}

module.exports.SkillsUi = SkillsUi;
