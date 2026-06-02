class EditorSave
{
    constructor(editor)
    {
        this.editor = editor;
        this.basePath = '/reldens-admin/maps-elements-editor/api';
        this.jsonFetcher = new EditorJsonFetcher();
    }

    async save()
    {
        return this.jsonFetcher.post(this.basePath+'/save-map-edit', JSON.stringify({ // HOFF
            mapName: this.editor.mapName,
            sessionId: this.editor.sessionId,
            context: this.editor.context,
            mapJson: this.editor.mapJson,
            mapElements: this.editor.mapElements
        }));
    }
}
window.EditorSave = EditorSave;
