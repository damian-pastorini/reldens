/**
 *
 * Reldens - Install
 *
 */

window.addEventListener('load', () => {

    const expanders = [
        {key: 'app-use-https', filterClass: 'https-filter'},
        {key: 'app-use-monitor', filterClass: 'monitor-filter'},
        {key: 'mailer-enable', filterClass: 'mailer-filter'},
        {key: 'firebase-enable', filterClass: 'firebase-filter'}
    ];

    function toggleExpander(isChecked, expander)
    {
        const display = isChecked ? 'flex' : 'none';
        const elements = document.getElementsByClassName(expander.filterClass);
        for (let element of elements) {
            element.style.display = display;
        }
    }

    for(let expander of expanders){
        let expanderElement = document.getElementById(expander.key);
        expanderElement.addEventListener('click', (event) => {
            toggleExpander(event?.currentTarget?.checked, expander);
        });
        toggleExpander(expanderElement.checked, expander);
    }

    let urlParams = new URL(window.location.href).searchParams;
    if('1' === urlParams.get('success')){
        document.querySelector('.forms-container').style.display = 'none';
        let newLink = document.createElement('a');
        newLink.href = '/?ready=1';
        newLink.target = '_blank';
        newLink.innerHTML = 'Installation successful, click here to open your game!';
        newLink.classList.add('installation-successful');
        document.querySelector('.content').append(newLink);
    }

    let errorCode = (urlParams.get('error') || '').toString();
    if('' !== errorCode){
        document.querySelector('.'+errorCode).style.display = 'block';
    }

    document.getElementById('install-form').addEventListener('submit', (event) => {
        let loadingImage = document.querySelector('.install-loading');
        if(loadingImage){
            loadingImage.classList.remove('hidden');
        }
        let installButton = document.getElementById('install-submit-button');
        if(installButton){
            installButton.classList.add('disabled');
            installButton.disabled = true;
        }
    });

});