/**
 *
 * Reldens - GameOverReviveMessageBuilder
 *
 * Builds the client game over revive message over the real game over template file, rendered with mustache as the game
 * engine does, and the real English death snippets: the game over content element keeps the rendered content, every
 * button rendered in it can be found and records its click handlers, the room requests and the fired events are
 * recorded. It also reads the rendered buttons and the text of every rendered element by its class.
 *
 */

const { GameOverReviveMessage } = require('../../lib/actions/client/game-over-revive-message');
const { Translator } = require('../../lib/snippets/translator');
const { TranslationsMapper } = require('../../lib/snippets/client/translations-mapper');
const { SnippetsConst } = require('../../lib/snippets/constants');
const { ActionsConst } = require('../../lib/actions/constants');
const ActionsTranslations = require('../../lib/actions/client/snippets/en_US');
const { FileHandler } = require('@reldens/server-utils');
const TemplateEngineRender = require('mustache');

class GameOverReviveMessageBuilder
{

    constructor()
    {
        this.gameOverTemplate = FileHandler.readFile(FileHandler.joinPaths(
            process.cwd(),
            'theme',
            'default',
            'assets',
            'features',
            'skills',
            'templates',
            'ui-game-over.html'
        ));
        this.translator = new Translator({
            snippets: {[SnippetsConst.DEFAULT_LOCALE]: TranslationsMapper.fromObject(ActionsTranslations)}
        });
        this.deathSnippets = ActionsTranslations.actions.death;
        this.selectors = ActionsConst.DEATH.SELECTORS;
        this.buttonSelectors = [
            this.selectors.RESURRECTION_AD_BUTTON,
            this.selectors.REVIVE_BUTTON,
            this.selectors.RESTORATION_ITEM_USE_BUTTON,
            this.selectors.RESTORATION_ITEM_KEEP_BUTTON
        ];
        this.textClasses = [
            'game-over-title',
            'game-over-wait',
            'game-over-revive-message',
            ...this.buttonSelectors.map(buttonSelector => buttonSelector.split('.').pop())
        ];
    }

    /**
     * @param {boolean} [templateLoaded]
     * @param {boolean} [contentFound]
     * @returns {Object}
     */
    createSetup(templateLoaded = true, contentFound = true)
    {
        let setup = {emittedEvents: [], clickHandlers: [], sentRequests: [], contentElement: {innerHTML: ''}};
        let gameDom = {
            updateContent: (selector, content) => {
                if(!contentFound || this.selectors.GAME_OVER_CONTENT !== selector){
                    return false;
                }
                setup.contentElement.innerHTML = content;
                return setup.contentElement;
            },
            getElement: (selector) => {
                if(-1 === this.shownButtons(setup).indexOf(selector)){
                    return null;
                }
                return {
                    addEventListener: (eventName, handler) => setup.clickHandlers.push({selector, eventName, handler})
                };
            }
        };
        let htmlCache = {
            get: (templateKey) => {
                if(!templateLoaded || ActionsConst.TEMPLATES.GAME_OVER !== templateKey){
                    return false;
                }
                return this.gameOverTemplate;
            }
        };
        setup.reviveMessage = new GameOverReviveMessage({
            gameManager: {
                services: {translator: this.translator},
                gameEngine: {
                    uiScene: {cache: {html: htmlCache}},
                    parseTemplate: (template, view) => TemplateEngineRender.render(template, view)
                },
                gameDom,
                activeRoomEvents: {send: (requestData) => setup.sentRequests.push(requestData)}
            },
            events: {emit: async (eventKey, eventData) => setup.emittedEvents.push({eventKey, eventData})}
        });
        return setup;
    }

    /**
     * @param {Object} setup
     * @returns {Array<string>}
     */
    shownButtons(setup)
    {
        return this.buttonSelectors.filter(
            buttonSelector => -1 !== setup.contentElement.innerHTML.indexOf(
                'class="'+buttonSelector.split('.').pop()+'"'
            )
        );
    }

    /**
     * @param {Object} setup
     * @returns {Object<string, string|boolean>}
     */
    readElementsTexts(setup)
    {
        let elementsTexts = {};
        for(let className of this.textClasses){
            elementsTexts[className] = (
                setup.contentElement.innerHTML.match(new RegExp('class="'+className+'">([^<]*)')) || [false]
            ).pop();
        }
        return elementsTexts;
    }

}

module.exports.GameOverReviveMessageBuilder = GameOverReviveMessageBuilder;
