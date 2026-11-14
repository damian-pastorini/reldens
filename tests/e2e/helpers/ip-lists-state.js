/**
 *
 * Reldens - Ip Lists State
 *
 * Server side e2e endpoints for the address allow and deny lists: stores the permanent allow and deny rows, sets the
 * allow and deny configuration lists and the lists switch, refreshes the upgrade guard and lifts everything on demand,
 * after the given time (the tests that deny the address of the e2e endpoints can not ask for it) and on the reset
 * before every test, and answers the address the server sees for the requesting client.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class IpListsState
{

    static LIST_TYPES = ['allow', 'deny'];
    static defaults = {};
    static liftTimer = null;

    static fetchListsConfig(serverManager)
    {
        sc.deepMergeProperties(serverManager.configManager, {server: {security: {ipLists: {}}}});
        return serverManager.configManager.server.security.ipLists;
    }

    static captureDefaults(serverManager)
    {
        let configManager = serverManager.configManager;
        IpListsState.defaults = {
            enabled: configManager.getWithoutLogs('server/security/ipLists/enabled', false),
            allow: configManager.getWithoutLogs('server/security/ipLists/allow', []),
            deny: configManager.getWithoutLogs('server/security/ipLists/deny', [])
        };
    }

    static async storeRows(ipListsRepository, listType, addresses)
    {
        for(let address of addresses){
            await ipListsRepository.create({address, list_type: listType, reason: 'e2e address lists test'});
        }
    }

    static async applyLists(serverManager, ipLists)
    {
        let ipListsRepository = serverManager.dataServer.getEntity('ipLists');
        for(let listType of IpListsState.LIST_TYPES){
            await IpListsState.storeRows(ipListsRepository, listType, sc.get(ipLists, listType, []));
        }
        Object.assign(IpListsState.fetchListsConfig(serverManager), {
            enabled: sc.get(ipLists, 'enabled', true),
            allow: sc.get(ipLists, 'configAllow', []),
            deny: sc.get(ipLists, 'configDeny', [])
        });
        await serverManager.ipListsUpgradeGuard.refresh();
        let liftAfterMs = Number(sc.get(ipLists, 'liftAfterMs', 0));
        if(0 < liftAfterMs){
            IpListsState.liftTimer = setTimeout(() => {
                IpListsState.liftLists(serverManager).catch((error) => {
                    Logger.error('[ip-lists-state] Address lists could not be lifted: '+error.message);
                });
            }, liftAfterMs);
        }
    }

    static async liftLists(serverManager)
    {
        clearTimeout(IpListsState.liftTimer);
        IpListsState.liftTimer = null;
        Object.assign(IpListsState.fetchListsConfig(serverManager), IpListsState.defaults);
        let ipListsRepository = serverManager.dataServer.getEntity('ipLists');
        for(let storedAddress of await ipListsRepository.loadAll()){
            await ipListsRepository.deleteById(storedAddress.id);
        }
        await serverManager.ipListsUpgradeGuard.refresh();
    }

    static registerEndpoints(serverManager)
    {
        IpListsState.captureDefaults(serverManager);
        let app = serverManager.app;
        app.post('/api/e2e/security/ip-lists', async (request, response) => {
            await IpListsState.applyLists(serverManager, request.body);
            response.json({ok: true});
        });
        app.get('/api/e2e/security/client-address', (request, response) => {
            response.json({address: request.ip});
        });
        app.post('/api/e2e/security/ip-lists/lift', async (request, response) => {
            await IpListsState.liftLists(serverManager);
            response.json({ok: true});
        });
        app.post('/api/e2e/security/deny-addresses', async (request, response) => {
            await IpListsState.applyLists(serverManager, {
                deny: sc.get(request.body, 'addresses', []),
                liftAfterMs: Number(sc.get(request.body, 'durationMs', 3000))
            });
            response.json({ok: true});
        });
    }

}

module.exports.IpListsState = IpListsState;
