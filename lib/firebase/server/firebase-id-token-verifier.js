/**
 *
 * Reldens - FirebaseIdTokenVerifier
 *
 * Verifies the Firebase ID tokens through the Identity Toolkit accounts lookup endpoint and keeps the verified tokens
 * in memory by Firebase user ID. The login data flagged as Firebase login is only accepted with a verified token, and
 * the verified user ID is set as the password used by the login and registration flow.
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
        this.verifiedUsers.set(uid, {idToken, email: sc.get(firebaseUser, 'email', '')});
        return true;
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
        let verifiedUser = this.verifiedUsers.get(sc.get(userData, 'firebaseUid', ''));
        if(!verifiedUser){
            return this.rejectLogin(userData);
        }
        if(!Encryptor.constantTimeCompare(sc.get(userData, 'firebaseIdToken', ''), verifiedUser.idToken)){
            return this.rejectLogin(userData);
        }
        userData.password = userData.firebaseUid;
        userData.email = verifiedUser.email;
        return true;
    }

    /**
     * @param {Object<string, any>} userData
     * @returns {boolean}
     */
    rejectLogin(userData)
    {
        Logger.warning('Rejected Firebase login without a verified ID token.');
        userData.username = '';
        return false;
    }

}

module.exports.FirebaseIdTokenVerifier = FirebaseIdTokenVerifier;
