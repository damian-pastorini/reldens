class MapsElementsEditor
{
    constructor(canvas, options)
    {
        this.mouseButtonLeft = 0;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mapName = options.mapName;
        this.sessionId = options.sessionId || '';
        this.mapElementsFile = options.mapElementsFile || '';
        this.context = options.context || 'wizard';
        this.tileset = options.tileset || null;
        this.onPublishedState = options.onPublishedState || null;
        this.mapJson = null;
        this.mapElements = null;
        this.dirty = false;
        this.hoveredInstanceId = null;
        this.listenersAttached = false;
        this.onMouseDownHandler = null;
        this.onMouseMoveHandler = null;
        this.onMouseUpHandler = null;
        this.onContextMenuHandler = null;
        this.escapeListener = null;
        this.renderScheduled = false;
        this.apiBasePath = '/reldens-admin/maps-elements-editor/api';
        this.generatedBasePath = '/reldens-admin/generated/';
        this.runtimeBasePath = '/assets/maps/';
        this.sourceBasePath = 'room' === this.context ? this.runtimeBasePath : this.generatedBasePath;
        this.jsonFetcher = new EditorJsonFetcher();
        this.mover = new ElementMover(this);
        this.duplicator = new ElementDuplicator(this);
        this.deleter = new ElementDeleter(this);
        this.resizer = new MapResizer(this);
        this.contextMenu = new EditorContextMenu(this);
        this.backupsPanel = new EditorBackupsPanel(this);
        this.painter = new MapElementsCanvasPainter(this);
        this.ui = new EditorUi(this);
        this.resetController = new EditorResetController(this);
        this.zOrderSorter = new ElementZOrderSorter(this);
        this.layersNormalizer = new MapLayersNormalizer();
    }

    async load()
    {
        let mapJsonResponse = await fetch(this.sourceBasePath+this.mapName+'.json', {cache: 'no-store'});
        this.mapJson = await mapJsonResponse.json();
        this.mapElements = await this.loadElements(this.mapName, this.mapElementsFile);
        if(!this.mapElements){
            return false;
        }
        this.layersNormalizer.explode(this.mapJson, this.mapElements);
        this.zOrderSorter.sort();
        this.resetController.captureSnapshot();
        await this.resetController.ensureInitialBackup();
        this.mover.buildTileIndex();
        this.painter.baseDirty = true;
        this.ui.build();
        this.attachEventListeners();
        this.requestRender();
        await this.refreshBackupsList();
        return true;
    }

    afterMutation()
    {
        this.zOrderSorter.sort();
        this.mover.buildTileIndex();
        this.painter.baseDirty = true;
        this.requestRender();
    }

    attachEventListeners()
    {
        if(this.listenersAttached){
            return;
        }
        this.listenersAttached = true;
        this.onMouseDownHandler = (event) => this.onMouseDown(event);
        this.onMouseMoveHandler = (event) => this.onMouseMove(event);
        this.onMouseUpHandler = () => this.onMouseUp();
        this.onContextMenuHandler = (event) => this.onContextMenu(event);
        this.escapeListener = (event) => {
            if('Escape' === event.key){
                this.cancelDuplicate();
            }
        };
        this.canvas.addEventListener('mousedown', this.onMouseDownHandler);
        this.canvas.addEventListener('mousemove', this.onMouseMoveHandler);
        this.canvas.addEventListener('mouseup', this.onMouseUpHandler);
        this.canvas.addEventListener('mouseleave', this.onMouseUpHandler);
        this.canvas.addEventListener('contextmenu', this.onContextMenuHandler);
        document.addEventListener('keydown', this.escapeListener);
    }

    dispose()
    {
        if(this.listenersAttached){
            this.listenersAttached = false;
            this.canvas.removeEventListener('mousedown', this.onMouseDownHandler);
            this.canvas.removeEventListener('mousemove', this.onMouseMoveHandler);
            this.canvas.removeEventListener('mouseup', this.onMouseUpHandler);
            this.canvas.removeEventListener('mouseleave', this.onMouseUpHandler);
            this.canvas.removeEventListener('contextmenu', this.onContextMenuHandler);
            document.removeEventListener('keydown', this.escapeListener);
        }
        if(this.contextMenu){
            this.contextMenu.hide();
        }
        this.ui.dispose();
        delete this.canvas.mapsElementsEditor;
    }

    canvasToTile(event)
    {
        return this.canvasEventToTile(event, this.canvas.getBoundingClientRect());
    }

    canvasEventToTile(event, rect)
    {
        return {
            col: Math.floor((event.clientX - rect.left) * (this.canvas.width / rect.width) / this.mapJson.tilewidth),
            row: Math.floor((event.clientY - rect.top) * (this.canvas.height / rect.height) / this.mapJson.tileheight)
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
        if(this.mouseButtonLeft !== event.button){
            return;
        }
        if(this.contextMenu.isOpen()){
            this.contextMenu.hide();
        }
        if(this.duplicator.isPlacing()){
            this.duplicator.confirmPlacing();
            this.ui.refreshCancelDuplicate(this.duplicator.isPlacing());
            return;
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
        if(this.duplicator.isPlacing()){
            this.duplicator.updatePlacing(tile.col, tile.row);
            this.requestRender();
            return;
        }
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
        if(this.renderScheduled){
            return;
        }
        this.renderScheduled = true;
        requestAnimationFrame(() => {
            this.renderScheduled = false;
            this.painter.render();
        });
    }

    markDirty()
    {
        this.dirty = true;
        this.ui.refreshDirty(true);
    }

    requestDuplicate(instanceId)
    {
        if(!this.duplicator.startPlacing(instanceId)){
            return;
        }
        this.ui.refreshCancelDuplicate(true);
        this.requestRender();
    }

    cancelDuplicate()
    {
        if(this.duplicator.cancelPlacing()){
            this.ui.refreshCancelDuplicate(false);
        }
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

    confirmReload(backupTimestamp)
    {
        adminFunctions.showConfirmDialog(async (confirmed) => {
            if(!confirmed){
                return;
            }
            let result = await this.backupsPanel.restore(backupTimestamp);
            if(result.success){
                await this.load();
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
            await this.backupsPanel.delete(backupTimestamp);
            await this.refreshBackupsList();
        }, {
            title: 'Delete Backup',
            message: 'Delete backup '+backupTimestamp+'? This cannot be undone.',
            confirmText: 'Delete',
            confirmClass: 'button-danger'
        });
    }

    async handleSaveClick()
    {
        if('room' !== this.context){
            await this.performSave();
            return;
        }
        adminFunctions.showConfirmDialog(async (confirmed) => {
            if(!confirmed){
                return;
            }
            await this.performSave();
        }, {
            title: 'Save Map',
            message: 'Are you sure you want to save this map?'
                +' IMPORTANT: the map will be overwritten, and a server restart is required to publish the updates.',
            confirmText: 'Save',
            confirmClass: 'button-primary'
        });
    }

    async performSave()
    {
        let result = await this.save();
        this.ui.flashSaveButton(result.success);
    }

    async save()
    {
        let result = await this.jsonFetcher.post(this.apiBasePath+'/save-map-edit', JSON.stringify({ // HOFF
            mapName: this.mapName,
            sessionId: this.sessionId,
            context: this.context,
            mapElements: this.mapElements
        }));
        if(result.success){
            this.dirty = false;
            this.ui.refreshDirty(false);
            await this.refreshBackupsList();
        }
        return result;
    }

    async loadElements(mapName, mapElementsFile)
    {
        if(mapElementsFile){
            let record = await this.jsonFetcher.fetch(this.generatedBasePath+mapElementsFile, {cache: 'no-store'});
            if(record){
                return record;
            }
        }
        return (await this.jsonFetcher.fetch(
            this.apiBasePath+'/build-elements-from-layers?mapName='+encodeURIComponent(mapName)
        ))?.mapElements ?? null;
    }

    async refreshBackupsList()
    {
        await this.backupsPanel.list();
        this.backupsPanel.renderInto(this.ui.backupsListEl);
        if(this.onPublishedState){
            this.onPublishedState(this.backupsPanel.isUnpublished());
        }
    }
}
window.MapsElementsEditor = MapsElementsEditor;
