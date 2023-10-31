class App {
    constructor() {
        this.items = [];
        this.weaponTypes = {};
        const self = this

        $('#loadButton').off('click').on('click', async () => {
            if (selectedFile) {
                await self.loadItemsFromFile(currentPath, selectedFile);
            }
        });

        $('.tab').on('click', function() {
            // Remove active class from all tabs and apply to clicked one
            $('.tab').removeClass('active');
            $(this).addClass('active');
    
            const selectedTab = $(this).data('tab');
            // Show only the attributes corresponding to the selected tab
            if (selectedTab === 'one-hand') {
                $('td.one-hand-number').show();
                $('td.two-hand-number').hide();
            } else {
                $('td.two-hand-number').show();
                $('td.one-hand-number').hide();
            }
        });

        $('#saveButton').on('click', this.saveData.bind(this));
        $('#saveDefaultPreset').on('click', this.saveDefaultPreset.bind(this));
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
            const weapon = $wrapper.attr('id').split('-content')[0];
            const weaponStyle = $wrapper.attr('weapon-type').split('-content')[0];
    
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
            const weaponMatches = [];
            $wrapper.find('.match-tag').each(function() {
                const clonedTag = $(this).clone(); // Clone the current element
                clonedTag.children().remove(); // Remove child elements (e.g., the span with "x")
                weaponMatches.push(clonedTag.text().trim()); // Get the cleaned-up text and add to the array
            });
            newWeaponTypes[weapon] = {
                type: weaponStyle,
                attributes: attributes,
                matches: weaponMatches,
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
            $wrapper.attr('weapon-type', details.type)
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
    
            // Tag UI Feature
            this.currentWeapon = weaponType; // Temporarily set current weapon type
            const $matchesContainer = $('<div>').addClass('matches-container');
            this.generateMatchesTabContent($matchesContainer);
            $wrapper.append($matchesContainer);
    
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

    generateMatchesTabContent(tabContent) {
        const $tagsContainer = $('<div>').addClass('tags-container');
        tabContent.append($tagsContainer);
    
        const $inputField = $('<input>').attr('type', 'text').attr('placeholder', 'Add weapon keyword match to look for in the lang file...');
        tabContent.append($inputField);
    
        $inputField.on('keyup', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                const inputValue = $inputField.val().trim();
                if (inputValue && !this.weaponTypes[this.currentWeapon].matches.includes(inputValue)) {
                    this.weaponTypes[this.currentWeapon].matches.push(inputValue);
                    this.addTag($tagsContainer, inputValue);
                    $inputField.val('');  // Clear the input
                }
            }
        });
    
        // Initial population of tags from existing matches
        this.weaponTypes[this.currentWeapon].matches.forEach(matchItem => {
            this.addTag($tagsContainer, matchItem);
        });
    }

    addTag(container, tagName) {
        const $tag = $('<span>').addClass('match-tag').text(tagName);

        $tag.click(() => {
            $tag.remove();
            const matchIndex = this.weaponTypes[this.currentWeapon].matches.indexOf(tagName);
            if (matchIndex > -1) {
                this.weaponTypes[this.currentWeapon].matches.splice(matchIndex, 1);
            }
        });
        container.append($tag);
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
    async loadItemsFromFile(directory, fileName) {
        if (!fileName) return;
        const $loader = addLoader($('#tableBody tr td:first'))
    
        try {
            const response = await $.ajax({
                url: '/findFile',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ filepath: directory, filename: fileName})
            });
    
            if (response.success) {
                showNotification('Files successfully loaded!');
                this.items = response.items;
                this.weaponTypes = response.weaponTypes;
                this.loadWeaponDefaults();
                this.loadData();
            } else {
                showNotification('Something went wrong trying to find data from the selected file. Is the file a json file inside a lang folder?', 5000);
            }
        } catch (error) {
            console.error('Error loading items from file:', error);
        } finally {
            $loader.remove();
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
                data: JSON.stringify({ output: output, currentmod: currentMod, })
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

let currentPath = '/items'; // Hold current path
let selectedFile = null;
let currentMod = null

async function loadDirectoryContent(directory = '/items') {
    try {
        $('#loadButton').prop('disabled', true);
        selectedFile = false

        const response = await $.get('/getDirectoryContent', { path: directory });
        const $nav = $('#directoryNav').empty();

        // Display current path
        const $pathDisplay = $('<div>').addClass('path-display').text(directory);
        $nav.append($pathDisplay);

        // Back Button
        if(directory !== '/items') {
            const $backButton = $('<button class="btn-secondary">').attr('id', 'backButton').text('Back').on('click', () => {
                // Navigate back to the parent directory
                const parentPath = directory.split('/').slice(0, -1).join('/');
                loadDirectoryContent(parentPath || '/items');
            });
            $nav.append($backButton);
        }

        response.directories.forEach(dir => {
            const $dirElem = $('<div>').addClass('directory-item').text(dir);
            $dirElem.on('click', () => {
                if(directory === '/items') currentMod = dir
                currentPath = directory + '/' + dir; 
                loadDirectoryContent(currentPath);
            });
            $nav.append($dirElem);
        });

        response.files.forEach(file => {
            const $fileElem = $('<div>').addClass('file-item').text(file);
            $fileElem.on('click', () => {
                $('.file-item.selected').removeClass('selected');
                $fileElem.addClass('selected');
                selectedFile = file;
                $('#loadButton').prop('disabled', false);
            });
            $nav.append($fileElem);
        });

    } catch (error) {
        console.error('Error loading directory content:', error);
    }
}


function addLoader($target) {
    const $spinner = $('<div id="spinner" class="spinner"></div>')
    $target.append($spinner)
    $spinner.show()

    return $spinner
}

$(async () => {
    fetch('/getLatestWeaponDefaults')
        .then(response => response.json())
        .then(data => {
            app.weaponTypes = data
            app.loadWeaponDefaults()
        })
        .catch(error => {
            console.error("Error fetching weapon defaults:", error);
        });
    await loadDirectoryContent();

})



