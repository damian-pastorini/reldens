class ElementsLoader
{
    constructor(editor)
    {
        this.editor = editor;
        this.basePath = '/reldens-admin/maps-elements-editor/api';
        this.generatedPath = '/reldens-admin/generated/';
        this.jsonFetcher = new EditorJsonFetcher();
    }

    async load(mapName, mapElementsFile)
    {
        if(mapElementsFile){
            let record = await this.jsonFetcher.fetch(this.generatedPath+mapElementsFile);
            if(record){
                return record;
            }
        }
        let fromLayers = await this.jsonFetcher.fetch(
            this.basePath+'/build-elements-from-layers?mapName='+encodeURIComponent(mapName)
        );
        if(fromLayers){
            return fromLayers.mapElements;
        }
        return null;
    }
}
window.ElementsLoader = ElementsLoader;
