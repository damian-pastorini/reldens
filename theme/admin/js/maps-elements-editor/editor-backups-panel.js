class EditorBackupsPanel
{
    constructor(editor)
    {
        this.editor = editor;
        this.basePath = '/reldens-admin/maps-elements-editor/api';
        this.backups = [];
        this.publishedTimestamp = '';
        this.jsonFetcher = new EditorJsonFetcher();
    }

    async list()
    {
        let url = this.basePath+'/list-backups?mapName='+encodeURIComponent(this.editor.mapName);
        let data = await this.jsonFetcher.fetch(url);
        this.backups = data && data.backups ? data.backups : [];
        this.publishedTimestamp = data && data.publishedTimestamp ? data.publishedTimestamp : '';
        return this.backups;
    }

    isUnpublished()
    {
        if(0 === this.backups.length){
            return false;
        }
        return this.backups[0].timestamp !== this.publishedTimestamp;
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
        label.className = 'backups-panel-row-label';
        label.textContent = this.formatTimestamp(backup.timestamp);
        row.appendChild(label);
        if(backup.timestamp === this.publishedTimestamp){
            let publishedTag = document.createElement('span');
            publishedTag.className = 'backups-panel-row-published';
            publishedTag.textContent = 'Published';
            row.appendChild(publishedTag);
        }
        row.appendChild(this.editor.ui.buildButton(
            'Reload', 'button-primary', () => this.editor.confirmations.confirmReload(backup.timestamp)
        ));
        row.appendChild(this.editor.ui.buildButton(
            'Delete', 'button-danger', () => this.editor.confirmations.confirmDeleteBackup(backup.timestamp)
        ));
        return row;
    }
}
window.EditorBackupsPanel = EditorBackupsPanel;
