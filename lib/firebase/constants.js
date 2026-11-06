/**
 *
 * Reldens - FirebaseConst
 *
 */

module.exports.FirebaseConst = {
    ROUTE_PATHS: {
        VERIFY_ID_TOKEN: '/reldens-firebase-verify-id-token'
    },
    IDENTITY_TOOLKIT_LOOKUP_URL: 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=',
    VERIFIED_TOKEN_EXPIRATION: 3600000,
    VERIFIED_USERS_MAX: 10000,
    PENDING_LOGINS_PER_USER_MAX: 10,
    PENDING_LOGIN_EXPIRATION: 60000,
    LOGIN_PASSWORD_BYTES: 32,
    DEFAULT_PROVIDERS_KEYS: ['google', 'facebook', 'github']
};
