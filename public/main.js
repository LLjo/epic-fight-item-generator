let items = [];
let textureFiles = [];
let weaponTypes = {};


async function loadItemsFromFile() {
    const file = document.getElementById('jsonInput').files[0];
    if (!file) return;

    const response = await fetch('/findFile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            filename: file.name
        })
    });

    const data = await response.json();
    if (data.success) {
        items = data.items;
        weaponTypes = data.weaponTypes;
        loadData();
    }
}

function loadData() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';  // Clear previous data

    for (const [key, value] of Object.entries(items)) {
        const row = document.createElement('tr');

        // Delete Button
        const deleteCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.onclick = () => {
            row.remove(); // Remove the row from the table
        };
        deleteCell.appendChild(deleteBtn);
        row.appendChild(deleteCell);

        // Item Name
        const nameCell = document.createElement('td');
        nameCell.textContent = key;  // The item name
        nameCell.setAttribute('value', value.fileName);
        row.appendChild(nameCell);

        // Texture
        const textureCell = document.createElement('td');
        const img = document.createElement('img');
        img.src = value.texture !== 'No texture' ? value.texture : '';
        img.alt = key;
        img.width = 50;
        textureCell.appendChild(img);
        row.appendChild(textureCell);

        // Weapon Type Dropdown
        const typeCell = document.createElement('td');
        const selectElem = document.createElement('select');
        for (const [weaponType, details] of Object.entries(weaponTypes)) {
            const optionElem = document.createElement('option');
            optionElem.value = weaponType;
            optionElem.textContent = `${weaponType} - ${details.type}`;

            if (value.weapon === weaponType) {
                optionElem.selected = true;
            }

            selectElem.appendChild(optionElem);
        }
        typeCell.appendChild(selectElem);
        row.appendChild(typeCell);

        // Additional Columns
        const weaponHeldType = value.attributes
        
        
        generateAttributes(weaponHeldType, row, 0)
        

        tableBody.appendChild(row);
    }
}

function generateAttributes(attributes, row, amount) {
    const checkboxCell = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.id = "is-two-handed"
    checkbox.type = 'checkbox';

    const genAttributes = (weaponValue, type) => {
        for (const [stat, statValue] of Object.entries(weaponValue)) {
            const statCell = document.createElement('td');
            const input = document.createElement('input');
                    
            input.type = 'number';
            input.setAttribute('weapon-style', type);
            input.placeholder = stat;
            input.value = statValue;
            input.classList.add('number-input')
            
            statCell.appendChild(input);
            row.appendChild(statCell);
        }

    }
    for (const [heldType, weaponValue] of Object.entries(attributes)) {
        let type = 'one-hand-number'
        if (amount === 1) {
            checkbox.checked = true;
            checkboxCell.appendChild(checkbox);
            row.appendChild(checkboxCell);
            type = 'two-hand-number'
        }
        
        genAttributes(weaponValue, type)
        

        
        amount ++
    }

    if (amount === 1) {
        const firstType = attributes['one_hand'] ?? atributes['common']
        const replaceValuesWithZero = obj => Object.keys(obj).forEach(key => obj[key] = 0);
        replaceValuesWithZero(firstType)
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);
        genAttributes(firstType, 'two-hand-number')
    }

}


document.getElementById('jsonInput').addEventListener('change', loadItemsFromFile);














function saveData() {
    const tableBody = document.getElementById('tableBody');
    const rows = tableBody.querySelectorAll('tr');
    const output = {};

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');

        const itemName = cells[1].getAttribute('value');

        // Assuming the dropdown for weapon type is in the third cell (index 2)
        const weaponType = cells[3].querySelector('select').value;

        let attributes = {};

        const inputs = row.querySelectorAll('input[weapon-style="one-hand-number"]');

        // Assuming the structure is always 'one_hand', this can be adjusted if needed
        const oneHandAttributes = {};

        inputs.forEach((input, index) => {
            const statName = input.placeholder;
            oneHandAttributes[statName] = parseFloat(input.value);
        });

        attributes['one_hand'] = oneHandAttributes;

        if (row.querySelector('#is-two-handed')?.checked) {
            const twoHandedInputs = row.querySelectorAll('input[weapon-style="two-hand-number"]');

            const twoHandAttributes = {};
            console.log('checked', twoHandedInputs)
            twoHandedInputs.forEach((input, index) => {
                const statName = input.placeholder;
                twoHandAttributes[statName] = parseFloat(input.value);
            })
            attributes['two_hand'] = twoHandAttributes;
        }

        output[itemName] = {
            type: weaponType,
            attributes: attributes
        };
    });

    // Now send the data to the server
    saveDataToServer(output);
}

async function saveDataToServer(data) {
    const response = await fetch('/saveData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
        showNotification("Data saved successfully!");
    } else {
        showNotification("Error while saving data.", 5000);
    }
}

document.getElementById('saveButton').addEventListener('click', saveData);


function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    notification.textContent = message;

    // Show the notification
    notification.classList.add('show');

    // Hide the notification after a certain duration
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}