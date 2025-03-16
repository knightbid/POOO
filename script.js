// script.js
let menu = JSON.parse(localStorage.getItem('menu')) || [];
let completedOrders = JSON.parse(localStorage.getItem('completedOrders')) || [];
let selectedTable = null;

function getTableColor(tableNum) {
    const colors = [
        '#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9',
        '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', '#C8E6C9',
        '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3', '#FFE0B2',
        '#FFCCBC', '#D7CCC8', '#F5F5F5', '#CFD8DC', '#B0BEC5'
    ];
    return colors[(parseInt(tableNum) - 1) % 20];
}

function saveData() {
    localStorage.setItem('menu', JSON.stringify(menu));
    localStorage.setItem('completedOrders', JSON.stringify(completedOrders));
}

function getTables() {
    return JSON.parse(localStorage.getItem('tables')) || {};
}

function addItem() {
    const name = document.getElementById('itemName').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    if (name && price) {
        menu.push({ name, price });
        saveData();
        updateMenuList();
        document.getElementById('itemName').value = '';
        document.getElementById('itemPrice').value = '';
    }
}

function updateMenuList() {
    const menuList = document.getElementById('menuList');
    if (menuList) {
        menuList.innerHTML = menu.map(item => `<li>${item.name} - $${item.price}</li>`).join('');
    }
}

function updateItemSelect() {
    const itemSelect = document.getElementById('itemSelect');
    if (itemSelect) {
        itemSelect.innerHTML = menu.map(item => `<option value="${item.name}">${item.name} - $${item.price}</option>`).join('');
    }
}

function addOrder() {
    const itemName = document.getElementById('itemSelect').value;
    if (selectedTable && itemName) {
        const item = menu.find(i => i.name === itemName);
        let tables = getTables();
        if (!tables[selectedTable]) tables[selectedTable] = { orders: [] };
        tables[selectedTable].orders.push({
            name: item.name,
            price: item.price,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('tables', JSON.stringify(tables));
        updateAllTables();
    } else if (!selectedTable) {
        alert('Please select a table first!');
    }
}

function updateAllTables() {
    const allTables = document.getElementById('allTables');
    if (allTables) {
        let tables = getTables();
        let html = '';
        for (let i = 1; i <= 20; i++) {
            const tableNum = i.toString();
            const orders = tables[tableNum]?.orders || [];
            html += `<div class="table-section${selectedTable === tableNum ? ' selected' : ''}" data-table="${tableNum}">`;
            html += `<h3>Table ${tableNum}</h3>`;
            if (orders.length > 0) {
                const orderList = orders.map(o => 
                    `<div class="order-item">${o.name} - $${o.price}` +
                    (selectedTable === tableNum && !allTables.classList.contains('bill-grid') 
                        ?  ` <button onclick="removeOrder('${tableNum}', '${o.timestamp}')">❌</button>`
                        : '') +
                    `</div>`
                ).join('');
                const total = orders.reduce((sum, o) => sum + o.price, 0);
                html += `${orderList}<br><strong>Total: $${total}</strong>`;
            } else {
                html += 'No orders for this table.';
            }
            if (allTables.classList.contains('bill-grid')) {
                html += `<br><button class="done-btn" onclick="doneBill('${tableNum}')">Done Bill</button>`;
            }
            html += '</div>';
        }
        allTables.innerHTML = html;

        if (!allTables.classList.contains('bill-grid')) {
            document.querySelectorAll('.table-section').forEach(section => {
                section.addEventListener('click', () => {
                    selectedTable = section.getAttribute('data-table');
                    document.querySelectorAll('.table-section').forEach(s => s.classList.remove('selected'));
                    section.classList.add('selected');
                    updateAllTables(); // Refresh to show edit/remove buttons
                });
            });
        }
    }
}

function updateBartenderList() {
    const bartenderList = document.getElementById('bartenderList');
    if (bartenderList) {
        let tables = getTables();
        let allOrders = [];
        for (let table in tables) {
            tables[table].orders.forEach(order => {
                allOrders.push({
                    table: table,
                    name: order.name,
                    timestamp: order.timestamp
                });
            });
        }
        allOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        bartenderList.innerHTML = allOrders.length > 0
            ? allOrders.map(order => `<li style="background-color: ${getTableColor(order.table)};">Table ${order.table}: ${order.name} (${new Date(order.timestamp).toLocaleTimeString()})</li>`).join('')
            : '<li>No orders yet.</li>';
    }
}

function doneBill(tableNum) {
    let tables = getTables();
    if (tables[tableNum] && tables[tableNum].orders.length > 0) {
        const total = tables[tableNum].orders.reduce((sum, o) => sum + o.price, 0);
        delete tables[tableNum];
        localStorage.setItem('tables', JSON.stringify(tables));
        completedOrders.push({ table: tableNum, total, date: new Date() });
        saveData();
        updateAllTables();
        updateBartenderList();
    }
}

function removeOrder(tableNum, timestamp) {
    let tables = getTables();
    if (tables[tableNum]) {
        tables[tableNum].orders = tables[tableNum].orders.filter(o => o.timestamp !== timestamp);
        if (tables[tableNum].orders.length === 0) delete tables[tableNum];
        localStorage.setItem('tables', JSON.stringify(tables));
        updateAllTables();
        updateBartenderList();
    }
}

function editOrder(tableNum, timestamp) {
    let tables = getTables();
    if (tables[tableNum]) {
        const oldOrder = tables[tableNum].orders.find(o => o.timestamp === timestamp);
        const newItemName = prompt(`Change "${oldOrder.name}" to:`, oldOrder.name);
        if (newItemName && menu.some(i => i.name === newItemName)) {
            const newItem = menu.find(i => i.name === newItemName);
            tables[tableNum].orders = tables[tableNum].orders.map(o => 
                o.timestamp === timestamp ? { name: newItem.name, price: newItem.price, timestamp: o.timestamp } : o
            );
            localStorage.setItem('tables', JSON.stringify(tables));
            updateAllTables();
            updateBartenderList();
        } else if (newItemName) {
            alert('Item not found in menu!');
        }
    }
}

function showRevenue() {
    const today = new Date().toDateString();
    const revenue = completedOrders
        .filter(o => new Date(o.date).toDateString() === today)
        .reduce((sum, o) => sum + o.total, 0);
    document.getElementById('revenueOutput').innerHTML = `Revenue for ${today}: $${revenue}`;
}