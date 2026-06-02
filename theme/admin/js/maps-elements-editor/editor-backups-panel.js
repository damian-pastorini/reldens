class EditorBackupsPanel
{
    constructor(editor)
    {
        this.editor = editor;
        this.basePath = '/reldens-admin/maps-elements-editor/api';
        this.backups = [];
        this.jsonFetcher = new EditorJsonFetcher();
    }

    async list()
    {
        let url = this.basePath+'/list-backups?mapName='+encodeURIComponent(this.editor.mapName);
        let data = await this.jsonFetcher.fetch(url);
        this.backups = data && data.backups ? data.backups : [];
        return this.backups;
    }

    async postWithTimestamp(endpoint, backupTimestamp)
    {
        return this.jsonFetcher.post(this.basePath+endpoint, JSON.stringify({ // HOFF
            mapName: this.editor.mapName,
            backupTimestamp,
            context: this.editor.context
        }));
    }

    async restore(backupTimestamp)
    {
        return this.postWithTimestamp('/restore-backup', backupTimestamp);
    }

    async delete(backupTimestamp)
    {
        return this.postWithTimestamp('/delete-backup', backupTimestamp);
    }

    formatTimestamp(timestamp)
    {
        let parts = timestamp.split('-');
        if(6 > parts.length){
            return timestamp;
        }
        return parts[0]+'-'+parts[1]+'-'+parts[2]+' '+parts[3]+':'+parts[4]+':'+parts[5];
    }

    renderInto(container)
    {
        container.innerHTML = '';
        if(0 === this.backups.length){
            container.innerHTML = '<p>No backups available.</p>';
            return;
        }
        for(let backup of this.backups){
            container.appendChild(this.buildBackupRow(backup));
        }
    }

    buildBackupRow(backup)
    {
        let row = document.createElement('div');
        row.className = 'backups-panel-row';
        let label = document.createElement('span');
        label.textContent = this.formatTimestamp(backup.timestamp);
        row.appendChild(label);
        row.appendChild(EditorButtonFactory.create(
            'Reload', 'button-primary', () => this.editor.confirmReload(backup.timestamp)
        ));
        row.appendChild(EditorButtonFactory.create(
            'Delete', 'button-danger', () => this.editor.confirmDeleteBackup(backup.timestamp)
        ));
        return row;
    }
}
window.EditorBackupsPanel = EditorBackupsPanel;
