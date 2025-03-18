// script.js
 
 
// script.js
const firebaseConfig = {
    apiKey: "AIzaSyC4OuH1KIGXXGY0s0P--B4dUwzOHROc5sY",
    authDomain: "pooo-53752.firebaseapp.com",
    projectId: "pooo-53752",
    storageBucket: "pooo-53752.firebasestorage.app",
    messagingSenderId: "395034614140",
    appId: "1:395034614140:web:c83b0daadf5c6689d12cf9"
};

console.log('init')
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let completedOrders = []; // Could move to Firestore if needed
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

async function getMenu() {
    const doc = await db.collection('data').doc('menu').get();
    return doc.exists ? doc.data().items || [] : [];
}

async function saveMenu(menu) {
    await db.collection('data').doc('menu').set({ items: menu });
}

async function getTables() {
    const doc = await db.collection('data').doc('tables').get();
    return doc.exists ? doc.data() : {};
}

async function saveTables(tables) {
    await db.collection('data').doc('tables').set(tables);
}

async function addItem() {
    const name = document.getElementById('itemName').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    if (name && price) {
        let menu = await getMenu();
        menu.push({ name, price });
        await saveMenu(menu);
        updateMenuList();
        updateItemSelect(); // Update dropdown in order.html
        document.getElementById('itemName').value = '';
        document.getElementById('itemPrice').value = '';
    }
}

function updateMenuList() {
    const menuList = document.getElementById('menuList');
    if (menuList) {
        getMenu().then(menu => {
            menuList.innerHTML = menu.map(item => `<li>${item.name} - $${item.price}</li>`).join('');
        });
    }
}

function updateItemSelect() {
    const itemSelect = document.getElementById('itemSelect');
    if (itemSelect) {
        getMenu().then(menu => {
            itemSelect.innerHTML = menu.map(item => `<option value="${item.name}">${item.name} - $${item.price}</option>`).join('');
        });
    }
}

async function addOrder() {
    const itemName = document.getElementById('itemSelect').value;
    if (selectedTable && itemName) {
        const menu = await getMenu();
        const item = menu.find(i => i.name === itemName);
        let tables = await getTables();
        if (!tables[selectedTable]) tables[selectedTable] = { orders: [] };
        tables[selectedTable].orders.push({
            name: item.name,
            price: item.price,
            timestamp: new Date().toISOString()
        });
        await saveTables(tables);
        updateAllTables();
    } else if (!selectedTable) {
        alert('Please select a table first!');
    }
}

async function updateAllTables() {
    const allTables = document.getElementById('allTables');
    if (allTables) {
        let tables = await getTables();
        let html = '';
        // Filter and display only tables with orders
        for (let tableNum in tables) {
            const orders = tables[tableNum]?.orders || [];
            if (orders.length > 0) { // Only include tables with orders
                html += `<div class="table-section${selectedTable === tableNum ? ' selected' : ''}" data-table="${tableNum}">`;
                html += `<h3>Bàn ${tableNum}</h3>`;
                const orderList = orders.map(o => 
                    `<div class="order-item">${o.name} - $${o.price}` +
                    (selectedTable === tableNum && !allTables.classList.contains('bill-grid') 
                        ? ` <button onclick="editOrder('${tableNum}', '${o.timestamp}')">Edit</button>` +
                          ` <button onclick="removeOrder('${tableNum}', '${o.timestamp}')">Remove</button>`
                        : '') +
                    `</div>`
                ).join('');
                const total = orders.reduce((sum, o) => sum + o.price, 0);
                html += `${orderList}<br><strong>Total: $${total}</strong>`;
                if (allTables.classList.contains('bill-grid')) {
                    html += `<br><button class="done-btn" onclick="doneBill('${tableNum}')">Tính tiền</button>`;
                }
                html += '</div>';
            }
        }
        // If no tables have orders, show a message
        if (html === '') {
            html = '<div class="table-section"><p>No tables with orders.</p></div>';
        }
        allTables.innerHTML = html;

        if (!allTables.classList.contains('bill-grid')) {
            document.querySelectorAll('.table-section').forEach(section => {
                section.addEventListener('click', () => {
                    selectedTable = section.getAttribute('data-table');
                    document.querySelectorAll('.table-section').forEach(s => s.classList.remove('selected'));
                    section.classList.add('selected');
                    updateAllTables();
                });
            });
        }
    }
}

