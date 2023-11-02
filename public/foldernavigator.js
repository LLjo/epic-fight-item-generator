class DirectoryHandler {
    constructor() {
        this.currentPath = '/items';
        this.selectedFile = null;
        this.currentMod = null;
        this.currentModFolderName = null;

        // Bindings
        this.loadItemsFromFile = this.loadItemsFromFile.bind(this);
        this.loadData = this.loadData.bind(this);

        // Event listeners
        $('#loadButton').off('click').on('click', async () => {
            if (this.selectedFile) {
                await this.loadItemsFromFile(this.currentPath, this.selectedFile);
            }
        });

        $('#reloadButton').off('click').on('click', async () => {
            const $loader = addLoader($('#directoryNav'));
            await this.extractAssets();
            await this.loadDirectoryContent();
            $loader.remove();
        });
    }

    async loadDirectoryContent(directory = '/items') {
        try {
            $('#loadButton').prop('disabled', true);
            this.selectedFile = false;

            const response = await $.get('/getDirectoryContent', { path: directory });
            const $nav = $('#directoryNav').empty();

            // Display current path
            const $pathDisplay = $('<div>').addClass('path-display').text(directory);
            $nav.append($pathDisplay);

            // Back Button
            if(directory !== '/items') {
                const $backButton = $('<button class="btn-secondary">').attr('id', 'backButton').text('Back').on('click', () => {
                    const parentPath = directory.split('/').slice(0, -1).join('/');
                    this.loadDirectoryContent(parentPath || '/items');
                });
                $nav.append($backButton);
            }

            response.directories.forEach(dir => {
                const $dirElem = $('<div>').addClass('directory-item').text(dir);
                $dirElem.on('click', () => {
                    this.currentPath = directory + '/' + dir; 
                    if (directory === '/items') this.currentModFolderName = dir;
                    if (this.currentPath.split('/').length === 4) this.currentMod = dir;
                    this.loadDirectoryContent(this.currentPath);
                });
                $nav.append($dirElem);
            });

            response.files.forEach(file => {
                const $fileElem = $('<div>').addClass('file-item').text(file);
                $fileElem.on('click', () => {
                    $('.file-item.selected').removeClass('selected');
                    $fileElem.addClass('selected');
                    this.selectedFile = file;
                    $('#loadButton').prop('disabled', false);
                });
                $nav.append($fileElem);
            });
        } catch (error) {
            console.error('Error loading directory content:', error);
        }
    }

    async extractAssets() {
        try {
            const response = await fetch('/extractAssets', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                console.log(data.message);
            } else {
                console.error(data.message);
            }
        } catch (error) {
            console.error('Error occurred while extracting assets:', error);
        }
    }

    async loadItemsFromFile(directory, fileName) {
        if (!fileName) return;

        const $loader = addLoader($('#tableBody tr td:first'));

        try {
            const response = await $.ajax({
                url: '/findFile',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ filepath: directory, filename: fileName })
            });

            if (response.success) {
                showNotification('Files successfully loaded!');
                this.items = response.items; // Storing items in App instance
                this.loadData();
            } else {
                showNotification('Something went wrong. Is the file a json file inside a lang folder?', 5000);
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
            const tableRow = new TableRow(key, value, this.weaponTypes); // Assuming TableRow is a class in your ecosystem
            $tableBody.append(tableRow.render());
        });
    }
}
