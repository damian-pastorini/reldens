/**
 *
 * Reldens - Test Firebase Verify ID Token Route
 *
 * Tests the Firebase server verify ID token route: with the Firebase feature disabled it answers isSuccess false
 * without verifying, enabled it answers the verifier result for the request ID token and user, and a verifier error
 * answers isSuccess false.
 *
 */

const { BaseTest } = require('./base-test');
const { FirebasePlugin } = require('../lib/firebase/server/plugin');
const { FirebaseConst } = require('../lib/firebase/constants');

class TestFirebaseVerifyIdTokenRoute extends BaseTest
{

    async requestVerify(isEnabled, verify)
    {
        let verifyCalls = [];
        let plugin = Object.assign(Object.create(FirebasePlugin.prototype), {
            isEnabled,
            idTokenVerifier: {verify: async (idToken, uid) => verifyCalls.push([idToken, uid]) && verify()}
        });
        let routes = {};
        plugin.declareVerifyIdTokenRequestHandler({post: (path, handler) => Object.assign(routes, {[path]: handler})});
        let answers = [];
        await routes[FirebaseConst.ROUTE_PATHS.VERIFY_ID_TOKEN](
            {body: {idToken: 'id-token', uid: 'firebase-uid'}},
            {json: (answer) => answers.push(answer)}
        );
        return {answers, verifyCalls};
    }

    async testTheVerifyRouteAnswersByTheFeatureAndTheVerifier()
    {
        await this.test('the verify route answers false when disabled or the verifier fails and the verifier result when enabled', async () => {
            let verifyError = new Error('Identity Toolkit error');
            this.assert.deepStrictEqual(
                [
                    await this.requestVerify(false, async () => true),
                    await this.requestVerify(true, async () => true),
                    await this.requestVerify(true, async () => {
                        throw verifyError;
                    })
                ],
                [
                    {answers: [{isSuccess: false}], verifyCalls: []},
                    {answers: [{isSuccess: true}], verifyCalls: [['id-token', 'firebase-uid']]},
                    {answers: [{isSuccess: false}], verifyCalls: [['id-token', 'firebase-uid']]}
                ]
            );
        });
    }

}

module.exports.TestFirebaseVerifyIdTokenRoute = TestFirebaseVerifyIdTokenRoute;
