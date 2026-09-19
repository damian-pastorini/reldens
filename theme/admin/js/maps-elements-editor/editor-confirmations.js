class EditorConfirmations
{
    constructor(editor)
    {
        this.editor = editor;
    }

    confirmDeleteElement(instanceId)
    {
        adminFunctions.showConfirmDialog((confirmed) => {
            if(confirmed){
                this.editor.deleter.delete(instanceId);
            }
        }, {
            title: 'Delete Element',
            message: 'Delete element "'+instanceId+'"? This removes every tile of every layer it owns.',
            confirmText: 'Delete',
            confirmClass: 'button-danger'
        });
    }

    confirmReload(backupTimestamp)
    {
        adminFunctions.showConfirmDialog(async (confirmed) => {
            if(!confirmed){
                return;
            }
            let result = await this.editor.backupsPanel.restore(backupTimestamp);
            if(result.success){
                await this.editor.load();
            }
        }, {
            title: 'Reload Backup',
            message: 'Reload backup from '+backupTimestamp+'? A pre-restore backup will be written first.',
            confirmText: 'Reload',
            confirmClass: 'button-primary'
        });
    }

    confirmDeleteBackup(backupTimestamp)
    {
        adminFunctions.showConfirmDialog(async (confirmed) => {
            if(!confirmed){
                return;
            }
            await this.editor.backupsPanel.delete(backupTimestamp);
            await this.editor.refreshBackupsList();
        }, {
            title: 'Delete Backup',
            message: 'Delete backup '+backupTimestamp+'? This cannot be undone.',
            confirmText: 'Delete',
            confirmClass: 'button-danger'
        });
    }

    async handleSaveClick()
    {
        if('room' !== this.editor.context){
            await this.editor.performSave();
            return;
        }
        adminFunctions.showConfirmDialog(async (confirmed) => {
            if(!confirmed){
                return;
            }
            await this.editor.performSave();
        }, this.saveConfirmOptions());
    }

    saveConfirmOptions()
    {
        return {
            title: 'Save Map',
            message: 'Are you sure you want to save this map?'
                +' IMPORTANT: the map will be overwritten, and a server restart is required to publish the updates.',
            confirmText: 'Save',
            confirmClass: 'button-primary'
        };
    }
}
window.EditorConfirmations = EditorConfirmations;
