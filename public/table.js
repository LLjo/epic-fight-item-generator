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