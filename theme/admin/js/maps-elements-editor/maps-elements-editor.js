class MapsElementsEditor
{
    static MOUSE_BUTTON_LEFT = 0;
    static MOUSE_BUTTON_RIGHT = 2;

    constructor(canvas, options)
    {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mapName = options.mapName;
        this.sessionId = options.sessionId || '';
        this.mapElementsFile = options.mapElementsFile || '';
        this.context = options.context || 'wizard';
        this.tileset = options.tileset || null;
        this.mapJson = null;
        this.mapElements = null;
        this.dirty = false;
        this.hoveredInstanceId = null;
        this.loader = new MapsElementsLoader(this);
        this.mover = new MapsElementsElementMover(this);
        this.duplicator = new MapsElementsElementDuplicator(this);
        this.deleter = new MapsElementsElementDeleter(this);
        this.resizer = new MapsElementsMapResizer(this);
        this.contextMenu = new MapsElementsEditorContextMenu(this);
        this.saver = new MapsElementsEditorSave(this);
        this.backupsPanel = new MapsElementsEditorBackupsPanel(this);
    }

    async load()
    {
        let mapJsonResponse = await fetch('/generated/'+this.mapName+'.json');
        this.mapJson = await mapJsonResponse.json();
        this.mapElements = await this.loader.load(this.mapName, this.mapElementsFile);
        if(!this.mapElements){
            return false;
        }
        this.attachEventListeners();
        this.requestRender();
        return true;
    }

    attachEventListeners()
    {
        this.canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
        this.canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
        this.canvas.addEventListener('contextmenu', (event) => this.onContextMenu(event));
    }

    canvasToTile(event)
    {
        return MapsElementsEditor.eventToTile(event, this.canvas, this.canvas.getBoundingClientRect(), this.mapJson);
    }

    static eventToTile(event, canvas, rect, mapJson)
    {
        return {
            col: Math.floor((event.clientX - rect.left) * (canvas.width / rect.width) / mapJson.tilewidth),
            row: Math.floor((event.clientY - rect.top) * (canvas.height / rect.height) / mapJson.tileheight)
        };
    }

    pickElementAt(event)
    {
        let tile = this.canvasToTile(event);
        let picked = this.mover.findElementAt(tile.col, tile.row);
        if(!picked){
            return null;
        }
        return {element: picked, tile};
    }

    onMouseDown(event)
    {
        if(MapsElementsEditor.MOUSE_BUTTON_LEFT !== event.button){
            return;
        }
        if(this.contextMenu.isOpen()){
            this.contextMenu.hide();
        }
        let picked = this.pickElementAt(event);
        if(!picked){
            return;
        }
        this.mover.beginDrag(picked.element, picked.tile.col, picked.tile.row);
        this.requestRender();
    }

    onMouseMove(event)
    {
        let tile = this.canvasToTile(event);
        if(this.mover.dragState){
            this.mover.updateDrag(tile.col, tile.row);
            this.requestRender();
            return;
        }
        let element = this.mover.findElementAt(tile.col, tile.row);
        let nextId = element ? element.instanceId : null;
        if(nextId === this.hoveredInstanceId){
            return;
        }
        this.hoveredInstanceId = nextId;
        this.requestRender();
    }

    onMouseUp()
    {
        if(!this.mover.dragState){
            return;
        }
        this.mover.commitDrag();
        this.requestRender();
    }

    onContextMenu(event)
    {
        event.preventDefault();
        let tile = this.canvasToTile(event);
        let element = this.mover.findElementAt(tile.col, tile.row);
        if(!element){
            return;
        }
        this.contextMenu.show(element.instanceId, event.clientX, event.clientY);
    }

    requestRender()
    {
        if(!this.mapJson){
            return;
        }
        new MapsElementsCanvasPainter(this).render();
    }

    markDirty()
    {
        this.dirty = true;
    }

    requestDuplicate(instanceId)
    {
        this.duplicator.duplicate(instanceId);
    }

    confirmDeleteElement(instanceId)
    {
        adminFunctions.showConfirmDialog((confirmed) => {
            if(confirmed){
                this.deleter.delete(instanceId);
            }
        }, {
            title: 'Delete Element',
            message: 'Delete element "'+instanceId+'"? This removes every tile of every layer it owns.',
            confirmText: 'Delete',
            confirmClass: 'button-danger'
        });
    }

    showAsyncConfirm(dialogOptions, action)
    {
        adminFunctions.showConfirmDialog(async (confirmed) => {
            if(confirmed){
                await action();
            }
        }, dialogOptions);
    }

    confirmReload(backupTimestamp)
    {
        this.showAsyncConfirm({
            title: 'Reload Backup',
            message: 'Reload backup from '+backupTimestamp+'? A pre-restore backup will be written first.',
            confirmText: 'Reload',
            confirmClass: 'button-primary'
        }, async () => {
            let result = await this.backupsPanel.restore(backupTimestamp);
            if(result.success){
                await this.load();
            }
        });
    }

    confirmDeleteBackup(backupTimestamp)
    {
        this.showAsyncConfirm({
            title: 'Delete Backup',
            message: 'Delete backup '+backupTimestamp+'? This cannot be undone.',
            confirmText: 'Delete',
            confirmClass: 'button-danger'
        }, async () => {
            await this.backupsPanel.delete(backupTimestamp);
            await this.backupsPanel.list();
        });
    }

    async save()
    {
        let result = await this.saver.save();
        if(result.success){
            this.dirty = false;
        }
        return result;
    }
}
window.MapsElementsEditor = MapsElementsEditor;
