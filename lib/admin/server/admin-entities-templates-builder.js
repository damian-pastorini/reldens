/**
 *
 * Reldens - AdminEntitiesTemplatesBuilder
 *
 */

const { sc } = require('@reldens/utils');

class AdminEntitiesTemplatesBuilder
{

    constructor(props)
    {
        this.themeManager = props.themeManager;
    }

    async build(translations, rootPath, sideBarContents)
    {
        /*
        let navigationContents = {};
        for(let driverResource of this.dataServer.resources){
            let navigation = driverResource.options?.navigation;
            let name = translations.labels[driverResource.id()];
            let path = rootPath+'/'+(driverResource.id().replace(/_/g, '-'));
            if(navigation?.name){
                if(!navigationContents[navigation.name]){
                    navigationContents[navigation.name] = {};
                }
                navigationContents[navigation.name][driverResource.id()] = await this.themeManager.templateEngine.render(
                    this.adminFilesContents.sidebarItem,
                    {name, path}
                );
                continue;
            }
            navigationContents[driverResource.id()] = await this.themeManager.templateEngine.render(
                this.adminFilesContents.sidebarItem,
                {name, path}
            );
        }
        let navigationView = '';
        for(let id of Object.keys(navigationContents)){
            if(sc.isObject(navigationContents[id])){
                let subItems = '';
                for(let subId of Object.keys(navigationContents[id])){
                    subItems += navigationContents[id][subId];
                }
                navigationView += await this.themeManager.templateEngine.render(
                    this.adminFilesContents.sidebarHeader,
                    {name: id, subItems}
                )
                continue;
            }
            navigationView += navigationContents[id];
        }
        return navigationView;
        */
    }

}

module.exports.AdminEntitiesTemplatesBuilder = AdminEntitiesTemplatesBuilder;
