/**
 *
 * Reldens - Index
 *
 */

window.addEventListener('DOMContentLoaded', () => {
    // delete forms confirmation:
    let forms = document.querySelectorAll('.form-delete');
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
});
