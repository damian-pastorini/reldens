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
    DEFAULT_PROVIDERS_KEYS: ['google', 'facebook', 'github']
};
