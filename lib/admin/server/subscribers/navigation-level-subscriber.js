/**
 *
 * Reldens - NavigationLevelSubscriber
 *
 * Adds the level class to the sidebar items of the entities with a navigationLevel in their admin configuration
 * (EntitiesConfigOverrides). The @reldens/cms sidebar builder renders every entity item only with its name and path,
 * so before the groups are built (reldens.adminSideBarBeforeSubItems) those items are rendered again with the
 * sidebar-item.html template and the configured level.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 */
class NavigationLevelSubscriber
{

    /**
     * @param {AdminManager} adminManager
     */
    constructor(adminManager)
    {
        /** @type {EventsManager} */
        this.events = adminManager.events;
        this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on NavigationLevelSubscriber.');
            return false;
        }
        this.events.on('reldens.adminSideBarBeforeSubItems', async (event) => {
            await this.renderLevelItems(event.navigationContents, event.adminManager);
        });
        return true;
    }

    /**
     * @param {Object<string, string|Object<string, string>>} navigationContents
     * @param {AdminManager} adminManager
     * @returns {Promise<void>}
     */
    async renderLevelItems(navigationContents, adminManager)
    {
        for(let driverResource of adminManager.resources){
            let navigationLevel = sc.get(adminManager.entities[driverResource.entityKey]?.config, 'navigationLevel', '');
            if('' === navigationLevel){
                continue;
            }
            let navigationGroup = driverResource.options?.navigation?.name;
            let itemContents = navigationGroup ? navigationContents[navigationGroup] : navigationContents;
            itemContents[driverResource.id()] = await adminManager.contentsBuilder.render(
                adminManager.adminFilesContents.sideBarItem,
                {
                    name: sc.get(
                        adminManager.translations.labels,
                        driverResource.id(),
                        adminManager.translations.labels[driverResource.entityKey]
                    ),
                    path: adminManager.rootPath+'/'+driverResource.entityPath,
                    level: navigationLevel
                }
            );
        }
    }

}

module.exports.NavigationLevelSubscriber = NavigationLevelSubscriber;
