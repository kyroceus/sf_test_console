let testCoverage = {};

const overlayDiv = document.createElement('div');
overlayDiv.className = 'custom-coverage-container';
overlayDiv.onclick = function(event) {
    debugger;
    if(event.target.tagName === 'BUTTON') {
        pinOrUnpin(event);
    }
}

const table = document.createElement('table');
table.className = 'custom-coverage-table';

function createOrAddHeader() {
    let header = document.getElementById('custom-coverage-table_header');
    if(!header) {
        header = document.createElement('tr');
        const th = document.createElement('th');
        th.innerHTML = 'Test Class';
        header.append(th);
        const th2 = document.createElement('th');
        th2.innerHTML = '%';
        header.append(th2);
        const th3 = document.createElement('th');
        th3.innerHTML = 'Pin';
        header.append(th3);
        header.id='custom-coverage-table_header';
    }
    table.prepend(header);
}

const pinnedClasses = new Set(JSON.parse(localStorage.getItem('pinned-classes') ?? '[]'));

function pinOrUnpin(e) {
    e.preventDefault();
    const classToUpdate = e.target.dataset.class;
    if(pinnedClasses.has(classToUpdate)) {
        pinnedClasses.delete(classToUpdate);
        e.target.innerHTML = 'Pin';
    } else {
        pinnedClasses.add(classToUpdate);
        e.target.innerHTML = 'Unpin';
    }
    localStorage.setItem('pinned-classes', JSON.stringify(Array.from(pinnedClasses)));
    buildNewTable();
} 


function updateOrCreateRow(name, coverage) {
    const isPinned = pinnedClasses.has(name);
    let row = document.getElementById(name);
    if(!row) {
        row = document.createElement('tr');
        row.id = name;
        const td = document.createElement('td');
        td.innerHTML = name;
        row.append(td);
        const td2 = document.createElement('td');
        td2.innerHTML = coverage;
        td2.className = 'covered';
        row.append(td2);
        const td3 = document.createElement('td');
        td3.innerHTML = `<button data-class='${name}'>${isPinned ? 'Unpin' : 'Pin'}</button>`;
        row.append(td3);
    } else {
        let coverageElement = row.querySelector('.covered');
        coverageElement.innerHTML = coverage;
    }
    if(isPinned) {
        table.prepend(row);
    } else {
        table.append(row);
    }
}

function buildNewTable() {
    for(const className of Object.keys(testCoverage)) {
        updateOrCreateRow(className, testCoverage[className]);
    }
    createOrAddHeader();
    overlayDiv.append(table);
}

function getCoverageAndBuildTable() {
    SfdcDevConsole.ToolingAPI.query(`
        SELECT 
            ApexClassOrTriggerId,
            ApexClassOrTrigger.Name,
            NumLinesCovered,
            NumLinesUncovered
        FROM 
            ApexCodeCoverageAggregate
        ORDER BY 
            ApexClassOrTrigger.Name`,
        {
            continuation: function(result) {
                result.records.forEach(record => {
                    if(record.NumLinesUncovered) {
                        testCoverage[record.ApexClassOrTrigger.Name] = parseInt(100 * record.NumLinesCovered / (record.NumLinesUncovered + record.NumLinesCovered)) + '%';
                    }
                })
                buildNewTable();
            }
        }
    );
}
let debounceTimer;
const aggregateTableObserver = new MutationObserver(entries => {
    if(debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    } 
    debounceTimer = setTimeout(getCoverageAndBuildTable, 1000);
})

function connectAggregateTableObserver() {
    const container = document.getElementById('aggregateCoverageGrid-body');
    aggregateTableObserver.observe(container, {childList: true, subtree: true});
}

function createAggregateCoverageTable() {
    connectAggregateTableObserver();
    getCoverageAndBuildTable();
}

function appendOverlayDiv() {
    const aggregateCoverageGridContainer = document.getElementById('aggregateCoverageGrid');
    if(aggregateCoverageGridContainer) {
        if(aggregateCoverageGridContainer.style.position !== 'relative') {
            aggregateCoverageGridContainer.style.position = 'relative';
            aggregateCoverageGridContainer.appendChild(overlayDiv);
            createAggregateCoverageTable();
        }
    }
    return Boolean(aggregateCoverageGridContainer);
}

function initializeMutationObserver(bottomPanelBodyEl) {
    const bottomPanelBodyObserver = new MutationObserver(() => {
        const isSuccesfullyAppended = appendOverlayDiv()  
        if(isSuccesfullyAppended) {
            disconnectbottomPanelBodyObserver();
        } 
    });
    const isSuccesfullyAppended = appendOverlayDiv();
    if(!isSuccesfullyAppended) {
        bottomPanelBodyObserver.observe(bottomPanelBodyEl, {childList: true, subtree: true});
    }
    function disconnectbottomPanelBodyObserver() {
        bottomPanelBodyObserver.disconnect();
    }
}

function pollForElement() {
    const intervalId = setInterval(() => {
        const bottomPanelBodyEl = document.getElementById('bottomPanel-body');
        if (bottomPanelBodyEl) {
            clearInterval(intervalId);
            initializeMutationObserver(bottomPanelBodyEl);
        }
    }, 1000);
};

pollForElement();
