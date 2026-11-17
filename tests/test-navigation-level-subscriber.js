/**
 *
 * Reldens - Test Navigation Level Subscriber
 *
 */

const { BaseTest } = require('./base-test');
const { NavigationLevelSubscriber } = require('../lib/admin/server/subscribers/navigation-level-subscriber');
const { EntitiesConfigOverrides } = require('../lib/admin/server/entities-config-override');
const { entitiesTranslations } = require('../generated-entities/entities-translations');

class TestNavigationLevelSubscriber extends BaseTest
{

    createAdminManager()
    {
        return {
            events: {on: () => true},
            rootPath: '/reldens-admin',
            adminFilesContents: {sideBarItem: 'sideBarItem'},
            translations: entitiesTranslations,
            contentsBuilder: {render: async (template, data) => template+'|'+data.name+'|'+data.path+'|'+data.level},
            entities: {
                adminSessions: {config: EntitiesConfigOverrides.adminSessions},
                features: {config: EntitiesConfigOverrides.features},
                rooms: {config: EntitiesConfigOverrides.rooms}
            },
            resources: [
                {id: () => 'admin_sessions', entityKey: 'adminSessions', entityPath: 'admin-sessions', options: {}},
                {id: () => 'features', entityKey: 'features', entityPath: 'features', options: {}},
                {id: () => 'rooms', entityKey: 'rooms', entityPath: 'rooms', options: {navigation: {name: 'Rooms'}}}
            ]
        };
    }

    async testTheConfiguredItemsGetTheirLevel()
    {
        await this.test('the entities with a navigation level are rendered again with the level class', async () => {
            let adminManager = this.createAdminManager();
            let navigationContents = {
                admin_sessions: 'cmsItem',
                features: 'cmsItem',
                Rooms: {rooms: 'cmsItem'}
            };
            await new NavigationLevelSubscriber(adminManager).renderLevelItems(navigationContents, adminManager);
            this.assert.deepStrictEqual(navigationContents, {
                admin_sessions: 'sideBarItem|Admin Sessions|/reldens-admin/admin-sessions|level-1',
                features: 'sideBarItem|Features|/reldens-admin/features|level-1',
                Rooms: {rooms: 'cmsItem'}
            });
        });
    }

}

module.exports.TestNavigationLevelSubscriber = TestNavigationLevelSubscriber;
