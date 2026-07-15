class EditorUi
{
    constructor(editor)
    {
        this.editor = editor;
        this.saveBtnResetTimer = null;
        this.resetDomReferences();
        this.zoomLevel = 1;
        this.zoomMin = 0.25;
        this.zoomMax = 4;
        this.zoomStep = 0.25;
    }

    resetDomReferences()
    {
        this.container = null;
        this.toolbar = null;
        this.saveBtn = null;
        this.cancelDuplicateBtn = null;
        this.dirtyIndicator = null;
        this.backupsPanelEl = null;
        this.backupsListEl = null;
        this.resizePanelEl = null;
        this.canvasScrollContainer = null;
        this.zoomLabel = null;
        this.originalCanvasParent = null;
    }

    buildButton(label, extraClass, handler)
    {
        let button = document.createElement('button');
        button.type = 'button';
        button.className = 'button button-sm '+extraClass;
        button.textContent = label;
        button.addEventListener('click', handler);
        return button;
    }

    build()
    {
        if(this.container){
            return;
        }
        this.originalCanvasParent = this.editor.canvas.parentNode;
        this.container = document.createElement('div');
        this.container.className = 'maps-elements-editor';
        this.originalCanvasParent.insertBefore(this.container, this.editor.canvas);
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

    dispose()
    {
        if(!this.container){
            return;
        }
        if(this.originalCanvasParent && this.editor.canvas){
            this.originalCanvasParent.appendChild(this.editor.canvas);
        }
        this.container.remove();
        this.clearSaveBtnResetTimer();
        this.resetDomReferences();
    }

    clearSaveBtnResetTimer()
    {
        if(!this.saveBtnResetTimer){
            return;
        }
        clearTimeout(this.saveBtnResetTimer);
        this.saveBtnResetTimer = null;
    }

    buildToolbar()
    {
        let toolbar = document.createElement('div');
        toolbar.className = 'elements-editor-toolbar';
        this.saveBtn = this.buildButton('Save', 'button-primary', () => {
            this.closeOtherPanels(null);
            this.editor.handleSaveClick();
        });
        toolbar.appendChild(this.saveBtn);
        toolbar.appendChild(
            this.buildButton('Backups', 'button-secondary', () => {
                this.closeOtherPanels(this.backupsPanelEl);
                this.toggleBackupsPanel();
            })
        );
        toolbar.appendChild(
            this.buildButton('Resize', 'button-secondary', () => {
                this.closeOtherPanels(this.resizePanelEl);
                this.toggleResizePanel();
            })
        );
        toolbar.appendChild(
            this.buildButton('Reset', 'button-secondary', () => {
                this.closeOtherPanels(null);
                this.editor.resetController.confirmRestore();
            })
        );
        this.dirtyIndicator = document.createElement('span');
        this.dirtyIndicator.className = 'dirty-indicator hidden';
        this.dirtyIndicator.textContent = 'Unsaved changes';
        toolbar.appendChild(this.dirtyIndicator);
        this.cancelDuplicateBtn = this.buildButton(
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
            this.buildButton('-', 'button-secondary', () => this.zoomBy(-this.zoomStep))
        );
        this.zoomLabel = document.createElement('span');
        this.zoomLabel.className = 'editor-zoom-level';
        this.zoomLabel.textContent = this.formatZoom();
        wrapper.appendChild(this.zoomLabel);
        wrapper.appendChild(
            this.buildButton('+', 'button-secondary', () => this.zoomBy(this.zoomStep))
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
        this.clearSaveBtnResetTimer();
        this.saveBtn.textContent = success ? 'Saved' : 'Save failed';
        this.saveBtnResetTimer = setTimeout(() => {
            this.saveBtn.textContent = 'Save';
            this.saveBtnResetTimer = null;
        }, 1500);
    }

    closeOtherPanels(keepPanelEl)
    {
        if(this.isPanelOpen(this.backupsPanelEl, keepPanelEl)){
            this.toggleBackupsPanel();
        }
        if(this.isPanelOpen(this.resizePanelEl, keepPanelEl)){
            this.toggleResizePanel();
        }
    }

    isPanelOpen(panelEl, keepPanelEl)
    {
        if(!panelEl){
            return false;
        }
        if(panelEl === keepPanelEl){
            return false;
        }
        return !panelEl.classList.contains('hidden');
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
        this.editor.resizer.previewActive = !this.resizePanelEl.classList.contains('hidden');
        this.editor.requestRender();
    }
}
window.EditorUi = EditorUi;
