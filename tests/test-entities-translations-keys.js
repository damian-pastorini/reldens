/**
 *
 * Reldens - Test Entities Translations Keys
 *
 */

const { BaseTest } = require('./base-test');
const { EntitiesLoader } = require('../lib/game/server/entities-loader');
const { entitiesConfig } = require('../generated-entities/entities-config');
const { entitiesTranslations } = require('../generated-entities/entities-translations');
const { FileHandler } = require('@reldens/server-utils');

class TestEntitiesTranslationsKeys extends BaseTest
{

    loadPluginsLabels()
    {
        let reldensModuleLibPath = FileHandler.joinPaths(process.cwd(), 'lib');
        let pluginsTranslations = {labels: {}};
        for(let pluginName of EntitiesLoader.discoverPluginFolders(reldensModuleLibPath)){
            EntitiesLoader.loadPluginTranslations(
                FileHandler.joinPaths(reldensModuleLibPath, pluginName, 'server'),
                pluginsTranslations
            );
        }
        return pluginsTranslations.labels;
    }

    async testEveryPluginLabelKeyMatchesAnEntity()
    {
        await this.test('every plugin entity label key is an entity key or a table name', async () => {
            let entitiesKeys = [...Object.keys(entitiesConfig), ...Object.keys(entitiesTranslations.labels)];
            let unknownLabelsKeys = Object.keys(this.loadPluginsLabels()).filter((labelKey) => {
                return -1 === entitiesKeys.indexOf(labelKey);
            });
            this.assert.deepStrictEqual(unknownLabelsKeys, []);
        });
    }

    async testTheNpcsInventoriesLabelUsesTheEntityKey()
    {
        await this.test('the NPCs inventories label is set for the objects items inventory entity key', async () => {
            this.assert.strictEqual(this.loadPluginsLabels().objectsItemsInventory, 'NPCs Inventories');
        });
    }

}

module.exports.TestEntitiesTranslationsKeys = TestEntitiesTranslationsKeys;
