/**
 *
 * Reldens - Test Firebase Connector
 *
 */

const { BaseTest } = require('./base-test');
const { FirebaseConnector } = require('../lib/firebase/client/connector');
const { FirebaseConst } = require('../lib/firebase/constants');
const { GameConst } = require('../lib/game/constants');
const { AppServerFactory } = require('@reldens/server-utils');
const { EventsManager, sc } = require('@reldens/utils');
const { once } = require('events');

class TestFirebaseConnector extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.firebaseConfig = {
            apiKey: 'test-api-key',
            authDomain: 'reldens-test.firebaseapp.com',
            projectId: 'reldens-test',
            appId: '1:100000000000:web:reldens-test'
        };
        this.verifiedResponse = sc.toJsonString({isSuccess: true});
        this.containerSelector = '#firebase-auth-container';
        this.errorSelector = '#firebase-login .response-error';
        this.usernameSelector = '#firebase-username';
        this.rowSelector = '.firebase-row-container';
        this.loginFormSelector = '#firebase-login';
    }

    createFakeElement(value)
    {
        let classNames = new Set();
        let element = {value, innerHTML: '', textContent: '', type: '', isValid: true, children: [], listeners: {}};
        element.classList = {
            add: className => classNames.add(className),
            remove: className => classNames.delete(className),
            contains: className => classNames.has(className)
        };
        element.addEventListener = (eventName, callback) => {
            element.listeners[eventName] = callback;
        };
        element.appendChild = childElement => element.children.push(childElement);
        element.checkValidity = () => element.isValid;
        element.querySelector = () => null;
        return element;
    }

    createHiddenElement()
    {
        let element = this.createFakeElement('');
        element.classList.add('hidden');
        return element;
    }

    createFakeGameDom(elements, configResponse)
    {
        let gameDom = {requestedUrls: [], fakeWindow: this.createFakeElement('')};
        gameDom.getJSON = (url, callback) => {
            gameDom.requestedUrls.push(url);
            callback(null, configResponse);
        };
        gameDom.getWindow = () => gameDom.fakeWindow;
        gameDom.getElement = selector => sc.get(elements, selector, null);
        gameDom.createElement = (type, id, classNamesList) => {
            let element = this.createFakeElement('');
            element.classNames = classNamesList;
            return element;
        };
        return gameDom;
    }

    createConnector(elements = {}, configResponse = {enabled: false}, appServerUrl = 'http://127.0.0.1')
    {
        let gameManager = {
            gameDom: this.createFakeGameDom(elements, configResponse),
            events: new EventsManager(),
            appServerUrl,
            startedGames: []
        };
        gameManager.startGame = (formData, isGameStart) => gameManager.startedGames.push({formData, isGameStart});
        return new FirebaseConnector(gameManager);
    }

    createFakeUser(getIdToken)
    {
        return {email: 'player@test.com', uid: 'firebase-uid', getIdToken};
    }

    async startVerifyServer(responseBody, receivedRequests)
    {
        let createdAppServer = new AppServerFactory().createAppServer({});
        createdAppServer.app.post(FirebaseConst.ROUTE_PATHS.VERIFY_ID_TOKEN, (request, response) => {
            receivedRequests.push({body: request.body, contentType: request.headers['content-type']});
            response.type('json').send(responseBody);
        });
        createdAppServer.appServer.listen(0, '127.0.0.1');
        await once(createdAppServer.appServer, 'listening');
        return createdAppServer;
    }

    async closeVerifyServer(createdAppServer)
    {
        createdAppServer.appServer.closeAllConnections();
        createdAppServer.appServer.close();
        await once(createdAppServer.appServer, 'close');
    }

    async loginWithServerUrl(appServerUrl, getIdToken)
    {
        let errorContainer = this.createFakeElement('');
        let connector = this.createConnector(
            {[this.usernameSelector]: this.createFakeElement('firebase-player'), [this.errorSelector]: errorContainer},
            {enabled: false},
            appServerUrl
        );
        connector.initAuth(this.firebaseConfig);
        let signOuts = [];
        connector.initializedApp = {firebase: {auth: () => ({signOut: () => signOuts.push(true)})}};
        return {
            activeUserResult: await connector.setActiveUser(this.createFakeUser(getIdToken)),
            errorMessage: errorContainer.textContent,
            startedGames: connector.gameManager.startedGames,
            signOuts: signOuts.length
        };
    }

    async loginWithVerifyResponse(responseBody, getIdToken)
    {
        let receivedRequests = [];
        let verifyServer = await this.startVerifyServer(responseBody, receivedRequests);
        let loginResult = await this.loginWithServerUrl(
            'http://127.0.0.1:'+verifyServer.appServer.address().port,
            getIdToken
        );
        await this.closeVerifyServer(verifyServer);
        loginResult.receivedRequests = receivedRequests;
        return loginResult;
    }

    async testTheMissingGameManagerIsRejected()
    {
        await this.test('the connector is not created without the game manager', async () => {
            this.assert.throws(() => new FirebaseConnector(false), /FirebaseConnector - Missing game manager\./);
        });
    }

    async testTheFirebaseLoginFormDataIsSetBeforeJoiningTheGame()
    {
        await this.test('only the Firebase login form sets the Firebase data on the user data', async () => {
            let connector = this.createConnector();
            let firebaseUserData = {};
            let regularUserData = {};
            let formData = {formId: 'firebase-login', firebaseUid: 'firebase-uid', firebaseIdToken: 'id-token'};
            await connector.gameManager.events.emit('reldens.beforeJoinGame', {
                formData,
                gameManager: {userData: firebaseUserData}
            });
            await connector.gameManager.events.emit('reldens.beforeJoinGame', {
                formData: {...formData, formId: 'login'},
                gameManager: {userData: regularUserData}
            });
            this.assert.deepStrictEqual(
                firebaseUserData,
                {isFirebaseLogin: true, firebaseUid: 'firebase-uid', firebaseIdToken: 'id-token'}
            );
            this.assert.deepStrictEqual(regularUserData, {});
        });
    }

    async testTheDefaultProvidersUseTheFirebaseAuthProviders()
    {
        await this.test('the default providers are the Firebase Google, Facebook and GitHub providers', async () => {
            let defaultProviders = this.createConnector().fetchDefaultProviders();
            let providersKeys = Object.keys(defaultProviders);
            this.assert.deepStrictEqual(providersKeys, FirebaseConst.DEFAULT_PROVIDERS_KEYS);
            this.assert.deepStrictEqual(
                providersKeys.map(providerKey => defaultProviders[providerKey].authMethod.providerId),
                ['google.com', 'facebook.com', 'github.com']
            );
            this.assert.deepStrictEqual(
                providersKeys.map(providerKey => defaultProviders[providerKey].label),
                ['Sign in with Google', 'Sign in with Facebook', 'Sign in with GitHub']
            );
        });
    }

    async testTheMissingConfigurationDoesNotInitializeTheApp()
    {
        await this.test('a missing Firebase configuration does not initialize the Firebase app', async () => {
            let connector = this.createConnector();
            this.assert.strictEqual(connector.initAuth(false), false);
            this.assert.strictEqual(connector.initializedApp, false);
        });
    }

    async testTheConfigurationInitializesTheFirebaseApp()
    {
        await this.test('the configuration initializes one Firebase app shared by every connector', async () => {
            let connector = this.createConnector();
            let secondConnector = this.createConnector();
            connector.initAuth(this.firebaseConfig);
            secondConnector.initAuth({...this.firebaseConfig});
            this.assert.strictEqual(connector.initializedApp.name, '[DEFAULT]');
            this.assert.deepStrictEqual(connector.initializedApp.options, this.firebaseConfig);
            this.assert.strictEqual(secondConnector.initializedApp, connector.initializedApp);
            this.assert.strictEqual(connector.initializedApp.firebase.auth().app, connector.initializedApp);
            this.assert.strictEqual(connector.initializedApp.firebase.auth().currentUser, null);
            this.assert.throws(
                () => this.createConnector().initAuth({...this.firebaseConfig, apiKey: 'another-api-key'}),
                /app\/duplicate-app/
            );
        });
    }

    async testTheAuthButtonsAreCreatedForTheProviders()
    {
        await this.test('the active providers replace the default auth buttons of the same key', async () => {
            let container = this.createFakeElement('');
            container.innerHTML = 'previous-buttons';
            let connector = this.createConnector({[this.containerSelector]: container});
            connector.isActive = true;
            connector.activeProviders = {github: {label: 'Custom GitHub', authMethod: 'custom-auth-method'}};
            connector.setupAuthButtons(['google', 'github']);
            this.assert.strictEqual(connector.isActive, false);
            this.assert.strictEqual(container.innerHTML, '');
            this.assert.deepStrictEqual(
                container.children.map(button => button.classNames),
                [['firebase-auth-btn', 'firebase-google-btn'], ['firebase-auth-btn', 'firebase-github-btn']]
            );
            this.assert.deepStrictEqual(
                container.children.map(button => button.innerHTML),
                ['Sign in with Google', 'Custom GitHub']
            );
            this.assert.deepStrictEqual(container.children.map(button => button.type), ['button', 'button']);
            this.assert.deepStrictEqual(
                container.children.map(button => Object.keys(button.listeners)),
                [['click'], ['click']]
            );
        });
    }

    async testTheAuthButtonsStopWithoutContainerOrProviders()
    {
        await this.test('the auth buttons stop on the missing container, providers or unknown provider', async () => {
            let missingContainerConnector = this.createConnector();
            missingContainerConnector.isActive = true;
            this.assert.strictEqual(missingContainerConnector.setupAuthButtons(['google']), false);
            this.assert.strictEqual(missingContainerConnector.isActive, false);
            let container = this.createFakeElement('');
            container.innerHTML = 'previous-buttons';
            let connector = this.createConnector({[this.containerSelector]: container});
            this.assert.strictEqual(connector.setupAuthButtons([]), false);
            this.assert.strictEqual(container.innerHTML, '');
            this.assert.deepStrictEqual(connector.defaultProviders, {});
            this.assert.strictEqual(connector.setupAuthButtons(['google', 'unknown', 'github']), false);
            this.assert.deepStrictEqual(container.children.map(button => button.innerHTML), ['Sign in with Google']);
        });
    }

    async testTheProviderSignInErrorIsDisplayed()
    {
        await this.test('a failed provider sign in shows the authentication error', async () => {
            let container = this.createFakeElement('');
            let errorContainer = this.createFakeElement('');
            let connector = this.createConnector(
                {[this.containerSelector]: container, [this.errorSelector]: errorContainer}
            );
            connector.initAuth(this.firebaseConfig);
            connector.setupAuthButtons(['google']);
            this.assert.strictEqual(connector.signInWithProvider(false), false);
            this.assert.strictEqual(errorContainer.textContent, '');
            [...container.children].shift().listeners.click();
            await new Promise(resolve => setImmediate(resolve));
            this.assert.strictEqual(errorContainer.textContent, 'Authentication error.');
        });
    }

    async testTheMissingUsernameStopsTheLogin()
    {
        await this.test('a missing or blank username stops the login before the ID token request', async () => {
            let requestedTokens = [];
            let user = this.createFakeUser(async () => requestedTokens.push('id-token'));
            let errorContainer = this.createFakeElement('');
            let missingUsernameConnector = this.createConnector({[this.errorSelector]: errorContainer});
            this.assert.strictEqual(await missingUsernameConnector.setActiveUser(user), false);
            this.assert.strictEqual(missingUsernameConnector.isActive, true);
            this.assert.strictEqual(errorContainer.textContent, 'Please enter a username.');
            let blankUsernameConnector = this.createConnector({[this.usernameSelector]: this.createFakeElement('   ')});
            this.assert.strictEqual(await blankUsernameConnector.setActiveUser(user), false);
            this.assert.deepStrictEqual(requestedTokens, []);
            this.assert.deepStrictEqual(missingUsernameConnector.gameManager.startedGames, []);
            this.assert.deepStrictEqual(blankUsernameConnector.gameManager.startedGames, []);
        });
    }

    async testTheVerifiedIdTokenStartsTheGame()
    {
        await this.test('a verified ID token starts the game with the Firebase login form data', async () => {
            let loginResult = await this.loginWithVerifyResponse(this.verifiedResponse, async () => 'id-token');
            this.assert.strictEqual(loginResult.errorMessage, '');
            this.assert.deepStrictEqual(
                loginResult.receivedRequests,
                [{body: {idToken: 'id-token', uid: 'firebase-uid'}, contentType: 'application/json'}]
            );
            this.assert.deepStrictEqual(loginResult.startedGames, [{
                formData: {
                    formId: 'firebase-login',
                    email: 'player@test.com',
                    username: 'firebase-player',
                    firebaseUid: 'firebase-uid',
                    firebaseIdToken: 'id-token'
                },
                isGameStart: true
            }]);
        });
    }

    async testTheNotVerifiedIdTokenStopsTheLogin()
    {
        await this.test('an ID token not verified by the server stops the login with an error and signs out', async () => {
            let responsesBodies = [sc.toJsonString({isSuccess: false}), sc.toJsonString({}), '{invalid-json'];
            for(let responseBody of responsesBodies){
                let loginResult = await this.loginWithVerifyResponse(responseBody, async () => 'id-token');
                this.assert.strictEqual(loginResult.activeUserResult, false);
                this.assert.strictEqual(loginResult.errorMessage, 'Authentication error.');
                this.assert.strictEqual(loginResult.receivedRequests.length, 1);
                this.assert.deepStrictEqual([loginResult.startedGames, loginResult.signOuts], [[], 1]);
            }
        });
    }

    async testTheFailedIdTokenRequestStopsTheLogin()
    {
        await this.test('a failed or empty ID token stops the login with an error and signs out', async () => {
            let tokenFailure = await this.loginWithVerifyResponse(this.verifiedResponse, async () => {
                throw new Error('ID token error');
            });
            let emptyToken = await this.loginWithVerifyResponse(this.verifiedResponse, async () => '');
            let requestFailure = await this.loginWithServerUrl('invalid-server-url', async () => 'id-token');
            for(let loginResult of [tokenFailure, emptyToken, requestFailure]){
                this.assert.strictEqual(loginResult.activeUserResult, false);
                this.assert.strictEqual(loginResult.errorMessage, 'Authentication error.');
                this.assert.deepStrictEqual(loginResult.startedGames, []);
                this.assert.strictEqual(loginResult.signOuts, 1);
            }
            this.assert.deepStrictEqual(tokenFailure.receivedRequests, []);
            this.assert.deepStrictEqual(
                emptyToken.receivedRequests.map(receivedRequest => receivedRequest.body),
                [{idToken: '', uid: 'firebase-uid'}]
            );
        });
    }

    async testTheDisabledFirebaseDoesNotStartTheAuth()
    {
        await this.test('a disabled Firebase configuration does not start the Firebase auth', async () => {
            let connector = this.createConnector();
            connector.startFirebase();
            this.assert.deepStrictEqual(
                connector.gameDom.requestedUrls,
                [connector.gameManager.appServerUrl+GameConst.ROUTE_PATHS.FIREBASE]
            );
            this.assert.strictEqual(connector.initializedApp, false);
            this.assert.deepStrictEqual(connector.gameDom.fakeWindow.listeners, {});
        });
    }

    async testTheEnabledFirebaseStartsTheAuth()
    {
        await this.test('an enabled Firebase configuration starts the auth and the provider buttons', async () => {
            let container = this.createFakeElement('');
            let firebaseLogin = this.createFakeElement('');
            let connector = this.createConnector(
                {[this.containerSelector]: container, [this.loginFormSelector]: firebaseLogin},
                {enabled: true, firebaseConfig: this.firebaseConfig, providersKeys: ['google', 'github']}
            );
            connector.startFirebase();
            let auth = connector.initializedApp.firebase.auth();
            await new Promise(resolve => auth.onAuthStateChanged(() => resolve()));
            this.assert.deepStrictEqual(connector.initializedApp.options, this.firebaseConfig);
            this.assert.deepStrictEqual(
                container.children.map(button => button.innerHTML),
                ['Sign in with Google', 'Sign in with GitHub']
            );
            this.assert.deepStrictEqual(Object.keys(firebaseLogin.listeners), ['submit']);
            this.assert.deepStrictEqual(Object.keys(connector.gameDom.fakeWindow.listeners), ['beforeunload']);
            connector.isActive = true;
            this.assert.doesNotThrow(() => connector.gameDom.fakeWindow.listeners.beforeunload());
        });
    }

    async testTheLoginFormShowsTheFirebaseRow()
    {
        await this.test('the valid login form submit or the username field shows the Firebase row', async () => {
            let rowContainer = this.createHiddenElement();
            let firebaseLogin = this.createFakeElement('');
            let connector = this.createConnector({[this.rowSelector]: rowContainer});
            let preventedEvents = [];
            let submitEvent = {preventDefault: () => preventedEvents.push('submit')};
            this.assert.strictEqual(connector.activateLoginBehavior(firebaseLogin), false);
            firebaseLogin.isValid = false;
            firebaseLogin.listeners.submit(submitEvent);
            this.assert.strictEqual(rowContainer.classList.contains('hidden'), true);
            firebaseLogin.isValid = true;
            firebaseLogin.listeners.submit(submitEvent);
            this.assert.strictEqual(rowContainer.classList.contains('hidden'), false);
            this.assert.deepStrictEqual(preventedEvents, ['submit', 'submit']);
            let usernameRowContainer = this.createHiddenElement();
            let usernameInput = this.createFakeElement('');
            let usernameConnector = this.createConnector(
                {[this.rowSelector]: usernameRowContainer, [this.usernameSelector]: usernameInput}
            );
            usernameConnector.activateLoginBehavior(this.createFakeElement(''));
            this.assert.strictEqual(usernameRowContainer.classList.contains('hidden'), false);
            this.assert.deepStrictEqual(Object.keys(usernameInput.listeners), ['change', 'focus']);
            this.assert.doesNotThrow(() => usernameInput.listeners.focus());
        });
    }

}

module.exports.TestFirebaseConnector = TestFirebaseConnector;
