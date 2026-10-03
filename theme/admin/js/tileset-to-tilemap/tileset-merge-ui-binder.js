class TilesetMergeUiBinder
{
    constructor(merger)
    {
        this.merger = merger;
        this.app = merger.app;
    }

    enableAutoResizeOnRow(row)
    {
        row.querySelector('.tileset-merge-auto-resize').checked = true;
        row.querySelector('.tileset-merge-resize-options').classList.remove('hidden');
    }

    buildIncompatibleMessage(incompatible)
    {
        return 'There\'s a tileset for '+incompatible.existingW+'x'+incompatible.existingH
            +' already selected for merge. The current tileset with tile size '
            +incompatible.currentW+'x'+incompatible.currentH+' is not compatible.'
            +' Would you like to automatically resize this tileset?';
    }

    handleIncompatibleAccepted(tilesetIndex, mergeCheckbox)
    {
        mergeCheckbox.checked = true;
        this.merger.setAutoResizeForAllChecked(tilesetIndex);
        this.app.generator.updateMergeButtonState();
    }

    confirmIncompatibleAutoResize(tilesetIndex, mergeCheckbox, mergeConfig, incompatible)
    {
        let message = this.buildIncompatibleMessage(incompatible);
        this.app.modals.show(
            message,
            () => this.handleIncompatibleAccepted(tilesetIndex, mergeCheckbox),
            {
                label: 'Check merge options',
                callback: () => mergeConfig.classList.remove('hidden')
            }
        );
    }

    onMergeCheckboxChange(tilesetIndex, mergeCheckbox, mergeConfig)
    {
        if(!mergeCheckbox.checked){
            this.app.generator.updateMergeButtonState();
            return;
        }
        let incompatible = this.merger.checkMergeTileSizeCompatibility(tilesetIndex);
        if(!incompatible){
            this.app.generator.updateMergeButtonState();
            return;
        }
        mergeCheckbox.checked = false;
        this.confirmIncompatibleAutoResize(tilesetIndex, mergeCheckbox, mergeConfig, incompatible);
    }

    promptAddToMerge(mergeCheckbox)
    {
        this.app.modals.show(
            'Would you like to add this tileset to merge?',
            () => {
                mergeCheckbox.checked = true;
                this.app.generator.updateMergeButtonState();
            },
            null
        );
    }

    confirmRemoveIncompatible(incompatibleRow, onAccept)
    {
        let incompatibleCheckbox = incompatibleRow.row.querySelector('.tileset-merge-checkbox');
        let incompatibleTileset = this.app.state[incompatibleRow.index];
        this.app.modals.show(
            '"'+incompatibleTileset.filename+'" does not have a compatible tile size and will be removed from merge.'
            +' Do you wish to proceed?',
            () => {
                incompatibleCheckbox.checked = false;
                onAccept();
            }
        );
    }

    processIncompatibleQueue(incompatibleRows, removedRef, nextIndex)
    {
        if(nextIndex >= incompatibleRows.length){
            if(removedRef.removed > 0){
                this.app.generator.updateMergeButtonState();
            }
            return;
        }
        this.confirmRemoveIncompatible(incompatibleRows[nextIndex], () => {
            removedRef.removed++;
            this.processIncompatibleQueue(incompatibleRows, removedRef, nextIndex + 1);
        });
    }

    handleAutoResizeUnchecked(tilesetIndex)
    {
        let incompatibleRows = this.merger.findIncompatibleMergeRows(tilesetIndex);
        if(!incompatibleRows.length){
            return;
        }
        this.processIncompatibleQueue(incompatibleRows, { removed: 0 }, 0);
    }

    onAutoResizeChange(tilesetIndex, autoResizeCheckbox, mergeCheckbox, resizeOptions)
    {
        resizeOptions.classList.toggle('hidden', !autoResizeCheckbox.checked);
        if(autoResizeCheckbox.checked && !mergeCheckbox.checked){
            this.promptAddToMerge(mergeCheckbox);
            return;
        }
        if(!autoResizeCheckbox.checked && mergeCheckbox.checked){
            this.handleAutoResizeUnchecked(tilesetIndex);
        }
    }
}
window.TilesetMergeUiBinder = TilesetMergeUiBinder;
