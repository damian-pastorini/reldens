class AdminClientFilters
{
    clearAllFilterInputs(allFilters)
    {
        for(let filterInput of allFilters){
            filterInput.value = '';
        }
    }

    bindEntitySearch()
    {
        let entityFilterTerm = document.querySelector('#entityFilterTerm');
        let filterForm = document.querySelector('#filter-form');
        let allFilters = document.querySelectorAll('.filters-toggle-content .filter input');
        if(!entityFilterTerm || !filterForm){
            return;
        }
        entityFilterTerm.addEventListener('input', () => {
            if(entityFilterTerm.value){
                this.clearAllFilterInputs(allFilters);
            }
        });
        entityFilterTerm.addEventListener('keypress', (event) => {
            if(13 === event.keyCode){
                event.preventDefault();
                filterForm.submit();
            }
        });
        for(let filterInput of allFilters){
            filterInput.addEventListener('input', () => {
                if(filterInput.value){
                    entityFilterTerm.value = '';
                }
            });
        }
        filterForm.addEventListener('submit', () => {
            if(entityFilterTerm.value && allFilters.some(input => input.value)){
                this.clearAllFilterInputs(allFilters);
            }
        });
    }

    applyFilterParamsFromInputs(params, allFilters)
    {
        for(let filterInput of allFilters){
            if(filterInput.value){
                params.set(filterInput.name, filterInput.value);
            }
        }
    }

    handlePaginationLinkClick(event, link, entitySearchInput, allFilters)
    {
        event.stopPropagation();
        event.preventDefault();
        let url = new URL(link.href);
        let params = new URLSearchParams(url.search);
        if(entitySearchInput && entitySearchInput.value){
            params.set('entityFilterTerm', entitySearchInput.value);
        }
        this.applyFilterParamsFromInputs(params, allFilters);
        let sortedHeader = document.querySelector('.sorted');
        if(sortedHeader){
            let columnName = sortedHeader.getAttribute('data-column');
            let sortDirection = sortedHeader.classList.contains('sorted-asc') ? 'asc' : 'desc';
            params.set('sortBy', columnName);
            params.set('sortDirection', sortDirection);
        }
        window.location.href = url.pathname+'?'+params;
        return false;
    }

    bindFiltersToggle()
    {
        let filtersToggle = document.querySelector('.filters-toggle');
        let filtersToggleContent = document.querySelector('.filters-toggle-content');
        if(!filtersToggle || !filtersToggleContent){
            return;
        }
        filtersToggle.addEventListener('click', () => {
            filtersToggle.classList.toggle('active');
            filtersToggleContent.classList.toggle('hidden');
        });
        let allFilters = document.querySelectorAll('.filters-toggle-content .filter input');
        let entitySearchInput = document.querySelector('#entityFilterTerm');
        let hasEntitySearch = entitySearchInput && '' !== entitySearchInput.value;
        let activeFilters = Array.from(allFilters).filter(input => '' !== input.value);
        if(0 < activeFilters.length || hasEntitySearch){
            filtersToggleContent.classList.remove('hidden');
        }
        let filterForm = document.querySelector('#filter-form');
        let paginationLinks = document.querySelectorAll('.pagination a');
        if(!paginationLinks || !filterForm){
            return;
        }
        for(let link of paginationLinks){
            link.addEventListener('click', (event) => this.handlePaginationLinkClick(event, link, entitySearchInput, allFilters));
        }
    }

    syncSortFormFilterInput(sortForm, filterInput)
    {
        let filterName = filterInput.name.replace(/^filters\[/, '').replace(/\]$/, '');
        let sortFormFilterInput = sortForm.querySelector('input[data-filter-key="'+filterName+'"]');
        if(sortFormFilterInput){
            sortFormFilterInput.value = filterInput.value;
        }
    }

    handleSortableHeaderClick(header)
    {
        let sortForm = header.querySelector('.sort-form');
        if(!sortForm){
            return;
        }
        let columnName = header.getAttribute('data-column');
        let currentSortDirection = header.classList.contains('sorted-asc')
            ? 'asc'
            : header.classList.contains('sorted-desc') ? 'desc' : '';
        let newSortDirection = 'asc' === currentSortDirection ? 'desc' : 'asc';
        let sortByInput = sortForm.querySelector('input[name="sortBy"]');
        let sortDirectionInput = sortForm.querySelector('input[name="sortDirection"]');
        sortByInput.value = columnName;
        sortDirectionInput.value = newSortDirection;
        let entitySearchInput = document.querySelector('#entityFilterTerm');
        let entityFilterTermInput = sortForm.querySelector('input[name="entityFilterTerm"]');
        if(entityFilterTermInput){
            entityFilterTermInput.value = entitySearchInput?.value || '';
        }
        let allFilters = document.querySelectorAll('.filters-toggle-content .filter input');
        for(let filterInput of allFilters){
            this.syncSortFormFilterInput(sortForm, filterInput);
        }
        sortForm.submit();
    }

    bindColumnSorting()
    {
        let sortableHeaders = document.querySelectorAll('.sortable');
        if(!sortableHeaders){
            return;
        }
        for(let header of sortableHeaders){
            header.addEventListener('click', () => this.handleSortableHeaderClick(header));
        }
    }

    checkContainerLink(container, currentPath, location)
    {
        let links = container.querySelectorAll('.side-bar-item a');
        for(let link of links){
            let linkWithoutHost = link.href.replace(location.host, '').replace(location.protocol+'//', '');
            if(currentPath !== linkWithoutHost && 0 !== currentPath.indexOf(linkWithoutHost+'/')){
                continue;
            }
            link.parentNode.classList.add('active');
            container.classList.add('active');
            return true;
        }
        return false;
    }

    expandActiveMenu()
    {
        let subItemContainers = document.querySelectorAll('.with-sub-items');
        if(!subItemContainers){
            return;
        }
        for(let container of subItemContainers){
            if(this.checkContainerLink(container, this.currentPath, this.location)){
                break;
            }
        }
    }

    bind(currentPath, location)
    {
        this.currentPath = currentPath;
        this.location = location;
        this.bindEntitySearch();
        this.expandActiveMenu();
        this.bindFiltersToggle();
        this.bindColumnSorting();
    }
}
window.AdminClientFilters = AdminClientFilters;
