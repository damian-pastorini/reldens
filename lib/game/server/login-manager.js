/**
 *
 * Reldens - LoginManager
 *
 */

const { RoomGame } = require('../../rooms/server/game');
const { ActivePlayers } = require('./memory/active-players');
const { RoomsConst } = require('../../rooms/constants');
const { GameConst } = require('../constants');
const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class LoginManager
{

    constructor(props)
    {
        this.config = props.config;
        this.configServer = props.configServer;
        this.usersManager = props.usersManager;
        this.roomsManager = props.roomsManager;
        this.passwordManager = Encryptor;
        this.appServer = props.appServer;
        this.mailer = props.mailer;
        this.themeManager = props.themeManager;
        this.events = sc.get(props, 'events', false);
        this.listenEvents();
        this.defaultStatePosition = {
            x: this.config.get('client/map/tileData/width', 32) * 2,
            y: this.config.get('client/map/tileData/height', 32) * 2,
            dir: GameConst.DOWN
        };
        this.disconnectUsersOnServerChange = this.config.getWithoutLogs(
            'server/players/disconnectUsersOnServerChange',
            true
        );
        this.allowGuestUserName = this.config.getWithoutLogs('client/general/users/allowGuestUserName', false);
        this.guestEmailDomain = this.config.getWithoutLogs('server/players/guestsUser/emailDomain');
        this.activePlayers = ActivePlayers;
        this.activePlayers.guestsEmailDomain = this.guestEmailDomain;
        this.serverSelfUrl = this.configServer.publicUrl || this.configServer.host +':'+this.configServer.port;
        this.roomsPerServer = this.mapRoomsServers();
    }

    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager undefined in LoginManager.');
            return false;
        }
        this.events.on('reldens.serverBeforeListen', async (props) => {
            await props.serverManager.app.post(GameConst.ROUTE_PATHS.DISCONNECT_USER, async (req, res) => {
                let disconnectedUserResult = {isSuccess: await this.disconnectUserByLoginData(req)};
                //Logger.debug('Disconnected user result:', disconnectedUserResult);
                res.json(disconnectedUserResult);
            });
            // @TODO - BETA - Refactor, move into the initial request data and avoid the extra requests from the client.
            await props.serverManager.app.get(GameConst.ROUTE_PATHS.MAILER, async (req, res) => {
                res.json({
                    enabled: this.mailer?.isEnabled()
                });
            });
            props.serverManager.app.get(GameConst.ROUTE_PATHS.TERMS_AND_CONDITIONS, (req, res) => {
                let languageParam = req.query.lang || '';
                let termsConfig = this.config.getWithoutLogs(
                    'client/login/termsAndConditions/'+languageParam,
                    this.config.getWithoutLogs(
                        'client/login/termsAndConditions',
                        {}
                    )
                );
                res.json({
                    link: sc.get(termsConfig, 'link', ''),
                    heading: sc.get(termsConfig, 'heading', ''),
                    body: sc.get(termsConfig, 'body', ''),
                    checkboxLabel: sc.get(termsConfig, 'checkboxLabel', '')
                });
            });
        });
    }

    async disconnectUserByLoginData(req)
    {
        let userData = req.body;
        if(!userData || !userData?.username){
            //Logger.debug('Missing user data in request body.', req.body);
            return false;
        }
        //Logger.debug('Disconnect user by login data:', userData?.username);
        let activePlayer = this.activePlayers.fetchByRoomAndUserName(
            userData.username,
            this.activePlayers.gameRoomInstanceId
        );
        if(!activePlayer){
            //Logger.debug('Missing active player.');
            return true;
        }
        if(!activePlayer.userModel){
            //Logger.debug('Missing active player user model.');
            return false;
        }
        if(!await this.login(activePlayer.userModel, userData)){
            return false;
        }
        return await this.disconnectUserFromEveryRoom(activePlayer.userModel);
    }

    mapRoomsServers()
    {
        let roomsServersConfig = this.config.getWithoutLogs('client/rooms/servers', {});
        let roomsServers = {};
        for(let roomName of Object.keys(roomsServersConfig)){
            if(!roomsServers[roomsServersConfig[roomName]]){
                roomsServers[roomsServersConfig[roomName]] = [];
            }
            roomsServers[roomsServersConfig[roomName]].push(roomName);
        }
        // Logger.debug('Mapped rooms servers:', roomsServers);
        return roomsServers;
    }

    async broadcastDisconnectionMessage(userModel, options)
    {
        if(!this.disconnectUsersOnServerChange){
            //Logger.debug('Configuration "disconnectUsersOnServerChange" is disabled.');
            return true;
        }
        let roomServersList = Object.keys(this.roomsPerServer);
        if(0 === roomServersList.length){
            //Logger.debug('None Rooms in servers list to trigger disconnection.');
            return true;
        }
        for(let serverUrl of roomServersList){
            if(this.serverSelfUrl === serverUrl){
                //Logger.debug('Current host is the room serverUrl:', this.serverSelfUrl, serverUrl);
                continue;
            }
            //Logger.debug('Try disconnection from server URL:', serverUrl);
            let disconnectionResult = await this.disconnectFromServer(serverUrl, options);
            if(!disconnectionResult){
                //Logger.debug('Disconnection result false.', disconnectionResult);
                return false;
            }
        }
        //Logger.debug('User disconnected from other servers.');
        return true;
    }

    async disconnectFromServer(serverUrl, options)
    {
        let disconnectUrl = serverUrl+GameConst.ROUTE_PATHS.DISCONNECT_USER;
        let body = JSON.stringify(options);
        //Logger.debug('Disconnect from server "'+disconnectUrl+'", sending body: '+body);
        let result = false;
        try {
            let response = await fetch(
                disconnectUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body)
                    },
                    body,
                }
            );
            let responseData = await response?.json();
            //Logger.debug('Disconnect from server response status: '+response.status, 'Response data:', responseData);
            result = responseData.isSuccess;
        } catch (error) {
            Logger.error('Disconnect from server error.', serverUrl, error.message);
            // if secondary server is down we will allow the user to login on the other server
            result = true;
        }
        return result;
    }

    async disconnectUserFromEveryRoom(userModel, avoidGameRoom = false)
    {
        Logger.debug('Disconnect logged user: '+userModel.username);
        let createdRoomsKeys = Object.keys(this.roomsManager.createdInstances);
        for(let i of createdRoomsKeys){
            let roomScene = this.roomsManager.createdInstances[i];
            if(avoidGameRoom && roomScene instanceof RoomGame){
                // there must be a single instance of RoomGame and we need to avoid it from disconnection:
                Logger.debug('Avoiding RoomGame disconnection.');
                continue;
            }
            let activePlayer = roomScene.activePlayerByUserName(userModel.username, roomScene.roomId);
            if(!activePlayer){
                Logger.debug(
                    'Active player not found by username "'+userModel.username+'" in room: '
                    +roomScene.roomName+' (ID: '+roomScene.roomId+').'
                );
                continue;
            }
            if(!sc.isFunction(roomScene.disconnectBySessionId)){
                Logger.warning(
                    'RoomScene ('+typeof roomScene+') does not have a "disconnectBySessionId" method. '
                    +roomScene.roomName+' (ID: '+roomScene.roomId+').'
                );
                continue;
            }
            await roomScene.disconnectBySessionId(activePlayer.sessionId, activePlayer.client, userModel);
        }
        return true;
    }

    async processUserRequest(userData = false)
    {
        if(sc.hasOwn(userData, 'forgot')){
            return await this.processForgotPassword(userData);
        }
        this.events.emitSync('reldens.processUserRequestIsValidDataBefore', this, userData);
        let result = {error: 'Invalid user data.'};
        if(!this.hasValidUserName(userData)){
            Logger.debug('Missing username.', userData);
            this.events.emitSync('reldens.invalidData', this, userData, result);
            return result;
        }
        let user = await this.usersManager.loadUserByUsername(userData.username);
        if(user && userData.isGuest && userData.isNewUser){
            Logger.debug('Guest login invalid user data.', userData);
            this.events.emitSync('reldens.guestLoginInvalidParams', this, user, userData, result);
            return result;
        }
        if(user){
            return await this.login(user, userData);
        }
        if(userData.isGuest){
            userData = this.overrideWithGuestData(userData);
            return await this.register(userData);
        }
        if(!userData.isNewUser){
            Logger.info('Invalid user login data.', {user: userData.username});
            this.events.emitSync('reldens.loginInvalidParams', this, user, userData, result);
        }
        if(userData.isNewUser){
            user = await this.usersManager.loadUserByEmail(userData.email);
            if(user){
                Logger.info('User already exists.', userData);
                this.events.emitSync('reldens.registrationInvalidParams', this, user, userData, result);
            }
            if(!user){
                return await this.register(userData);
            }
        }
        return result;
    }

    overrideWithGuestData(userData)
    {
        if(-1 === userData.username.indexOf('guest-')){
            let guestNameWithTimestamp = 'guest-' + sc.getTime() + '-';
            userData.username = this.allowGuestUserName
                ? userData.username.replace('guest-', guestNameWithTimestamp)
                : guestNameWithTimestamp;
        }
        userData.email = userData.username+this.guestEmailDomain;
        userData.password = sc.randomChars(12);
        return userData;
    }

    hasValidUserName(userData)
    {
        return !(!userData || !sc.hasOwn(userData, 'username') || !userData.username.length);
    }

    async login(user, userData)
    {
        let result = {error: 'Login, invalid user data.'};
        // check guest user:
        if(!this.isValidGuestLogin(userData, user)){
            Logger.error('Guest user is not active for login.', userData);
            this.events.emitSync('reldens.loginInvalidRole', this, user, userData, result);
            return result;
        }
        // check if the passwords match:
        if(!this.passwordManager.validatePassword(userData.password, user.password)){
            Logger.error('Invalid password for user login.', userData);
            this.events.emitSync('reldens.loginInvalidPassword', this, user, userData, result);
            return result;
        }
        try {
            if(sc.isArray(user.related_players) && 0 < user.related_players.length){
                // set the scene on the user players:
                this.events.emitSync('reldens.setSceneOnPlayers', this, user, userData);
                await this.setSceneOnPlayers(user, userData);
            }
            let result = {user: user};
            this.events.emitSync('reldens.loginSuccess', this, user, userData, result);
            return result;
        } catch (error) {
            Logger.error('Login try/catch error.', error, userData);
            this.events.emitSync('reldens.loginError', this, user, userData, result);
            return result;
        }
    }

    isValidGuestLogin(userData, user)
    {
        let guestRoleId = this.config.server?.players?.guestUser?.roleId || 0;
        if(0 === guestRoleId){
            Logger.warning('Guest role ID is not defined by configuration.');
            return true;
        }
        if(!userData.isGuest && user.role_id !== guestRoleId){
            return true;
        }
        return Boolean(this.activePlayers.fetchByRoomAndUserName(user.username, this.activePlayers.gameRoomInstanceId));
    }

    async setSceneOnPlayers(user, userData)
    {
        for(let player of user.related_players){
            //Logger.debug('Player state:', player);
            if(!player.state){
                continue;
            }
            let config = this.config.get('client/rooms/selection');
            if(
                config.allowOnLogin
                && userData['selectedScene']
                && userData['selectedScene'] !== RoomsConst.ROOM_LAST_LOCATION_KEY
            ){
                await this.applySelectedLocation(player, userData['selectedScene']);
            }
            //Logger.debug('Get room name by ID. Player state:', player.state);
            player.state.scene = await this.getRoomNameById(player.state.room_id);
        }
    }

    async roleAuthenticationCallback(email, password, roleId = 0)
    {
        let user = await this.usersManager.loadUserByEmail(email);
        let validatedRole = 0 === roleId || String(user.role_id) === String(roleId);
        if(user && validatedRole){
            let result = this.passwordManager.validatePassword(
                password,
                user.password
            );
            if(result){
                return user;
            }
        }
        return false;
    }

    async applySelectedLocation(player, selectedScene)
    {
        let selectedRoom = await this.roomsManager.loadRoomByName(selectedScene);
        if(!selectedRoom){
            return false;
        }
        player.state = this.getStateObjectFromRoom(selectedRoom);
    }

    async getRoomNameById(roomId)
    {
        let playerRoom = await this.roomsManager.loadRoomById(roomId);
        if(playerRoom){
            return playerRoom.roomName;
        }
        return GameConst.ROOM_NAME_MAP;
    }

    async register(userData)
    {
        let result = {error: 'Registration error, there was an error with your request, please try again later.'};
        if(!userData.isNewUser){
            Logger.error('Registration invalid parameters.', userData);
            await this.events.emit('reldens.register', this, userData, result);
            return result;
        }
        try {
            // if the email doesn't exist in the database, and it's a registration request:
            // insert user, player, player state, player stats, class path:
            let defaultRoleId = this.config.server.players.initialUser.roleId;
            let roleId = !userData.isGuest ? defaultRoleId : this.config.server.players.guestUser.roleId;
            let newUser = await this.usersManager.createUser({
                email: userData.email,
                username: userData.username,
                password: this.passwordManager.encryptPassword(userData.password),
                role_id: roleId,
                status: this.config.server.players.initialUser.status
            });
            let result = {user: newUser};
            await this.events.emit('reldens.createNewUserAfter', newUser, this, result);
            return result;
        } catch (error) {
            Logger.error('Registration try/catch error.', error,  userData);
            await this.events.emit('reldens.createNewUserError', this, userData, result);
            return result;
        }
    }

    async createNewPlayer(loginData)
    {
        // @TODO - BETA - Replace all result.message hardcoded values by snippets.
        let minimumPlayerNameLength = this.config.getWithoutLogs('client/players/name/minimumLength', 3);
        if(minimumPlayerNameLength > loginData['new-player-name'].toString().length){
            let result = {error: true, message: 'Invalid player name, please choose another name.'};
            await this.events.emit('reldens.playerNewName', this, loginData, result);
            return result;
        }
        let initialState = await this.prepareInitialState(loginData['selectedScene']);
        if(!await this.validateInitialState(initialState)){
            let result = {
                error: true,
                message: 'There was an error with the player initial state, please contact the administrator.'
            };
            await this.events.emit('reldens.playerSceneUnavailable', this, loginData, result);
            return result;
        }
        let playerData = {
            name: loginData['new-player-name'],
            user_id: loginData.user_id,
            state: initialState
        };
        await this.events.emit('reldens.createNewPlayerBefore', loginData, playerData, this);
        let isNameAvailable = await this.usersManager.isNameAvailable(playerData.name);
        if(!isNameAvailable){
            let result = {error: true, message: 'The player name is not available, please choose another name.'};
            await this.events.emit('reldens.playerNewNameUnavailable', this, loginData, isNameAvailable, result);
            return result;
        }
        try {
            let player = await this.usersManager.createPlayer(playerData);
            player.state.scene = await this.getRoomNameById(initialState.room_id);
            let result = {error: false, player};
            await this.events.emit('reldens.createdNewPlayer', player, loginData, this, result);
            return result;
        } catch (error) {
            Logger.error('Player creation error.', error.message);
            let result = {error: true, message: 'There was an error creating your player, please try again.'};
            await this.events.emit('reldens.createNewPlayerCriticalError', this, loginData, error, result);
            return result;
        }
    }

    async validateInitialState(initialState)
    {
        if(!initialState){
            return false;
        }
        let roomId = sc.get(initialState, 'room_id', false);
        if(false === roomId){
            return false;
        }
        return await this.roomsManager.loadRoomById(roomId);
    }

    async prepareInitialState(roomName)
    {
        let config = this.config.get('client/rooms/selection');
        let initialState = this.config.server.players.initialState;
        if(!config.allowOnRegistration || !roomName){
            if(!initialState){
                Logger.critical('Initial state is not defined!');
                return false;
            }
            return initialState;
        }
        let selectedRoom = await this.roomsManager.loadRoomByName(roomName);
        if(!selectedRoom){
            if(!initialState){
                Logger.critical('Initial state is not defined!');
                return false;
            }
            return initialState;
        }
        return this.getStateObjectFromRoom(selectedRoom);
    }

    getStateObjectFromRoom(selectedRoom)
    {
        // clone the default position and set the room id:
        let stateData = Object.assign({room_id: selectedRoom.roomId}, this.defaultStatePosition);
        if(selectedRoom.returnPointDefault){
            stateData.x = selectedRoom.returnPointDefault[RoomsConst.RETURN_POINT_KEYS.X];
            stateData.y = selectedRoom.returnPointDefault[RoomsConst.RETURN_POINT_KEYS.Y];
            stateData.dir = selectedRoom.returnPointDefault[RoomsConst.RETURN_POINT_KEYS.DIRECTION];
        }
        return stateData;
    }

    async updateLastLogin(userModel)
    {
        let updated = await this.usersManager.updateUserLastLogin(userModel);
        if(!updated){
            // @TODO - BETA - Logout user.
            Logger.error('Last login update fail on user with ID "'+userModel.id+'".');
        }
        return updated;
    }

    async processForgotPassword(userData)
    {
        // @TODO - WIP - TRANSLATIONS.
        if(!this.mailer.isEnabled()){
            return {error: 'The forgot password email can not be send, please contact the administrator.'};
        }
        if(!sc.hasOwn(userData, 'email')){
            return {error: 'Please complete your email.'};
        }
        let existsMessage = {error: 'If the email exists then a reset password link should be received soon.'};
        let user = await this.usersManager.loadUserByEmail(userData.email);
        if(!user){
            return existsMessage;
        }
        let forgotLimit = Number(process.env.RELDENS_MAILER_FORGOT_PASSWORD_LIMIT) || 4;
        let microLimit = Date.now() - (forgotLimit * 60 * 60 * 1000);
        let statusInt = Number(user.status);
        if(statusInt >= microLimit){
            Logger.debug('Reset link already sent to "'+userData.email+'".', statusInt);
            return existsMessage;
        }
        let sendResult = {result: await this.sendForgotPasswordEmail(userData, user.password)};
        if(sendResult.result){
            Logger.debug('Reset link sent to "'+userData.email+'".');
            await this.usersManager.updateUserByEmail(userData.email, {status: Date.now()});
        }
        this.events.emitSync('reldens.processForgotPassword', this, userData, sendResult);
        return existsMessage;
    }

    async sendForgotPasswordEmail(userData, oldPassword)
    {
        // @TODO - WIP - TRANSLATIONS.
        let emailPath = this.themeManager.assetPath('email', 'forgot.html');
        let serverUrl = this.config.server.publicUrl || this.config.server.baseUrl;
        let resetLink = serverUrl+'/reset-password?email='+userData.email+'&id='+oldPassword;
        let subject = this.config.getWithoutLogs('server/mailer/forgotPassword/subject', 'Forgot password');
        let content = await this.themeManager.loadAndRenderTemplate(emailPath, {resetLink: resetLink});
        // @TODO - BETA - Make all system messages configurable.
        try {
            return await this.mailer.sendEmail({
                from: this.mailer.from,
                to: userData.email,
                subject,
                html: content
            });
        } catch (error) {
            return false;
        }
    }

}

module.exports.LoginManager = LoginManager;
