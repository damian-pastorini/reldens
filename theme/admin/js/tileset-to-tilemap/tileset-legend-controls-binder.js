class TilesetLegendControlsBinder
{
    constructor(app)
    {
        this.app = app;
    }

    applyBulkSelection(tilesetIndex, refs)
    {
        this.applySelectionFlag(tilesetIndex, refs, refs.bulkSelectAll.checked, 'bulkSelected', '.element-bulk-select');
        this.app.generator.updateGenerateButtonState();
    }

    applyGenerateSelection(tilesetIndex, refs)
    {
        this.applySelectionFlag(
            tilesetIndex,
            refs,
            refs.generateSelectAll.checked,
            'generateSelected',
            '.element-generate-select'
        );
        this.app.generator.updateGenerateButtonState();
    }

    applySelectionFlag(tilesetIndex, refs, isChecked, flagName, checkboxSelector)
    {
        let filter = this.app.editor.elementVisibilityFilter(refs);
        for(let element of this.app.state[tilesetIndex].elements){
            if(!this.app.editor.matchesVisibilityFilter(element, filter)){
                continue;
            }
            element[flagName] = isChecked;
        }
        if(filter.showSpots){
            for(let spot of this.app.state[tilesetIndex].spots || []){
                spot[flagName] = isChecked;
            }
        }
        for(let checkbox of refs.list.querySelectorAll(checkboxSelector)){
            let row = checkbox.closest('.element-row, .spot-row');
            if(row && row.classList.contains('hidden')){
                continue;
            }
            checkbox.checked = isChecked;
        }
    }

    provideLegendSort(tilesetIndex)
    {
        let tilesetState = this.app.state[tilesetIndex];
        if(!tilesetState.legendSort){
            tilesetState.legendSort = {by: 'name', ascending: true};
        }
        return tilesetState.legendSort;
    }

    bindLegendSortControls(tilesetIndex, refs)
    {
        if(!refs.legendSortSelect || !refs.legendSortAscBtn || !refs.legendSortDescBtn){
            return;
        }
        this.applyLegendSortControlsState(tilesetIndex, refs);
        refs.legendSortSelect.addEventListener('change', () => {
            this.provideLegendSort(tilesetIndex).by = refs.legendSortSelect.value;
            this.app.editor.legendRenderer.applyLegendSort(tilesetIndex);
        });
        refs.legendSortAscBtn.addEventListener('click', () => {
            this.changeLegendSortDirection(tilesetIndex, refs, true);
        });
        refs.legendSortDescBtn.addEventListener('click', () => {
            this.changeLegendSortDirection(tilesetIndex, refs, false);
        });
    }

    changeLegendSortDirection(tilesetIndex, refs, ascending)
    {
        this.provideLegendSort(tilesetIndex).ascending = ascending;
        this.applyLegendSortControlsState(tilesetIndex, refs);
        this.app.editor.legendRenderer.applyLegendSort(tilesetIndex);
    }

    applyLegendSortControlsState(tilesetIndex, refs)
    {
        let legendSort = this.provideLegendSort(tilesetIndex);
        refs.legendSortSelect.value = legendSort.by;
        refs.legendSortAscBtn.classList.toggle('active', legendSort.ascending);
        refs.legendSortDescBtn.classList.toggle('active', !legendSort.ascending);
    }

    provideLegendVisibility(tilesetIndex)
    {
        let tilesetState = this.app.state[tilesetIndex];
        if(!tilesetState.legendVisibility){
            tilesetState.legendVisibility = {showElements: true, showClusters: true, showSpots: true};
        }
        return tilesetState.legendVisibility;
    }

    applyLegendVisibilityControlsState(tilesetIndex, refs)
    {
        let legendVisibility = this.provideLegendVisibility(tilesetIndex);
        refs.showElementsCheck.checked = legendVisibility.showElements;
        refs.showClustersCheck.checked = legendVisibility.showClusters;
        if(refs.showSpotsCheck){
            refs.showSpotsCheck.checked = legendVisibility.showSpots;
        }
    }
}
window.TilesetLegendControlsBinder = TilesetLegendControlsBinder;
