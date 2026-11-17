/**
 *
 * Reldens - Firebase E2E State
 *
 * Server side e2e endpoints for the Firebase login: enables the Firebase plugin with a test configuration and a token
 * verifier whose accounts lookup answers from the users given by the test (no request reaches Google), and expires a
 * verified token. The reset restores the plugin state before every test.
 *
 */

const { FirebaseIdTokenVerifier } = require('../../../lib/firebase/server/firebase-id-token-verifier');
const { sc } = require('@reldens/utils');

class FirebaseE2eState
{

    static E2E_CONFIG = {
        apiKey: 'e2e-firebase-api-key',
        authDomain: 'e2e-firebase.test',
        projectId: 'e2e-firebase',
        appId: '1:000000000000:web:e2e'
    };
    static defaults = {};

    static fetchPlugin(serverManager)
    {
        return serverManager.featuresManager.featuresList.firebase.package;
    }

    static createLookupResponse(firebaseUsers, lookupOptions)
    {
        let idToken = sc.get(sc.parseJson(lookupOptions.body), 'idToken', '');
        return {json: async () => ({users: sc.hasOwn(firebaseUsers, idToken) ? [firebaseUsers[idToken]] : []})};
    }

    static enable(serverManager, firebaseUsers)
    {
        Object.assign(FirebaseE2eState.fetchPlugin(serverManager), {
            isEnabled: true,
            firebaseMappedConfig: FirebaseE2eState.E2E_CONFIG,
            idTokenVerifier: new FirebaseIdTokenVerifier({
                apiKey: FirebaseE2eState.E2E_CONFIG.apiKey,
                fetchFunction: async (lookupUrl, lookupOptions) => FirebaseE2eState.createLookupResponse(
                    firebaseUsers,
                    lookupOptions
                )
            })
        });
    }

    static resetAll(serverManager)
    {
        Object.assign(FirebaseE2eState.fetchPlugin(serverManager), FirebaseE2eState.defaults);
    }

    static registerEndpoints(serverManager)
    {
        let plugin = FirebaseE2eState.fetchPlugin(serverManager);
        FirebaseE2eState.defaults = {
            isEnabled: plugin.isEnabled,
            firebaseMappedConfig: plugin.firebaseMappedConfig,
            idTokenVerifier: plugin.idTokenVerifier
        };
        let app = serverManager.app;
        app.post('/api/e2e/firebase/enable', (request, response) => {
            FirebaseE2eState.enable(serverManager, sc.get(request.body, 'users', {}));
            response.json({ok: true});
        });
        app.post('/api/e2e/firebase/disable', (request, response) => {
            plugin.isEnabled = false;
            response.json({ok: true});
        });
        app.post('/api/e2e/firebase/expire', (request, response) => {
            plugin.idTokenVerifier.verifiedUsers.get(sc.get(request.body, 'uid', '')).expiresAt = 0;
            response.json({ok: true});
        });
    }

}

module.exports.FirebaseE2eState = FirebaseE2eState;
