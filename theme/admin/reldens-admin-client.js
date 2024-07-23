/**
 *
 * Reldens - Index
 *
 */

window.addEventListener('DOMContentLoaded', () => {

    // helpers:

    function getCookie(name)
    {
        let value = `; ${document.cookie}`;
        let parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    function deleteCookie(name)
    {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    function escapeHTML(str)
    {
        return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // forms with confirmation:
    let forms = document.querySelectorAll('.form-delete, .confirmation-required');
    if(forms){
        for(let deleteForm of forms){
            deleteForm.addEventListener('submit', (event) => {
                if(!confirm('Are you sure?')){
                    event.preventDefault();
                }
            });
        }
    }

    // sidebar headers click behavior:
    let sideBarHeaders = document.querySelectorAll('.with-sub-items h3');
    if(sideBarHeaders){
        for(let header of sideBarHeaders){
            header.addEventListener('click', (event) => {
                event.currentTarget.parentNode.classList.toggle('active');
            });
        }
    }

    // expand menu on load:
    let location = window.location;
    let currentPath = location.pathname;
    let subItemContainers = document.querySelectorAll('.with-sub-items');
    if(subItemContainers){
        let done = false;
        for(let container of subItemContainers){
            let links = container.querySelectorAll('.side-bar-item a');
            for(let link of links){
                let linkWithoutHost = link.href.replace(location.host, '').replace(location.protocol+'//', '');
                if(currentPath === linkWithoutHost){
                    link.parentNode.classList.add('active');
                    container.classList.add('active');
                    done = true;
                    break;
                }
            }
            if(done){
                break;
            }
        }
    }

    // filters toggle visibility:
    let filtersToggle = document.querySelector('.filters-toggle');
    let filtersToggleContent = document.querySelector('.filters-toggle-content');
    if(filtersToggle && filtersToggleContent){
        filtersToggle.addEventListener('click', () => {
            filtersToggleContent.classList.toggle('hidden');
        });
        let allFilters = document.querySelectorAll('.filters-toggle-content .filter input');
        let activeFilters = Array.from(allFilters).filter(input => input.value !== '');
        if(0 < activeFilters.length){
            filtersToggleContent.classList.remove('hidden');
        }
    }

    // list select all:
    let listSelect = document.querySelector('.list-select');
    if(listSelect){
        listSelect.addEventListener('click', (event) => {
            console.log('click', event.currentTarget.dataset.checked, event);
            let checkboxes = document.querySelectorAll('.ids-checkbox');
            for(let checkbox of checkboxes){
                checkbox.checked = 1 === Number(event.currentTarget.dataset.checked);
            }
            event.currentTarget.dataset.checked = 1 === Number(event.currentTarget.dataset.checked) ? 0 : 1;
            console.log('changed to:', event.currentTarget.dataset.checked);
        });
    }

    // list delete selection:
    let listDeleteSelection = document.querySelector('.list-delete-selection');
    let deleteSelectionForm = document.getElementById('delete-selection-form');
    let hiddenInput = document.querySelector('.hidden-ids-input');
    if(listDeleteSelection && deleteSelectionForm && hiddenInput){
        listDeleteSelection.addEventListener('click', () => {
            if(!confirm('Are you sure?')){
                return;
            }
            let checkboxes = document.querySelectorAll('.ids-checkbox');
            let ids = [];
            for(let checkbox of checkboxes){
                if(checkbox.checked){
                    ids.push(checkbox.value);
                }
            }
            hiddenInput.value = ids.join(',');
            deleteSelectionForm.submit();
        });
    }

    // display notifications from query params:
    let notificationElement = document.querySelector('.notification');
    if(notificationElement){
        let closeNotificationElement = document.querySelector('.notification .close');
        closeNotificationElement?.addEventListener('click', () => {
            notificationElement.classList.remove('success', 'error');
        });
        let queryParams = new URLSearchParams(location.search);
        let result = queryParams.get('result');
        if(!result){
            result = getCookie('result');
        }
        let notificationMessageElement = document.querySelector('.notification .message');
        if(result && notificationMessageElement){
            let notificationClass = 'success' === result ? 'success' : 'error';
            notificationMessageElement.innerHTML = '';
            notificationElement.classList.add(notificationClass);
            notificationMessageElement.innerHTML = 'success' === result
                ? 'Success!'
                : 'There was an error: '+escapeHTML(result);
            deleteCookie('result');
        }
    }

    // shutdown timer:
    let shuttingDownTimeElement = document.querySelector('.shutting-down .shutting-down-time');
    if(shuttingDownTimeElement){
        let shuttingDownTime = shuttingDownTimeElement.getAttribute('data-shutting-down-time');
        if(shuttingDownTime){
            shuttingDownTimeElement.innerHTML = escapeHTML(shuttingDownTime)+'s';
            shuttingDownTime = Number(shuttingDownTime);
            let shuttingDownTimer = setInterval(
                () => {
                    shuttingDownTimeElement.innerHTML = escapeHTML(shuttingDownTime)+'s';
                    shuttingDownTime--;
                    if (0 === shuttingDownTime) {
                        clearInterval(shuttingDownTimer);
                    }
                },
                1000
            );
        }
    }
});
