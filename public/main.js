class TableRow {
    constructor(itemKey, itemData, weaponTypes) {
        this.itemKey = itemKey;
        this.itemData = itemData;
        this.weaponTypes = weaponTypes;
        this.$row = $('<tr>').addClass('table-row-hover-effect');
    }

    generateDeleteButton() {
        const $deleteBtn = $('<button>').text('Delete').addClass('delete-btn');
        $deleteBtn.click(() => this.$row.remove());
        const $deleteCell = $('<td>').append($deleteBtn);
        this.$row.append($deleteCell);
    }

    generateNameCell() {
        const $nameCell = $('<td>').text(this.itemKey).attr('value', this.itemData.fileName);
        this.$row.append($nameCell);
    }

    generateTextureCell() {
        const $img = $('<img>').attr({
            src: this.itemData.texture !== 'No texture' ? this.itemData.texture : '',
            alt: this.itemKey,
            width: 50
        });
        const $textureCell = $('<td>').append($img);
        this.$row.append($textureCell);
    }

    generateWeaponDropdown() {
        const $selectElem = $('<select>');
        $.each(this.weaponTypes, (weaponType, details) => {
            const $optionElem = $('<option>').val(weaponType).text(`${weaponType} - ${details.type}`);
            if (this.itemData.weapon === weaponType) {
                $optionElem.prop('selected', true);
            }
            $selectElem.append($optionElem);
        });
        const $typeCell = $('<td colspan="2">').append($selectElem);
        this.$row.append($typeCell);
    }
    
    generateAttributesCell() {
        const weaponHeldType = this.itemData.attributes;
        let amount = 0;

        const $checkboxCell = $('<td>');
        const $checkbox = $('<input>').attr({
            id: 'is-two-handed',
            type: 'checkbox'
        });

        const genAttributes = (weaponValue, type) => {
            $.each(weaponValue, (stat, statValue) => {
                const $input = $('<input>').attr({
                    type: 'number',
                    'weapon-style': type,
                    placeholder: stat,
                    value: statValue
                }).addClass('number-input');
                const $statCell = $('<td>').append($input);
                this.$row.append($statCell);
            });
        };

        $.each(weaponHeldType, (heldType, weaponValue) => {
            let type = 'one-hand-number';
            if (amount === 1) {
                $checkbox.prop('checked', true);
                $checkboxCell.append($checkbox);
                this.$row.append($checkboxCell);
                type = 'two-hand-number';
            }
            genAttributes(weaponValue, type);
            amount++;
        });

        if (amount === 1) {
            const firstType = weaponHeldType['one_hand'] || weaponHeldType['common'];
            $.each(firstType, (key) => {
                firstType[key] = 0;
            });
            $checkboxCell.append($checkbox);
            this.$row.append($checkboxCell);
            genAttributes(firstType, 'two-hand-number');
        }
    }

    render() {
        this.generateDeleteButton();
        this.generateNameCell();
        this.generateTextureCell();
        this.generateWeaponDropdown();
        this.generateAttributesCell();
        return this.$row;
    }
}

class App {
    constructor() {
        this.items = [];
        this.weaponTypes = {};
        $('#jsonInput').on('change', this.loadItemsFromFile.bind(this));
        $('#saveButton').on('click', this.saveData.bind(this));
    }

    gatherDefaultPreset() {
        const output = {};

        $.each(this.weaponTypes, (weaponType, _) => {
            output[weaponType] = { attributes: {} };
            const handsTypes = ['one_hand', 'two_hand'];
            handsTypes.forEach(handType => {
                output[weaponType].attributes[handType] = {};

                $(`#${weaponType}-content input[data-hand-type="${handType}"]`).each(function() {
                    const $input = $(this);
                    const attrKey = $input.attr('data-attribute');
                    const attrValue = parseFloat($input.val() || 0);
                    if (attrValue > 0) {
                        output[weaponType].attributes[handType][attrKey] = attrValue;
                    }
                });
            });
        });

        return output;
    }

    async saveDefaultPreset() {
        const newWeaponTypes = {};
        const self = this
    
        $('.weapon-default-wrapper').each(function() {
            const $wrapper = $(this);
            const weaponType = $wrapper.attr('id').split('-content')[0];
    
            const attributes = {};
    
            // Iterate through each hand type (one_hand and two_hand)
            ['one_hand', 'two_hand'].forEach(handType => {
                const handAttributes = {};
    
                $wrapper.find(`input[data-hand-type="${handType}"]`).each(function() {
                    const $input = $(this);
                    const attrKey = $input.attr('data-attribute');
                    handAttributes[attrKey] = parseFloat($input.val() || 0);
                });
    
                if (handType === 'two_hand' && Object.values(handAttributes).some(val => val > 0)) {
                    attributes[handType] = handAttributes;
                } else if (handType === 'one_hand') {
                    attributes[handType] = handAttributes;
                }
            });
            console.log('wea', self.weaponTypes, weaponType)
            newWeaponTypes[weaponType] = {
                type: weaponType,
                attributes: attributes,
                matches: self.weaponTypes[weaponType]?.matches || []
            };
        });
    
        try {
            const timestamp = new Date().getTime();
            const response = await $.ajax({
                url: `/saveDefaultPreset?timestamp=${timestamp}`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(newWeaponTypes)
            });
    
            if (response.success) {
                showNotification("Default preset saved successfully!");
            } else {
                showNotification("Error while saving default preset.", 5000);
            }
        } catch (error) {
            console.error('Error saving default preset:', error);
        }
    }

