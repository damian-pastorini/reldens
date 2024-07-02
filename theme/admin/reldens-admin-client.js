/**
 *
 * Reldens - Index
 *
 */

window.addEventListener('DOMContentLoaded', () => {
    // console.log('Reldens - Administration Panel');
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
});
