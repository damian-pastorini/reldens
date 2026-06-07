class EditorResetController
{
    constructor(editor)
    {
        this.editor = editor;
        this.basePath = '/reldens-admin/maps-elements-editor/api';
        this.lastLoadedMapJsonSnapshot = null;
        this.lastLoadedMapElementsSnapshot = null;
        this.lastError = null;
    }

    captureSnapshot()
    {
        this.lastLoadedMapJsonSnapshot = JSON.stringify(this.editor.mapJson); // HOFF
        this.lastLoadedMapElementsSnapshot = JSON.stringify(this.editor.mapElements); // HOFF
    }

    restore()
    {
        if(!this.lastLoadedMapJsonSnapshot){
            return false;
        }
        this.editor.mapJson = JSON.parse(this.lastLoadedMapJsonSnapshot); // HOFF
        this.editor.mapElements = JSON.parse(this.lastLoadedMapElementsSnapshot); // HOFF
        this.editor.dirty = false;
        this.editor.ui.refreshDirty(false);
        this.editor.mover.buildTileIndex();
        this.editor.painter.markBaseDirty();
        this.editor.requestRender();
        return true;
    }

    confirmRestore()
    {
        adminFunctions.showConfirmDialog((confirmed) => {
            if(confirmed){
                this.restore();
            }
        }, {
            title: 'Reset',
            message: 'Discard ALL unsaved changes since the last loaded state? This cannot be undone.',
            confirmText: 'Reset',
            confirmClass: 'button-danger'
        });
    }

    async ensureInitialBackup()
    {
        try {
            await fetch(this.basePath+'/ensure-initial-backup', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ // HOFF
                    mapName: this.editor.mapName,
                    context: this.editor.context
                })
            });
        } catch(error){
            this.lastError = error;
        }
    }
}
window.EditorResetController = EditorResetController;