    loadWeaponDefaults() {
        const $tabs = $('#tabs').empty();
        const $container = $('#weapon-attributes-container').empty();
        const attributeKeys = ["damage_bonus", "speed_bonus", "armor_negation", "impact", "max_strikes"];
        const handsTypes = ['one_hand', 'two_hand'];

        
    
        $.each(this.weaponTypes, (weaponType, details) => {
            const $tabButton = $('<button>').text(weaponType).addClass('tab-btn').click(() => {
                $('.weapon-default-wrapper').hide();
                $(`#${weaponType}-content`).show();
                $('.tab-btn').removeClass('active');
                $tabButton.addClass('active');
            });
            $tabs.append($tabButton);
    
            const $wrapper = $('<div>').addClass('weapon-default-wrapper').attr('id', `${weaponType}-content`).hide();
            const $leftColumn = $('<div>').addClass('column');
            const $rightColumn = $('<div>').addClass('column');
            
            handsTypes.forEach(handType => {
                const $column = handType === 'one_hand' ? $leftColumn : $rightColumn;
                $column.append(`<h4>${handType.replace("_", " ").toUpperCase()}</h4>`);
                $.each(attributeKeys, (index, attrKey) => {
                    const $inputLabel = $('<label>').text(attrKey);
                    const $input = $('<input>').attr({
                        type: 'number',
                        'data-weapon': weaponType,
                        'data-attribute': attrKey,
                        'data-hand-type': handType,
                        placeholder: attrKey
                    }).addClass('default-attribute-input');
                    
                    $input.on('input', this.updateWeaponAttributes.bind(this));
                    $column.append($inputLabel).append($input);
                });
            });
            
            $wrapper.append($leftColumn).append($rightColumn);
            $container.append($wrapper);
        });

        $.each(this.weaponTypes, (weaponType, details) => {
            $.each(details.attributes, (handType, attributes) => {
                $.each(attributes, (attrKey, attrValue) => {
                    const $input = $(`input[data-weapon="${weaponType}"][data-attribute="${attrKey}"][data-hand-type="${handType}"]`);
                    $input.val(attrValue);
                });
            });
        });
        
        // Default: First tab active
        $tabs.children().first().click();
    }
    

    updateWeaponAttributes(e) {
        const $input = $(e.currentTarget);
        const weaponType = $input.attr('data-weapon');
        const attribute = $input.attr('data-attribute');
        const handType = $input.attr('data-hand-type');
        const newValue = parseFloat($input.val() || 0);
    
        // Reactively update the rows in the table that use this weapon type
        $('#tableBody tr').each(function() {
            const $row = $(this);
            if ($row.find('td:eq(3) select').val() === weaponType) {
                const inputSelector = handType === 'two_hand' ? 
                    `input[weapon-style="two-hand-number"][placeholder="${attribute}"]` :
                    `input[weapon-style="one-hand-number"][placeholder="${attribute}"]`;
                $row.find(inputSelector).val(newValue);
            }
        });
    }
    async loadItemsFromFile() {
        const file = $('#jsonInput').prop('files')[0];
        if (!file) return;

        try {
            const response = await $.ajax({
                url: '/findFile',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ filename: file.name })
            });

            if (response.success) {
                this.items = response.items;
                this.weaponTypes = response.weaponTypes;
                this.loadWeaponDefaults(); // add this
                this.loadData();
            }
        } catch (error) {
            console.error('Error loading items from file:', error);
        }
    }

    loadData() {
        const $tableBody = $('#tableBody').empty();
        $.each(this.items, (key, value) => {
            const tableRow = new TableRow(key, value, this.weaponTypes);
            $tableBody.append(tableRow.render());
        });
    }

    async saveData() {
        const output = {};

        $('#tableBody tr').each(function() {
            const $row = $(this);
            const itemName = $row.find('td:eq(1)').attr('value');
            const weaponType = $row.find('td:eq(3) select').val();

            let attributes = {};
            const oneHandAttributes = {};

            $row.find('input[weapon-style="one-hand-number"]').each(function() {
                const $input = $(this);
                const statName = $input.attr('placeholder');
                oneHandAttributes[statName] = parseFloat($input.val());
            });

            attributes['one_hand'] = oneHandAttributes;

            if ($row.find('#is-two-handed').prop('checked')) {
                const twoHandAttributes = {};
                $row.find('input[weapon-style="two-hand-number"]').each(function() {
                    const $input = $(this);
                    const statName = $input.attr('placeholder');
                    twoHandAttributes[statName] = parseFloat($input.val());
                });
                attributes['two_hand'] = twoHandAttributes;
            }

            output[itemName] = {
                type: weaponType,
                attributes: attributes
            };
        });

        try {
            const response = await $.ajax({
                url: '/saveData',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(output)
            });

            if (response.success) {
                showNotification("Data saved successfully!");
            } else {
                showNotification("Error while saving data.", 5000);
            }
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }
}

function showNotification(message, duration = 3000) {
    const $notification = $('#notification').text(message).addClass('show');
    setTimeout(() => {
        $notification.removeClass('show');
    }, duration);
}

const app = new App();

document.addEventListener('DOMContentLoaded', () => {
    fetch('/getLatestWeaponDefaults')
        .then(response => response.json())
        .then(data => {
            app.weaponTypes = data
            app.loadWeaponDefaults()
        })
        .catch(error => {
            console.error("Error fetching weapon defaults:", error);
        });
});


$('#saveDefaultPreset').on('click', app.saveDefaultPreset.bind(app));