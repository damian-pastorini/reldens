class TilesetTileOptionsEvents
{
    constructor(binder)
    {
        this.binder = binder;
        this.spotPanelEvents = new TilesetSpotPanelEvents(binder);
    }

    iterateButtonsWithOptionKey(optionButtons, callback)
    {
        for(let optionBtn of optionButtons){
            let optionKey = optionBtn.dataset.option;
            if(!optionKey){
                continue;
            }
            callback(optionBtn, optionKey);
        }
    }

    bindOptionButtons(tilesetIndex, container, spotName)
    {
        let tileButtons = container.querySelectorAll('.tile-option-btn');
        this.iterateButtonsWithOptionKey(tileButtons, (optionBtn, optionKey) => {
            let isMulti = 'true' === optionBtn.dataset.multi;
            optionBtn.addEventListener('click', () => {
                if(!this.binder.toggleActivation(tilesetIndex, optionKey, null, isMulti, spotName)){
                    return;
                }
                this.binder.showActiveOptionAndRender(tilesetIndex, optionBtn);
            });
        });
    }

    bindClearButtons(tilesetIndex, container, spotName)
    {
        let clearButtons = container.querySelectorAll('.tile-option-clear');
        this.bindClearButtonGroup(clearButtons, tilesetIndex, spotName);
        let cellClearButtons = container.querySelectorAll('.tile-position-cell-clear');
        for(let cellClearBtn of cellClearButtons){
            cellClearBtn.addEventListener('click', (cellClickEvent) => {
                cellClickEvent.stopPropagation();
                this.binder.clearPositionCell(tilesetIndex, cellClearBtn, spotName ? spotName : null);
            });
        }
        let multiContainers = container.querySelectorAll('.tile-option-multi-values');
        for(let mc of multiContainers){
            mc.addEventListener('click', (multiClickEvent) => {
                let clearBtn = multiClickEvent.target.closest('.tile-multi-cell-clear');
                if(!clearBtn){
                    return;
                }
                multiClickEvent.stopPropagation();
                let valueStr = clearBtn.dataset.multiValue;
                let key = mc.dataset.multiOption;
                this.binder.clearer.clearArrayItem(tilesetIndex, key, valueStr, spotName ? spotName : null);
            });
        }
        let groupClearButtons = container.querySelectorAll('.tile-options-group-clear-all');
        this.bindClearButtonGroup(groupClearButtons, tilesetIndex, spotName);
    }

    bindReferenceButtons(containerEl)
    {
        let referenceButtons = containerEl.querySelectorAll('.tile-reference-btn');
        for(let refBtn of referenceButtons){
            refBtn.addEventListener('click', () => this.openReferenceModal(refBtn));
        }
    }

    withReferenceModal(callback)
    {
        let modal = document.querySelector('.tile-reference-modal');
        if(modal){
            callback(modal);
        }
    }

    openReferenceModal(refBtn)
    {
        this.withReferenceModal((modal) => {
            let refImg = modal.querySelector('.tile-reference-modal-img');
            let title = modal.querySelector('.tile-reference-modal-title');
            if(refImg){
                refImg.src = refBtn.dataset.referenceImg;
                refImg.alt = refBtn.dataset.referenceTitle;
            }
            if(title){
                title.textContent = refBtn.dataset.referenceTitle;
            }
            modal.classList.remove('hidden');
        });
    }

    initReferenceModal()
    {
        this.withReferenceModal((modal) => {
            let backdrop = modal.querySelector('.tile-reference-modal-backdrop');
            if(backdrop){
                backdrop.addEventListener('click', () => modal.classList.add('hidden'));
            }
            let closeBtn = modal.querySelector('.tile-reference-modal-close');
            if(closeBtn){
                closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
            }
        });
    }

    bindClearButtonGroup(clearButtonsList, tilesetIndex, spotName)
    {
        this.iterateButtonsWithOptionKey(clearButtonsList, (groupClearButton, optionKey) => {
            this.bindSingleClearButton(groupClearButton, optionKey, tilesetIndex, spotName);
        });
    }

    bindSingleClearButton(clearButtonEl, optionKey, tilesetIndex, spotName)
    {
        clearButtonEl.addEventListener('click', (clickEvent) => {
            clickEvent.stopPropagation();
            this.binder.dispatchGroupClear(tilesetIndex, optionKey, spotName ? spotName : null);
        });
    }

    bindPositionCells(tilesetIndex, container, spotName)
    {
        let cells = container.querySelectorAll('.tile-position-cell');
        for(let cell of cells){
            let grid = cell.closest('.tile-position-grid');
            if(!grid){
                continue;
            }
            let optionKey = cell.dataset.option ? cell.dataset.option : grid.dataset.option;
            let posKey = cell.dataset.pos;
            cell.addEventListener('click', (cellClickEvent) => {
                let cellClearBtn = cell.querySelector('.tile-position-cell-clear');
                if(cellClearBtn && (cellClickEvent.target === cellClearBtn || cellClearBtn.contains(cellClickEvent.target))){
                    return;
                }
                this.binder.toggleActivation(tilesetIndex, optionKey, posKey, false, spotName);
            });
        }
    }

    bindSpotRows(tilesetIndex)
    {
        if(this.spotPanelEvents){
            this.spotPanelEvents.bindSpotRows(tilesetIndex);
        }
    }
}
window.TilesetTileOptionsEvents = TilesetTileOptionsEvents;
