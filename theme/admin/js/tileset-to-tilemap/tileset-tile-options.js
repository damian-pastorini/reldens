class TilesetTileOptions
{
    constructor(binder)
    {
        this.binder = binder;
    }

    applyToRow(tilesetIndex, rowEl)
    {
        if(-1 === tilesetIndex){
            let globalPanel = document.querySelector('.global-tile-options .tileset-tile-options');
            if(globalPanel){
                let globalOpts = this.binder.app.globalTileOptions;
                if(!globalOpts){
                    globalOpts = {};
                }
                this.applyOptionsToPanel(globalPanel, globalOpts);
            }
            return;
        }
        let tileset = this.binder.app.state[tilesetIndex];
        let tileOpts = tileset.tileOptions;
        if(!tileOpts){
            tileOpts = {};
        }
        let tileOptsPanel = rowEl.querySelector('.tileset-tile-options');
        if(tileOptsPanel){
            this.applyOptionsToPanel(tileOptsPanel, tileOpts);
        }
        let spots = tileset.spots;
        if(!spots){
            spots = [];
        }
        for(let spot of spots){
            let spotRow = rowEl.querySelector('.spot-row[data-spot-name="'+spot.name+'"]');
            if(!spotRow){
                continue;
            }
            this.applySpotToRow(spotRow, spot);
        }
    }

    getFlatIndex(val)
    {
        if(val && 'object' === typeof val && !Array.isArray(val)){
            return val.flatIndex;
        }
        return val;
    }

    applyOptionsToPanel(panel, data)
    {
        let displays = panel.querySelectorAll('.tile-option-display');
        for(let display of displays){
            let key = display.dataset.option;
            if(!key){
                continue;
            }
            let val = data[key];
            let cell = display.closest('.tile-option-cell');
            if(Array.isArray(val)){
                if(cell){
                    cell.classList.toggle('has-value', val.length > 0);
                }
                continue;
            }
            let hasVal = null !== val && undefined !== val;
            if(cell){
                cell.classList.toggle('has-value', hasVal);
            }
            display.textContent = hasVal ? '#'+this.getFlatIndex(val) : '';
        }
        let grids = panel.querySelectorAll('.tile-position-grid');
        for(let grid of grids){
            this.applyGridCells(grid, data);
        }
        let multiContainers = panel.querySelectorAll('.tile-option-multi-values');
        for(let container of multiContainers){
            let key = container.dataset.multiOption;
            let val = data[key];
            this.renderMultiValues(container, Array.isArray(val) ? val : []);
        }
    }

    renderMultiValues(container, arr)
    {
        container.innerHTML = '';
        for(let value of arr){
            let fi = this.getFlatIndex(value);
            let cell = document.createElement('div');
            cell.className = 'tile-option-multi-cell';
            let valSpan = document.createElement('span');
            valSpan.className = 'tile-option-multi-cell-val';
            valSpan.textContent = '#'+fi;
            let clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'tile-multi-cell-clear';
            clearBtn.dataset.multiValue = String(fi);
            clearBtn.textContent = 'x';
            cell.appendChild(valSpan);
            cell.appendChild(clearBtn);
            container.appendChild(cell);
        }
    }

    applyGridCells(grid, data)
    {
        let defaultOptKey = grid.dataset.option;
        let cells = grid.querySelectorAll('.tile-position-cell');
        for(let cell of cells){
            let optKey = cell.dataset.option ? cell.dataset.option : defaultOptKey;
            let vals = data[optKey];
            if(!vals){
                vals = {};
            }
            let pos = cell.dataset.pos;
            let val = vals[pos];
            let posVal = cell.querySelector('.pos-val');
            if(posVal){
                posVal.textContent = (null !== val && undefined !== val) ? '#'+this.getFlatIndex(val) : '';
            }
            cell.classList.toggle('is-set', null !== val && undefined !== val);
        }
    }

    applySpotToRow(spotRow, spot)
    {
        let tileConfig = spotRow.querySelector('.spot-tile-config');
        if(!tileConfig){
            return;
        }
        this.applyOptionsToPanel(tileConfig, spot);
    }

    updateBanner(tilesetIndex, containerEl)
    {
        let binder = this.binder;
        if(!containerEl || !binder.activeOptionKey){
            return;
        }
        let statusEl = containerEl.querySelector('.tile-pick-status[data-pick-for="'+binder.activeOptionKey+'"]');
        if(!statusEl){
            return;
        }
        let text = binder.activeOptionKey;
        if(binder.activeSpotName){
            text = binder.activeSpotName+' - '+text;
        }
        if(binder.activePositionKey){
            text = text+' - '+binder.activePositionKey;
        }
        let label = statusEl.querySelector('.tile-pick-label');
        if(label){
            label.textContent = text;
        }
        statusEl.classList.remove('hidden');
    }

    hideBanner(containerEl)
    {
        if(!containerEl){
            return;
        }
        let statusEls = containerEl.querySelectorAll('.tile-pick-status');
        for(let el of statusEls){
            el.classList.add('hidden');
        }
    }

    updateActiveCellClass(tilesetIndex, rowEl)
    {
        this.clearAllActiveCellClasses(rowEl);
        let binder = this.binder;
        if(!binder.activePositionKey || !binder.activeOptionKey){
            return;
        }
        let spotName = binder.activeSpotName;
        let byGrid = '.tile-position-grid[data-option="'+binder.activeOptionKey+'"] .tile-position-cell[data-pos="'+binder.activePositionKey+'"]';
        let byCell = '.tile-position-cell[data-option="'+binder.activeOptionKey+'"][data-pos="'+binder.activePositionKey+'"]';
        let cellSelector = byGrid+','+byCell;
        if(spotName){
            let spotRow = rowEl.querySelector('.spot-row[data-spot-name="'+spotName+'"]');
            if(!spotRow){
                return;
            }
            let cell = spotRow.querySelector(cellSelector);
            if(cell){
                cell.classList.add('active');
            }
            return;
        }
        let globalPanel = rowEl.querySelector('.tileset-tile-options');
        if(!globalPanel){
            return;
        }
        let cells = globalPanel.querySelectorAll(cellSelector);
        for(let cell of cells){
            cell.classList.add('active');
        }
    }

    clearAllActiveCellClasses(rowEl)
    {
        let cells = rowEl.querySelectorAll('.tile-position-cell.active');
        for(let cell of cells){
            cell.classList.remove('active');
        }
    }
}
