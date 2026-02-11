/**
 *
 * Reldens - TermsAndConditionsHandler
 *
 * Manages the terms and conditions modal display. Fetches terms content from the server, handles
 * language-specific content, and manages the terms dialog open/close behavior.
 *
 */

const { GameConst } = require('../../constants');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../game-manager').GameManager} GameManager
 */
class TermsAndConditionsHandler
{

    /**
     * @param {GameManager} gameManager
     */
    constructor(gameManager)
    {
        this.gameManager = gameManager;
        this.gameDom = this.gameManager.gameDom;
        this.linkContainer = this.gameManager.gameDom.getElement(GameConst.SELECTORS.TERMS.LINK_CONTAINER);
        this.overlay = null;
    }

    createOverlay()
    {
        if(this.overlay){
            return this.overlay;
        }
        this.overlay = this.gameDom.getDocument().createElement('div');
        this.overlay.className = 'modal-overlay';
        this.gameDom.getDocument().body.appendChild(this.overlay);
        return this.overlay;
    }

    showOverlay()
    {
        if(!this.overlay){
            this.createOverlay();
        }
        this.overlay.classList.add('active');
    }

    hideOverlay()
    {
        if(!this.overlay){
            return;
        }
        this.overlay.classList.remove('active');
    }

    /**
     * @returns {boolean}
     */
    activateTermsAndConditions()
    {
        if(!this.linkContainer){
            return false;
        }
        let termsAndConditionsUrl = this.gameManager.appServerUrl+GameConst.ROUTE_PATHS.TERMS_AND_CONDITIONS;
        let params = (new URL(this.gameDom.getDocument().location)).searchParams;
        let language = params.get('lang', '');
        if('' !== language){
            termsAndConditionsUrl+= '?lang='+language;
        }
        this.gameDom.getJSON(termsAndConditionsUrl, (err, response) => {
            if(!response.body || !response.heading || !response.checkboxLabel || !response.link){
                return false;
            }
            if(err){
                Logger.info('Registration error.', err);
                return false;
            }
            let selectors = GameConst.SELECTORS.TERMS;
            this.gameDom.updateContent(selectors.HEADING, response.heading);
            this.gameDom.updateContent(selectors.BODY, response.body);
            this.gameDom.updateContent(selectors.ACCEPT_LABEL, response.checkboxLabel);
            this.gameDom.updateContent(selectors.LINK, response.link);
            let termsLink = this.gameDom.getElement(selectors.LINK);
            let termsContainer = this.gameDom.getElement(selectors.BOX);
            termsLink?.addEventListener('click', (e) => {
                e.preventDefault();
                this.showOverlay();
                termsContainer?.classList.remove(GameConst.CLASSES.HIDDEN);
            });
            let closeButtons = this.gameDom.getElements(selectors.CLOSE);
            for(let closeButton of closeButtons){
                closeButton.addEventListener('click', () => {
                    this.hideOverlay();
                    termsContainer?.classList.add(GameConst.CLASSES.HIDDEN);
                });
            }
            this.createOverlay();
            let register = this.gameDom.getElement(GameConst.SELECTORS.REGISTER_FORM);
            if(register){
                let errorBlock = this.gameDom.getElement(GameConst.SELECTORS.RESPONSE_ERROR, register);
                let acceptTermsCheckbox = this.gameDom.getElement(selectors.ACCEPT);
                acceptTermsCheckbox.addEventListener('click', () => {
                    if(acceptTermsCheckbox.checked){
                        errorBlock.innerHTML = '';
                    }
                });
                this.gameDom.getElement(selectors.ACCEPT_LABEL).addEventListener('click', () => {
                    if(acceptTermsCheckbox.checked){
                        errorBlock.innerHTML = '';
                    }
                });
            }
            this.linkContainer?.classList.remove(GameConst.CLASSES.HIDDEN);
        });
        return true;
    }

}

module.exports.TermsAndConditionsHandler = TermsAndConditionsHandler;
