class EditorUi
{
    constructor(editor)
    {
        this.editor = editor;
        this.container = null;
        this.toolbar = null;
        this.saveBtn = null;
        this.cancelDuplicateBtn = null;
        this.dirtyIndicator = null;
        this.backupsPanelEl = null;
        this.backupsListEl = null;
        this.resizePanelEl = null;
        this.saveBtnResetTimer = null;
        this.zoomLevel = 1;
        this.zoomMin = 0.25;
        this.zoomMax = 4;
        this.zoomStep = 0.25;
    }

    build()
    {
        if(this.container){
            return;
        }
        this.container = document.createElement('div');
        this.container.className = 'maps-elements-editor';
        this.editor.canvas.parentNode.insertBefore(this.container, this.editor.canvas);
        this.toolbar = this.buildToolbar();
        this.container.appendChild(this.toolbar);
        this.backupsPanelEl = this.buildBackupsPanel();
        this.container.appendChild(this.backupsPanelEl);
        this.resizePanelEl = this.buildResizePanel();
        this.container.appendChild(this.resizePanelEl);
        this.canvasScrollContainer = document.createElement('div');
        this.canvasScrollContainer.className = 'editor-canvas-scroll';
        this.canvasScrollContainer.appendChild(this.editor.canvas);
        this.container.appendChild(this.canvasScrollContainer);
        this.applyZoom();
    }

    buildToolbar()
    {
        let toolbar = document.createElement('div');
        toolbar.className = 'elements-editor-toolbar';
        this.saveBtn = EditorButtonFactory.create('Save', 'button-primary', () => this.editor.handleSaveClick());
        toolbar.appendChild(this.saveBtn);
        toolbar.appendChild(
            EditorButtonFactory.create('Backups', 'button-secondary', () => this.toggleBackupsPanel())
        );
        toolbar.appendChild(
            EditorButtonFactory.create('Resize', 'button-secondary', () => this.toggleResizePanel())
        );
        toolbar.appendChild(
            EditorButtonFactory.create('Reset', 'button-secondary', () => this.editor.resetController.confirmRestore())
        );
        this.dirtyIndicator = document.createElement('span');
        this.dirtyIndicator.className = 'dirty-indicator hidden';
        this.dirtyIndicator.textContent = 'Unsaved changes';
        toolbar.appendChild(this.dirtyIndicator);
        this.cancelDuplicateBtn = EditorButtonFactory.create(
            'Cancel duplication',
            'button-danger hidden',
            () => this.editor.cancelDuplicate()
        );
        toolbar.appendChild(this.cancelDuplicateBtn);
        toolbar.appendChild(this.buildZoomControls());
        return toolbar;
    }

    buildZoomControls()
    {
        let wrapper = document.createElement('div');
        wrapper.className = 'editor-zoom-controls';
        wrapper.appendChild(
            EditorButtonFactory.create('-', 'button-secondary', () => this.zoomBy(-this.zoomStep))
        );
        this.zoomLabel = document.createElement('span');
        this.zoomLabel.className = 'editor-zoom-level';
        this.zoomLabel.textContent = this.formatZoom();
        wrapper.appendChild(this.zoomLabel);
        wrapper.appendChild(
            EditorButtonFactory.create('+', 'button-secondary', () => this.zoomBy(this.zoomStep))
        );
        return wrapper;
    }

    zoomBy(delta)
    {
        let next = Math.min(this.zoomMax, Math.max(this.zoomMin, this.zoomLevel + delta));
        if(next === this.zoomLevel){
            return;
        }
        this.zoomLevel = next;
        this.applyZoom();
    }

    applyZoom()
    {
        let mapJson = this.editor.mapJson;
        if(!mapJson){
            return;
        }
        this.editor.canvas.style.width = (mapJson.width * mapJson.tilewidth * this.zoomLevel)+'px';
        this.editor.canvas.style.height = (mapJson.height * mapJson.tileheight * this.zoomLevel)+'px';
        if(this.zoomLabel){
            this.zoomLabel.textContent = this.formatZoom();
        }
    }

    formatZoom()
    {
        return Math.round(this.zoomLevel * 100)+'%';
    }

    buildBackupsPanel()
    {
        let panel = document.createElement('div');
        panel.className = 'backups-panel hidden';
        this.backupsListEl = document.createElement('div');
        this.backupsListEl.className = 'backups-panel-list';
        panel.appendChild(this.backupsListEl);
        return panel;
    }

    buildResizePanel()
    {
        let panel = document.createElement('div');
        panel.className = 'resize-panel hidden';
        this.editor.resizer.buildPanelInto(panel);
        return panel;
    }

    refreshDirty(isDirty)
    {
        if(!this.dirtyIndicator){
            return;
        }
        this.dirtyIndicator.classList.toggle('hidden', !isDirty);
    }

    refreshCancelDuplicate(isPlacing)
    {
        if(!this.cancelDuplicateBtn){
            return;
        }
        this.cancelDuplicateBtn.classList.toggle('hidden', !isPlacing);
    }

    flashSaveButton(success)
    {
        if(!this.saveBtn){
            return;
        }
        if(this.saveBtnResetTimer){
            clearTimeout(this.saveBtnResetTimer);
        }
        this.saveBtn.textContent = success ? 'Saved' : 'Save failed';
        this.saveBtnResetTimer = setTimeout(() => {
            this.saveBtn.textContent = 'Save';
            this.saveBtnResetTimer = null;
        }, 1500);
    }

    toggleBackupsPanel()
    {
        if(!this.backupsPanelEl){
            return;
        }
        let willShow = this.backupsPanelEl.classList.contains('hidden');
        this.backupsPanelEl.classList.toggle('hidden', !willShow);
        if(!willShow){
            return;
        }
        this.editor.refreshBackupsList().catch((error) => {
            this.editor.refreshBackupsListError = error;
        });
    }

    toggleResizePanel()
    {
        if(!this.resizePanelEl){
            return;
        }
        this.resizePanelEl.classList.toggle('hidden');
    }
}
window.EditorUi = EditorUi;
