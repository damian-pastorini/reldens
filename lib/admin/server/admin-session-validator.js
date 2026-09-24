/**
 *
 * Reldens - AdminSessionValidator
 *
 * Validates the administration panel session on every authenticated request against the current user row instead of
 * the login time snapshot: a deleted, banned, demoted or password changed user loses the session, then the router
 * role black list is applied.
 *
 */

const { GameConst } = require('../../game/constants');
const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 *
 * @typedef {Object} AdminSessionValidatorProps
 * @property {BaseDriver} usersRepository
 * @property {number} adminRoleId
 */
class AdminSessionValidator
{

    /**
     * @param {AdminSessionValidatorProps} props
     */
    constructor(props)
    {
        /** @type {BaseDriver} */
        this.usersRepository = props.usersRepository;
        /** @type {number} */
        this.adminRoleId = Number(sc.get(props, 'adminRoleId', 0));
    }

    /**
     * @param {Object} event
     * @param {AdminManager} adminManager
     * @returns {Promise<void>}
     */
    async validate(event, adminManager)
    {
        let loginPath = adminManager.router.rootPath+adminManager.router.loginPath;
        try {
            let sessionUser = sc.get(event.req.session, 'user', false);
            if(!sessionUser){
                return event.res.redirect(loginPath);
            }
            let user = await this.usersRepository.loadById(sessionUser.id);
            if(!this.isValidSessionUser(user, sessionUser)){
                Logger.warning('Administration session invalidated.', {userId: sessionUser.id});
                return event.req.session.destroy(() => event.res.redirect(loginPath));
            }
            let userBlackList = sc.get(adminManager.router.blackList, user.role_id, []);
            if(-1 !== userBlackList.indexOf(event.req.path)){
                return event.res.redirect(String(sc.get(event.req.headers, 'referer', '')) || loginPath);
            }
            return event.next();
        } catch (error) {
            Logger.error('Administration session validation error: '+error.message);
            return event.res.redirect(loginPath);
        }
    }

    /**
     * @param {Object|false} user
     * @param {Object} sessionUser
     * @returns {boolean}
     */
    isValidSessionUser(user, sessionUser)
    {
        if(!user){
            return false;
        }
        if(GameConst.BANNED_USER_STATUS === String(user.status)){
            return false;
        }
        if(this.adminRoleId !== Number(user.role_id)){
            return false;
        }
        return Encryptor.constantTimeCompare(
            String(sc.get(sessionUser, 'sessionRevision', '')),
            Encryptor.hashData(user.password)
        );
    }

}

module.exports.AdminSessionValidator = AdminSessionValidator;
