/**
 *
 * Reldens - FirebaseIdTokenVerifier
 *
 * Verifies the Firebase ID tokens through the Identity Toolkit accounts lookup endpoint and keeps the verified tokens
 * in memory by Firebase user ID. The login data flagged as Firebase login is only accepted with a verified token, and
 * the password used by the login and registration flow is an HMAC of the verified user ID signed with the server
 * secret, so the Firebase user ID alone does not grant access through the regular password form.
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
        /** @type {string} */
        this.passwordSecret = sc.get(
            props,
            'passwordSecret',
            process.env.RELDENS_SIGNED_TOKENS_SECRET || process.env.RELDENS_ADMIN_SECRET || ''
        );
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
        this.verifiedUsers.set(uid, {
            idToken,
            email: sc.get(firebaseUser, 'email', ''),
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
            return this.rejectLogin(userData);
        }
        if(verifiedUser.expiresAt <= sc.getTime()){
            this.verifiedUsers.delete(firebaseUid);
            return this.rejectLogin(userData);
        }
        if(!Encryptor.constantTimeCompare(sc.get(userData, 'firebaseIdToken', ''), verifiedUser.idToken)){
            return this.rejectLogin(userData);
        }
        let firebasePassword = Encryptor.generateHMAC(firebaseUid, this.passwordSecret);
        if(!firebasePassword){
            Logger.critical('The Firebase login password could not be generated, check the signed tokens secret.');
            return this.rejectLogin(userData);
        }
        userData.password = firebasePassword;
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
