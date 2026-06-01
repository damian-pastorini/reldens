class MapsElementsEditorBackupsPanel
{
    static BASE_PATH = '/reldens-admin/maps-elements-editor/api';

    constructor(editor)
    {
        this.editor = editor;
        this.backups = [];
    }

    async list()
    {
        let url = MapsElementsEditorBackupsPanel.BASE_PATH
            +'/list-backups?mapName='+encodeURIComponent(this.editor.mapName);
        let data = await (await fetch(url)).json();
        this.backups = data.backups || [];
        return this.backups;
    }

    async postWithTimestamp(endpoint, backupTimestamp)
    {
        return (await fetch(MapsElementsEditorBackupsPanel.BASE_PATH+endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ // HOFF
                mapName: this.editor.mapName,
                backupTimestamp,
                context: this.editor.context
            })
        })).json();
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
        let reloadBtn = document.createElement('button');
        reloadBtn.type = 'button';
        reloadBtn.className = 'button button-sm button-primary';
        reloadBtn.textContent = 'Reload';
        reloadBtn.addEventListener('click', () => this.editor.confirmReload(backup.timestamp));
        let deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'button button-sm button-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => this.editor.confirmDeleteBackup(backup.timestamp));
        row.appendChild(label);
        row.appendChild(reloadBtn);
        row.appendChild(deleteBtn);
        return row;
    }
}
window.MapsElementsEditorBackupsPanel = MapsElementsEditorBackupsPanel;
