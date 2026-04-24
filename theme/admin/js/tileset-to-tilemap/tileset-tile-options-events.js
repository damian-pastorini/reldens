class TilesetTileOptionsEvents
{
    constructor(binder)
    {
        this.binder = binder;
        this.spotPropsBinder = new TilesetSpotPropsBinder(this);
    }

    iterateBtnsWithOptionKey(btns, callback)
    {
        for(let btn of btns){
            let optionKey = btn.dataset.option;
            if(!optionKey){
                continue;
            }
            callback(btn, optionKey);
        }
    }

    bindOptionBtns(tilesetIndex, container, spotName)
    {
        let btns = container.querySelectorAll('.tile-option-btn');
        this.iterateBtnsWithOptionKey(btns, (btn, optionKey) => {
            let isMulti = 'true' === btn.dataset.multi;
            btn.addEventListener('click', () => {
                let b = this.binder;
                if(
                    b.activeTilesetIndex === tilesetIndex
                    && b.activeOptionKey === optionKey
                    && b.activeSpotName === (spotName ? spotName : null)
                    && null === b.activePositionKey
                ){
                    b.deactivate();
                    return;
                }
                b.deactivate();
                b.activateOption(tilesetIndex, optionKey, isMulti, spotName ? spotName : null);
                btn.classList.add('active');
                if(-1 === tilesetIndex){
                    this.updateGlobalBanner(b);
                    b.app.renderAllCanvases();
                    return;
                }
                let rowEl = document.querySelector('[data-tileset-index="'+tilesetIndex+'"]');
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
        for(let btn of cellClearBtns){
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                let cell = btn.closest('.tile-position-cell');
                let grid = btn.closest('.tile-position-grid');
                if(!cell || !grid){
                    return;
                }
                let optKey = cell.dataset.option ? cell.dataset.option : grid.dataset.option;
                this.binder.clearOption(tilesetIndex, optKey, cell.dataset.pos, spotName ? spotName : null);
            });
        }
        let multiContainers = container.querySelectorAll('.tile-option-multi-values');
        for(let mc of multiContainers){
            mc.addEventListener('click', (e) => {
                let clearBtn = e.target.closest('.tile-multi-cell-clear');
                if(!clearBtn){
                    return;
                }
                e.stopPropagation();
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
        let btns = containerEl.querySelectorAll('.tile-reference-btn');
        for(let btn of btns){
            btn.addEventListener('click', () => this.openReferenceModal(btn));
        }
    }

    withReferenceModal(callback)
    {
        let modal = document.querySelector('.tile-reference-modal');
        if(modal){
            callback(modal);
        }
    }

    openReferenceModal(btn)
    {
        this.withReferenceModal((modal) => {
            let img = modal.querySelector('.tile-reference-modal-img');
            let title = modal.querySelector('.tile-reference-modal-title');
            if(img){
                img.src = btn.dataset.referenceImg;
                img.alt = btn.dataset.referenceTitle;
            }
            if(title){
                title.textContent = btn.dataset.referenceTitle;
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

    bindClearBtnGroup(btns, tilesetIndex, spotName)
    {
        this.iterateBtnsWithOptionKey(btns, (btn, optionKey) => {
            this.bindSingleClearBtn(btn, optionKey, tilesetIndex, spotName);
        });
    }

    bindSingleClearBtn(btn, optionKey, tilesetIndex, spotName)
    {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if('ground' === optionKey){
                this.binder.clearGroundGroup(tilesetIndex, spotName ? spotName : null);
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
            cell.addEventListener('click', (e) => {
                let clearBtn = cell.querySelector('.tile-position-cell-clear');
                if(clearBtn && (e.target === clearBtn || clearBtn.contains(e.target))){
                    return;
                }
                this.binder.activateOption(tilesetIndex, optionKey, false, spotName ? spotName : null);
                this.binder.activatePosition(posKey);
            });
        }
    }

    bindSpotRows(tilesetIndex)
    {
        let refs = this.binder.app.refs[tilesetIndex];
        if(!refs){
            return;
        }
        let spotRows = refs.list.querySelectorAll('.spot-row');
        for(let spotRow of spotRows){
            let spotName = spotRow.dataset.spotName;
            if(!spotName){
                continue;
            }
            this.bindSingleSpotRow(tilesetIndex, spotRow, spotName);
        }
    }

    bindSingleSpotRow(tilesetIndex, spotRow, spotName)
    {
        this.binder.bindCancelBtns(spotRow);
        this.bindOptionBtns(tilesetIndex, spotRow, spotName);
        this.bindClearBtns(tilesetIndex, spotRow, spotName);
        this.bindPositionCells(tilesetIndex, spotRow, spotName);
        this.spotPropsBinder.bind(spotRow, tilesetIndex, spotName);
        let spot = this.binder.findSpot(tilesetIndex, spotName);
        if(spot){
            this.binder.apply.applySpotToRow(spotRow, spot);
        }
    }

}
