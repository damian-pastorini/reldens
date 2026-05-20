class TilesetTileOptionsEvents
{
    constructor(binder)
    {
        this.binder = binder;
        this.spotPanelEvents = new TilesetSpotPanelEvents(binder);
    }

    iterateBtnsWithOptionKey(optionBtns, callback)
    {
        for(let optionBtn of optionBtns){
            let optionKey = optionBtn.dataset.option;
            if(!optionKey){
                continue;
            }
            callback(optionBtn, optionKey);
        }
    }

    isSameActiveState(tilesetIndex, optionKey, spotName)
    {
        return this.binder.isSameActiveState(tilesetIndex, optionKey, spotName);
    }

    bindOptionBtns(tilesetIndex, container, spotName)
    {
        let tileBtns = container.querySelectorAll('.tile-option-btn');
        this.iterateBtnsWithOptionKey(tileBtns, (optionBtn, optionKey) => {
            let isMulti = 'true' === optionBtn.dataset.multi;
            optionBtn.addEventListener('click', () => {
                let b = this.binder;
                let isSameState = this.isSameActiveState(tilesetIndex, optionKey, spotName)
                    && null === b.activePositionKey;
                b.deactivate();
                if(isSameState){
                    return;
                }
                b.activateOption(tilesetIndex, optionKey, isMulti, spotName ? spotName : null);
                optionBtn.classList.add('active');
                if(-1 === tilesetIndex){
                    this.updateGlobalBanner(b);
                    b.app.renderAllCanvases();
                    return;
                }
                let rowEl = b.getTilesetRowEl(tilesetIndex);
                if(rowEl){
                    b.apply.updateBanner(tilesetIndex, rowEl);
                }
                b.app.renderer.renderCanvas(tilesetIndex);
            });
        });
    }

    updateGlobalBanner(b)
    {
        let globalPanel = document.querySelector('.global-tile-options');
        if(globalPanel){
            b.apply.updateBanner(-1, globalPanel);
        }
    }

    bindClearBtns(tilesetIndex, container, spotName)
    {
        let clearBtns = container.querySelectorAll('.tile-option-clear');
        this.bindClearBtnGroup(clearBtns, tilesetIndex, spotName);
        let cellClearBtns = container.querySelectorAll('.tile-position-cell-clear');
        for(let cellClearBtn of cellClearBtns){
            cellClearBtn.addEventListener('click', (cellClickEvent) => {
                cellClickEvent.stopPropagation();
                let cell = cellClearBtn.closest('.tile-position-cell');
                let grid = cellClearBtn.closest('.tile-position-grid');
                if(!cell || !grid){
                    return;
                }
                let optKey = cell.dataset.option ? cell.dataset.option : grid.dataset.option;
                this.binder.clearOption(tilesetIndex, optKey, cell.dataset.pos, spotName ? spotName : null);
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
        let groupClearBtns = container.querySelectorAll('.tile-options-group-clear-all');
        this.bindClearBtnGroup(groupClearBtns, tilesetIndex, spotName);
    }

    bindReferenceButtons(containerEl)
    {
        let referenceBtns = containerEl.querySelectorAll('.tile-reference-btn');
        for(let refBtn of referenceBtns){
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

    bindClearBtnGroup(clearBtnsList, tilesetIndex, spotName)
    {
        this.iterateBtnsWithOptionKey(clearBtnsList, (groupClearBtn, optionKey) => {
            this.bindSingleClearBtn(groupClearBtn, optionKey, tilesetIndex, spotName);
        });
    }

    bindSingleClearBtn(clearBtnEl, optionKey, tilesetIndex, spotName)
    {
        clearBtnEl.addEventListener('click', (clickEvent) => {
            clickEvent.stopPropagation();
            if('ground' === optionKey){
                this.binder.clearGroundGroup(tilesetIndex, spotName ? spotName : null);
                return;
            }
            if('pathTilesGroup' === optionKey){
                this.binder.clearPathTilesGroup(tilesetIndex);
                return;
            }
            this.binder.clearOption(tilesetIndex, optionKey, null, spotName ? spotName : null);
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
                let b = this.binder;
                let isSameState = this.isSameActiveState(tilesetIndex, optionKey, spotName)
                    && b.activePositionKey === posKey;
                b.deactivate();
                if(isSameState){
                    return;
                }
                b.activateOption(tilesetIndex, optionKey, false, spotName ? spotName : null);
                b.activatePosition(posKey);
            });
        }
    }

    bindSpotRows(tilesetIndex)
    {
        this.spotPanelEvents.bindSpotRows(tilesetIndex);
    }
}
window.TilesetTileOptionsEvents = TilesetTileOptionsEvents;
