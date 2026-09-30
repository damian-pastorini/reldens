/**
 *
 * Reldens - FirebaseIdTokenVerifier
 *
 * Verifies the Firebase ID tokens through the Identity Toolkit accounts lookup endpoint and keeps the verified tokens
 * in memory by Firebase user ID. The login data flagged as Firebase login is only accepted with a verified token and a
 * verified email, the account is then validated by its username and that verified email, and the password sent to the
 * login and registration flow is a random value, so no Firebase value grants access through the regular password form.
 *
 */

const { FirebaseConst } = require('../constants');
const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} FirebaseIdTokenVerifierProps
 * @property {string} apiKey
 * @property {Function} [fetchFunction]
 *
 * @typedef {Object} VerifiedFirebaseUser
 * @property {string} idToken
 * @property {string} email
 * @property {boolean} emailVerified
 * @property {number} expiresAt
 */
class FirebaseIdTokenVerifier
{

    /**
     * @param {FirebaseIdTokenVerifierProps} props
     */
    constructor(props)
    {
        /** @type {string} */
        this.apiKey = sc.get(props, 'apiKey', '');
        /** @type {Function} */
        this.fetchFunction = sc.get(props, 'fetchFunction', fetch);
        /** @type {Map<string, VerifiedFirebaseUser>} */
        this.verifiedUsers = new Map();
        /** @type {number} */
        this.verifiedUsersMax = Number(sc.get(props, 'verifiedUsersMax', FirebaseConst.VERIFIED_USERS_MAX));
        /** @type {WeakSet<Object<string, any>>} */
        this.verifiedLogins = new WeakSet();
    }

    /**
     * @param {string} idToken
     * @param {string} uid
     * @returns {Promise<boolean>}
     */
    async verify(idToken, uid)
    {
        let firebaseUser = await this.fetchFirebaseUser(idToken);
        if(!firebaseUser){
            return false;
        }
        if(uid !== sc.get(firebaseUser, 'localId', '')){
            Logger.warning('Firebase ID token user ID does not match.');
            return false;
        }
        this.removeExpiredVerifiedUsers(sc.getTime());
        this.verifiedUsers.delete(uid);
        if(this.verifiedUsersMax <= this.verifiedUsers.size){
            this.verifiedUsers.delete(this.verifiedUsers.keys().next().value);
        }
        this.verifiedUsers.set(uid, {
            idToken,
            email: sc.get(firebaseUser, 'email', ''),
            emailVerified: true === sc.get(firebaseUser, 'emailVerified', false),
            expiresAt: sc.getTime()+FirebaseConst.VERIFIED_TOKEN_EXPIRATION
        });
        return true;
    }

    /**
     * @param {number} now
     */
    removeExpiredVerifiedUsers(now)
    {
        for(let verifiedUserId of this.verifiedUsers.keys()){
            if(this.verifiedUsers.get(verifiedUserId).expiresAt > now){
                continue;
            }
            this.verifiedUsers.delete(verifiedUserId);
        }
    }

    /**
     * @param {string} idToken
     * @returns {Promise<Object|false>}
     */
    async fetchFirebaseUser(idToken)
    {
        try {
            let response = await this.fetchFunction(
                FirebaseConst.IDENTITY_TOOLKIT_LOOKUP_URL+encodeURIComponent(this.apiKey),
                {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: sc.toJsonString({idToken})
                }
            );
            let responseData = await response.json();
            let users = sc.get(responseData, 'users', []);
            if(!sc.isNotEmptyArray(users)){
                Logger.warning('Invalid Firebase ID token.', sc.get(responseData, 'error', ''));
                return false;
            }
            return [...users].shift();
        } catch(error) {
            Logger.error('Firebase ID token lookup error.', error.message);
            return false;
        }
    }

    /**
     * @param {Object<string, any>} userData
     * @returns {boolean}
     */
    applyVerifiedLogin(userData)
    {
        if(!sc.get(userData, 'isFirebaseLogin', false)){
            return false;
        }
        let firebaseUid = sc.get(userData, 'firebaseUid', '');
        let verifiedUser = this.verifiedUsers.get(firebaseUid);
        if(!verifiedUser){
            return this.rejectLogin(userData, 'the ID token was not verified');
        }
        if(verifiedUser.expiresAt <= sc.getTime()){
            this.verifiedUsers.delete(firebaseUid);
            return this.rejectLogin(userData, 'the ID token verification expired');
        }
        if(!Encryptor.constantTimeCompare(sc.get(userData, 'firebaseIdToken', ''), verifiedUser.idToken)){
            return this.rejectLogin(userData, 'the ID token does not match the verified one');
        }
        if(!verifiedUser.emailVerified){
            return this.rejectLogin(userData, 'the Firebase account email is not verified');
        }
        userData.password = Encryptor.generateSecureToken(FirebaseConst.LOGIN_PASSWORD_BYTES);
        userData.email = verifiedUser.email;
        this.verifiedLogins.add(userData);
        return true;
    }

    /**
     * @param {Object<string, any>} passwordValidation
     * @returns {boolean}
     */
    validateVerifiedEmailLogin(passwordValidation)
    {
        if(!this.verifiedLogins.has(passwordValidation.userData)){
            Logger.debug('Password validation fallback skipped, the login is not a verified Firebase login.');
            return false;
        }
        let verifiedEmail = String(passwordValidation.userData.email).toLowerCase();
        if(String(sc.get(passwordValidation.user, 'email', '')).toLowerCase() !== verifiedEmail){
            Logger.warning('Rejected Firebase login, the username belongs to another email.', {
                user: passwordValidation.user.username
            });
            return false;
        }
        passwordValidation.isValid = true;
        Logger.info('Firebase login validated by the username and the verified email.', {
            user: passwordValidation.user.username
        });
        return true;
    }

    /**
     * @param {Object<string, any>} userData
     * @param {string} reason
     * @returns {boolean}
     */
    rejectLogin(userData, reason)
    {
        Logger.warning('Rejected Firebase login, '+reason+'.');
        userData.username = '';
        return false;
    }

}

module.exports.FirebaseIdTokenVerifier = FirebaseIdTokenVerifier;