function setupRealTimeUpdates() {
    const allTables = document.getElementById('allTables');
    const bartenderList = document.getElementById('bartenderList');
    db.collection('data').doc('tables').onSnapshot(doc => {
        const tables = doc.exists ? doc.data() : {};
        
        if (allTables) {
            let html = '';
            for (let i = 1; i <= 20; i++) {
                const tableNum = i.toString();
                const orders = tables[tableNum]?.orders || [];
                html += `<div class="table-section${selectedTable === tableNum ? ' selected' : ''}" data-table="${tableNum}">`;
                html += `<h3>Bàn ${tableNum}</h3>`;
                if (orders.length > 0) {
                    const orderList = orders.map(o => 
                        `<div class="order-item">${o.name} - $${o.price}` +
                        (selectedTable === tableNum && !allTables.classList.contains('bill-grid') 
                            ? ` <button onclick="removeOrder('${tableNum}', '${o.timestamp}')">❌</button>`
                            : '') +
                        `</div>`
                    ).join('');
                    const total = orders.reduce((sum, o) => sum + o.price, 0);
                    html += `${orderList}<br><strong>Total: $${total}</strong>`;
                } else {
                    html += 'Chưa order.';
                }
                if (allTables.classList.contains('bill-grid')) {
                    html += `<br><button class="done-btn" onclick="doneBill('${tableNum}')">Done Bill</button>`;
                }
                html += '</div>';
            }
            allTables.innerHTML = html;
        }

        if (bartenderList) {
            let allOrders = [];
            for (let table in tables) {
                tables[table].orders.forEach(order => {
                    allOrders.push({ table, name: order.name, timestamp: order.timestamp });
                });
            }
            allOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            bartenderList.innerHTML = allOrders.length > 0
                ? allOrders.map(order => `<li style="background-color: ${getTableColor(order.table)};">Bàn ${order.table}: ${order.name} (${new Date(order.timestamp).toLocaleTimeString()})</li>`).join('')
                : '<li>No orders yet.</li>';
        }
    });
}

async function doneBill(tableNum) {
    let tables = await getTables();
    if (tables[tableNum] && tables[tableNum].orders.length > 0) {
        const total = tables[tableNum].orders.reduce((sum, o) => sum + o.price, 0);
        delete tables[tableNum];
        await saveTables(tables);
        completedOrders.push({ table: tableNum, total, date: new Date() });
        updateAllTables();
    }
}

async function removeOrder(tableNum, timestamp) {
    let tables = await getTables();
    if (tables[tableNum]) {
        tables[tableNum].orders = tables[tableNum].orders.filter(o => o.timestamp !== timestamp);
        if (tables[tableNum].orders.length === 0) delete tables[tableNum];
        await saveTables(tables);
        updateAllTables();
    }
}

async function editOrder(tableNum, timestamp) {
    let tables = await getTables();
    if (tables[tableNum]) {
        const oldOrder = tables[tableNum].orders.find(o => o.timestamp === timestamp);
        const newItemName = prompt(`Change "${oldOrder.name}" to:`, oldOrder.name);
        const menu = await getMenu();
        if (newItemName && menu.some(i => i.name === newItemName)) {
            const newItem = menu.find(i => i.name === newItemName);
            tables[tableNum].orders = tables[tableNum].orders.map(o => 
                o.timestamp === timestamp ? { name: newItem.name, price: newItem.price, timestamp: o.timestamp } : o
            );
            await saveTables(tables);
            updateAllTables();
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

setupRealTimeUpdates();