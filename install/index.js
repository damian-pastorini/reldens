/**
 *
 * Reldens - Install
 *
 */

const DB_CLIENTS_MAP = {
    'prisma': [
        {value: 'mysql', label: 'MySQL'},
        {value: 'postgresql', label: 'PostgreSQL (manual)'},
        {value: 'sqlite', label: 'SQLite (manual)'},
        {value: 'sqlserver', label: 'SQL Server (manual)'},
        {value: 'mongodb', label: 'MongoDB (manual)'},
        {value: 'cockroachdb', label: 'CockroachDB (manual)'}
    ],
    'objection-js': [
        {value: 'mysql', label: 'MySQL (native)'},
        {value: 'mysql2', label: 'MySQL2 (recommended)'},
        {value: 'pg', label: 'PostgreSQL (manual)'},
        {value: 'sqlite3', label: 'SQLite3 (manual)'},
        {value: 'better-sqlite3', label: 'Better-SQLite3 (manual)'},
        {value: 'mssql', label: 'SQL Server (manual)'},
        {value: 'oracledb', label: 'Oracle DB (manual)'},
        {value: 'cockroachdb', label: 'CockroachDB (manual)'}
    ],
    'mikro-orm': [
        {value: 'mysql', label: 'MySQL'},
        {value: 'mariadb', label: 'MariaDB (manual)'},
        {value: 'postgresql', label: 'PostgreSQL (manual)'},
        {value: 'sqlite', label: 'SQLite (manual)'},
        {value: 'mongodb', label: 'MongoDB (manual)'},
        {value: 'mssql', label: 'SQL Server (manual)'},
        {value: 'better-sqlite3', label: 'Better-SQLite3 (manual)'}
    ]
};

window.addEventListener('load', () => {

    const expanders = [
        {key: 'app-use-https', filterClass: 'https-filter'},
        {key: 'app-use-monitor', filterClass: 'monitor-filter'},
        {key: 'app-secure-monitor', filterClass: 'secure-monitor-filter'},
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
            if('app-use-monitor' === expander.key && event?.currentTarget?.checked){
                let secureMonitorElement = document.getElementById('app-secure-monitor');
                if(secureMonitorElement){
                    toggleExpander(secureMonitorElement.checked, {key: 'app-secure-monitor', filterClass: 'secure-monitor-filter'});
                }
            }
        });
        toggleExpander(expanderElement.checked, expander);
    }

    let useMonitorElement = document.getElementById('app-use-monitor');
    let secureMonitorElement = document.getElementById('app-secure-monitor');
    if(useMonitorElement?.checked && secureMonitorElement){
        toggleExpander(secureMonitorElement.checked, {key: 'app-secure-monitor', filterClass: 'secure-monitor-filter'});
    }

    let dangerSpans = document.querySelectorAll('span.danger');
    for(let dangerSpan of dangerSpans){
        dangerSpan.addEventListener('click', () => {
            let ulElement = dangerSpan.querySelector('ul');
            if(ulElement){
                ulElement.classList.toggle('expanded');
            }
        });
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

    function updateClientOptions(driverValue, currentClient)
    {
        let clientSelect = document.getElementById('db-client');
        if(!clientSelect){
            return;
        }
        clientSelect.innerHTML = '';
        let clients = DB_CLIENTS_MAP[driverValue] || DB_CLIENTS_MAP['prisma'];
        for(let client of clients){
            let option = document.createElement('option');
            option.value = client.value;
            option.text = client.label;
            if(currentClient && client.value === currentClient){
                option.selected = true;
            }
            clientSelect.appendChild(option);
        }
        if(!currentClient){
            let defaultClient = 'objection-js' === driverValue ? 'mysql2' : 'mysql';
            for(let i = 0; i < clientSelect.options.length; i++){
                if(clientSelect.options[i].value === defaultClient){
                    clientSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }

    let storageDriverSelect = document.getElementById('db-storage-driver');
    if(storageDriverSelect){
        let currentClient = document.getElementById('db-client')?.value || '';
        updateClientOptions(storageDriverSelect.value, currentClient);
        storageDriverSelect.addEventListener('change', (event) => {
            updateClientOptions(event.target.value, null);
        });
    }

    let statusIntervalId = null;
    let lastStatusMessage = '';

    function startStatusPolling()
    {
        if(statusIntervalId){
            return;
        }
        statusIntervalId = setInterval(() => {
            fetch('/install-status.json?t='+Date.now())
                .then(response => {
                    if(!response.ok){
                        return null;
                    }
                    return response.json();
                })
                .then(data => {
                    if(!data || !data.message){
                        return;
                    }
                    if(data.message === lastStatusMessage){
                        return;
                    }
                    lastStatusMessage = data.message;
                    let statusContainer = document.querySelector('.install-status-message');
                    if(statusContainer){
                        statusContainer.textContent = data.message;
                    }
                })
                .catch(() => {
                });
        }, 2000);
    }

    function stopStatusPolling()
    {
        if(statusIntervalId){
            clearInterval(statusIntervalId);
            statusIntervalId = null;
        }
    }

    document.getElementById('install-form').addEventListener('submit', () => {
        let loadingWrapper = document.querySelector('.loading-status-wrapper');
        if(loadingWrapper){
            loadingWrapper.classList.remove('hidden');
        }
        let installButton = document.getElementById('install-submit-button');
        if(installButton){
            installButton.classList.add('disabled');
            installButton.disabled = true;
        }
        startStatusPolling();
    });

});
