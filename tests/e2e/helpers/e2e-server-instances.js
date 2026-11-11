/**
 *
 * Reldens - E2E Server Instances
 *
 * The numbered game servers of an e2e run (server-1, server-2): every instance shares the tests/config.json database
 * and the signed tokens secret of its app .env and runs on its own port (server-1 on the free e2e port, every next one
 * on the next free port, given by run-tests.js in RELDENS_E2E_SERVERS_PORTS). A "servers" entry in tests/config.json
 * (like {"servers": {"server-2": {"serverPath": "../../other-checkout/app"}}}) overrides the config of one instance.
 * The run flag --skip-servers=server-2 avoids creating an instance and --skip-db-reset=server-1,server-2 avoids the
 * database reset of an instance. Server-1 is booted in the Playwright global setup process and every next instance in
 * its own child process (tests/e2e/forked-server-instance.js, a second ServerManager in one process would share the
 * events manager singleton), which answers "ready" once its e2e endpoints are registered and shuts down gracefully
 * when the global teardown asks it to (an instance already ended, by an exit or a signal, is skipped, and one whose
 * IPC channel is closed is killed). A spec reaches an instance with forServer(gameConfig, 'server-2'), the game
 * config with that instance URL used by the e2e endpoints requests and the client pages it opens.
 *
 */

const { fork } = require('node:child_process');
const { once } = require('node:events');
const { expect } = require('@playwright/test');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');
const { StartupGuard } = require('./startup-guard');

class E2eServerInstances
{

    static FIRST_SERVER_KEY = 'server-1';
    static SERVER_KEY_PREFIX = 'server-';
    static SERVERS_COUNT = 2;
    static PORTS_ENV = 'RELDENS_E2E_SERVERS_PORTS';
    static SERVER_KEY_ENV = 'RELDENS_E2E_SERVER_KEY';
    static READY_MESSAGE = 'ready';
    static SHUTDOWN_MESSAGE = 'shutdown';
    static INSTANCE_SCRIPT = ['tests', 'e2e', 'forked-server-instance.js'];
    static children = [];

    static fetchServersUrls()
    {
        let serversUrls = {};
        let serversPorts = sc.toJson(sc.get(process.env, E2eServerInstances.PORTS_ENV, ''), {});
        for(let serverKey of Object.keys(serversPorts)){
            serversUrls[serverKey] = 'http://localhost:'+serversPorts[serverKey];
        }
        return serversUrls;
    }

    static fetchServerConfig(config, serverKey)
    {
        let serverConfig = Object.assign({}, config, sc.get(sc.get(config, 'servers', {}), serverKey, {}));
        serverConfig.serverKey = serverKey;
        return serverConfig;
    }

    static forServer(gameConfig, serverKey)
    {
        let serverBaseUrl = sc.get(E2eServerInstances.fetchServersUrls(), serverKey, false);
        expect(serverBaseUrl, 'The '+serverKey+' instance must run, it is not created with --skip-servers='+serverKey)
            .toBeTruthy();
        return Object.assign({}, gameConfig, {serverBaseUrl, serverKey});
    }

    static async startInstances()
    {
        let serversUrls = E2eServerInstances.fetchServersUrls();
        for(let serverKey of Object.keys(serversUrls)){
            let child = fork(
                FileHandler.joinPaths(process.cwd(), ...E2eServerInstances.INSTANCE_SCRIPT),
                [],
                {
                    env: Object.assign({}, process.env, {[E2eServerInstances.SERVER_KEY_ENV]: serverKey}),
                    stdio: ['ignore', 'inherit', 'inherit', 'ipc']
                }
            );
            E2eServerInstances.children.push(child);
            let startResult = await StartupGuard.runStep(
                Promise.race([once(child, 'message'), once(child, 'exit')]),
                serverKey+' start'
            );
            if(E2eServerInstances.READY_MESSAGE !== [...startResult].shift()){
                StartupGuard.abort(serverKey+' ended before it was ready, exit code '+[...startResult].shift());
            }
            process.stdout.write('Server: '+serverKey+' ready on '+serversUrls[serverKey]+'\n');
        }
    }

    static async stopInstances()
    {
        for(let child of E2eServerInstances.children){
            if(null !== child.exitCode || null !== child.signalCode){
                continue;
            }
            let childExit = once(child, 'exit');
            E2eServerInstances.requestStop(child);
            await childExit;
        }
        E2eServerInstances.children = [];
    }

    static requestStop(child)
    {
        if(child.connected){
            child.send(E2eServerInstances.SHUTDOWN_MESSAGE);
            return true;
        }
        return child.kill();
    }

}

module.exports.E2eServerInstances = E2eServerInstances;
