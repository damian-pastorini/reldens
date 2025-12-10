/**
 *
 * Reldens - GuestFormHandler
 *
 * Manages the guest login form for anonymous player access. Handles guest form submission,
 * generates random guest usernames, validates guest configuration, and initiates the game
 * session for guest players.
 *
 */

const { ErrorsBlockHandler } = require('./errors-block-handler');
const { GameConst } = require('../../constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../game-manager').GameManager} GameManager
 */
class GuestFormHandler
{

    /**
     * @param {GameManager} gameManager
     */
    constructor(gameManager)
    {
        this.gameManager = gameManager;
        this.gameDom = this.gameManager.gameDom;
        this.form = gameManager.gameDom.getElement(GameConst.SELECTORS.GUEST_FORM);
    }

    /**
     * @returns {boolean}
     */
    activateGuest()
    {
        if(!this.form){
            return false;
        }
        let availableGuestRooms = this.gameManager.config.getWithoutLogs(
            'client/rooms/selection/availableRooms/registrationGuest',
            {}
        );
        if(
            !this.gameManager.config.get('client/general/users/allowGuest')
            || 0 === Object.keys(availableGuestRooms).length
        ){
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
            let randomGuestName = 'guest-'+sc.randomChars(12);
            let userName = this.gameManager.config.getWithoutLogs('client/general/users/allowGuestUserName', false)
                ? this.gameDom.getElement(selectors.GUEST.USERNAME).value
                : randomGuestName;
            let formData = {
                formId: this.form.id,
                username: userName,
                password: userName,
                rePassword: userName,
                isGuest: true
            };
            this.gameManager.startGame(formData, true);
        });
        return true;
    }

}

module.exports.GuestFormHandler = GuestFormHandler;
