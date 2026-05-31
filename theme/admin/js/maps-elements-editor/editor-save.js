class MapsElementsEditorSave
{
    static BASE_PATH = '/reldens-admin/maps-elements-editor/api';

    constructor(editor)
    {
        this.editor = editor;
    }

    async save()
    {
        return (await fetch(MapsElementsEditorSave.BASE_PATH+'/save-map-edit', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ // HOFF
                mapName: this.editor.mapName,
                sessionId: this.editor.sessionId,
                context: this.editor.context,
                mapJson: this.editor.mapJson,
                mapElements: this.editor.mapElements
            })
        })).json();
    }
}
window.MapsElementsEditorSave = MapsElementsEditorSave;
