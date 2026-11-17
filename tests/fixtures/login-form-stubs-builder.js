/**
 *
 * Reldens - LoginFormStubsBuilder
 *
 * Builds the stubs the login, guest and registration form handlers use: a form recording its listeners with its
 * browser validation result, response error block, loading container, first input and fields, the page elements read
 * by selector and a game manager recording every game start and holding the submitted form flag the real GameManager
 * holds.
 *
 */

const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');

class LoginFormStubsBuilder
{

    /**
     * @param {Object} [props]
     * @returns {Object}
     */
    static createElement(props = {})
    {
        let element = Object.assign({value: '', checked: false, innerHTML: '', classes: [], listeners: {}}, props);
        element.classList = {
            add: (className) => element.classes.push(className),
            remove: (className) => element.classes = element.classes.filter(current => className !== current),
            contains: (className) => -1 !== element.classes.indexOf(className)
        };
        element.addEventListener = (eventName, callback) => element.listeners[eventName] = callback;
        return element;
    }

    /**
     * @param {string} formId
     * @param {Object<string, Object>} [fields]
     * @returns {Object}
     */
    static createForm(formId, fields = {})
    {
        let form = LoginFormStubsBuilder.createElement({id: formId, isValid: true});
        let formElements = Object.assign({
            [GameConst.SELECTORS.RESPONSE_ERROR]: LoginFormStubsBuilder.createElement(),
            [GameConst.SELECTORS.LOADING_CONTAINER]: LoginFormStubsBuilder.createElement(),
            [GameConst.SELECTORS.INPUT]: LoginFormStubsBuilder.createElement()
        }, fields);
        form.checkValidity = () => form.isValid;
        form.querySelector = (selector) => sc.get(formElements, selector, null);
        form.submit = () => form.listeners.submit({preventDefault: () => true});
        return form;
    }

    /**
     * @param {Object<string, Object>} pageElements
     * @param {Object<string, any>} [configValues]
     * @returns {Object}
     */
    static createGameManager(pageElements, configValues = {})
    {
        let gameManager = {submitedForm: false, startedGames: []};
        gameManager.gameDom = {getElement: (selector) => sc.get(pageElements, selector, null)};
        gameManager.config = {
            get: (path) => sc.get(configValues, path, true),
            getWithoutLogs: (path, defaultValue) => sc.get(configValues, path, defaultValue)
        };
        gameManager.startGame = (formData, isNewUser) => gameManager.startedGames.push({formData, isNewUser});
        return gameManager;
    }

}

module.exports.LoginFormStubsBuilder = LoginFormStubsBuilder;
