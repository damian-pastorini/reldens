window.addEventListener('load', () => {

    const expanders = [
        {key: 'app-use-https', filterClass: 'https-filter'},
        {key: 'app-use-monitor', filterClass: 'monitor-filter'},
        {key: 'mailer-enable', filterClass: 'mailer-filter'},
        {key: 'firebase-enable', filterClass: 'firebase-filter'}
    ];

    for(let expander of expanders){
        document.getElementById(expander.key).addEventListener('click', (event) => {
            const display = event?.currentTarget?.checked ? 'flex' : 'none';
            const elements = document.getElementsByClassName(expander.filterClass);
            for(let element of elements){
                element.style.display = display;
            }
        });
    }

});