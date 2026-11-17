/**
 *
 * Reldens - Initial Client Config
 *
 * Overrides one value, or merges several values into one node, of the initial client config before the game reads it. The server writes that config on start
 * (window.reldensInitialConfig) and the bundler serves it under a hashed script name, so it can not be routed by name:
 * an init script replaces the window property by a setter that changes the value by its path when the script sets it.
 * The values the game config of the login message also sets (merged before the engine starts) are assigned instead on
 * the reldens.beforeCreateEngine event of the game manager, hooked by a setter of window.reldens.
 *
 */

class InitialClientConfig
{

    static async override(page, configPath, value)
    {
        let pathKeys = configPath.split('/');
        let lastKey = pathKeys.pop();
        await InitialClientConfig.merge(page, pathKeys.join('/'), {[lastKey]: value});
    }

    static async merge(page, configPath, values)
    {
        await page.addInitScript((override) => {
            let storedConfig = false;
            Object.defineProperty(window, 'reldensInitialConfig', {
                configurable: true,
                get: () => storedConfig,
                set: (initialConfig) => {
                    let configNode = override.configPath.split('/').reduce((node, pathKey) => node[pathKey], initialConfig);
                    Object.assign(configNode, override.values);
                    storedConfig = initialConfig;
                }
            });
        }, {configPath, values});
    }

    static async overrideBeforeEngine(page, configPath, values)
    {
        await page.addInitScript((override) => {
            let storedGameManager = false;
            let applyOverride = () => Object.assign(storedGameManager.config.get(override.configPath), override.values);
            let storeGameManager = (gameManager) => {
                storedGameManager = gameManager;
                gameManager.events.on('reldens.beforeCreateEngine', applyOverride);
            };
            Object.defineProperty(window, 'reldens', {
                configurable: true,
                get: () => storedGameManager,
                set: storeGameManager
            });
        }, {configPath, values});
    }

}

module.exports.InitialClientConfig = InitialClientConfig;
