class MapsElementsLoader
{
    static BASE_PATH = '/reldens-admin/maps-elements-editor/api';

    constructor(editor)
    {
        this.editor = editor;
        this.source = '';
        this.warnings = [];
    }

    async load(mapName, mapElementsFile)
    {
        if(mapElementsFile){
            let sidecar = await this.tryFetchJson('/generated/'+mapElementsFile);
            if(sidecar){
                this.source = 'sidecar';
                return sidecar;
            }
        }
        let fromLayers = await this.fetchFromLayers(mapName);
        if(fromLayers){
            this.source = 'layers';
            this.warnings = fromLayers.warnings || [];
            return fromLayers.mapElements;
        }
        this.source = 'none';
        return null;
    }

    async tryFetchJson(url)
    {
        try {
            let response = await fetch(url);
            if(!response.ok){
                return null;
            }
            return await response.json();
        } catch(error){
            this.lastError = error;
            return null;
        }
    }

    async fetchFromLayers(mapName)
    {
        return this.tryFetchJson(
            MapsElementsLoader.BASE_PATH+'/build-elements-from-layers?mapName='+encodeURIComponent(mapName)
        );
    }
}
window.MapsElementsLoader = MapsElementsLoader;
