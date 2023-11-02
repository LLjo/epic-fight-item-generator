class App {
    constructor(weaponManager, directoryHandler) {
        this.weaponManager = weaponManager;
        this.directoryHandler = directoryHandler;
        this.items = this.directoryHandler.items;
        this.weaponTypes = this.weaponManager.weaponTypes;
        
        const self = this
        $('#saveButton').on('click', this.saveData.bind(this));
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
                data: JSON.stringify({ output: output, currentmod: this.directoryHandler.currentMod, currentModFolderName: this.directoryHandler.currentModFolderName, })
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


function addLoader($target) {
    const $spinner = $('<div class="spinner-background"><div id="spinner" class="spinner"></div></div>')
    $target.append($spinner)
    $spinner.show()

    return $spinner
}



$(async () => {
    const weaponManager = new WeaponManager();
    await weaponManager.fetchWeaponDefaults()
    weaponManager.loadWeaponDefaults()
    const directoryHandler = new DirectoryHandler();
    const app = new App(weaponManager, directoryHandler);

    const $loader = addLoader($('#directoryNav'));
    await directoryHandler.loadDirectoryContent();
    await directoryHandler.extractAssets(); // Here's the call you mentioned
    $loader.remove();
});