/**
 *
 * Reldens - GuestFormHandler
 *
 */

const { ErrorsBlockHandler } = require('./errors-block-handler');
const { GameConst } = require('../../constants');

class GuestFormHandler
{

    constructor(gameManager)
    {
        this.gameManager = gameManager;
        this.gameDom = this.gameManager.gameDom;
        this.form = gameManager.gameDom.getElement(GameConst.SELECTORS.GUEST_FORM);
    }

    activateGuest()
    {
        if(!this.form){
            return false;
        }
        if(!this.gameManager.config.get('client/general/users/allowGuest')){
            this.form.classList.add('hidden');
            return true;
        }
        ErrorsBlockHandler.reset(this.form);
        let selectors = GameConst.SELECTORS;
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if(!this.form.checkValidity()){
                return false;
            }
            this.form.querySelector(selectors.LOADING_CONTAINER).classList.remove(GameConst.CLASSES.HIDDEN);
            let userName = this.gameDom.getElement(selectors.GUEST.USERNAME).value;
            let formData = {
                formId: this.form.id,
                username: userName,
                password: userName,
                rePassword: userName,
                isGuest: true
            };
            this.gameManager.startGame(formData, true);
        });
    }

}

module.exports.GuestFormHandler = GuestFormHandler;
