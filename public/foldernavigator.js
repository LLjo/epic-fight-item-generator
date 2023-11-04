class DirectoryHandler {
    constructor(parentApp) {
        this.currentPath = '/items';
        this.selectedFile = null;
        this.currentMod = null;
        this.currentModFolderName = null;
		this.currentTab = 'items'
		this.parentApp = parentApp;

        // Bindings
        this.loadItemsFromFile = this.loadItemsFromFile.bind(this);

        // Event listeners
        this.bindEvents();
    }

    bindEvents() {
        $('#loadEditedFiles').off('click').on('click', async () => {
            await this.loadEditedItems(this.currentPath, this.selectedFile, 'editing');
        });

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

        $('#itemsTab').on('click', () => {
            $('#navigation-container .description').text('Navigate to the lang folder of the mod, select and load a json file.')
			$('#dataPackOutputsTab').removeClass('active')
			$('#itemsTab').addClass('active')
			this.currentTab = 'items'
			$('#loadButton').show()
			$('#loadEditedFiles').hide()
            this.loadDirectoryContent('/items');
        });

        $('#dataPackOutputsTab').on('click', () => {
            $('#navigation-container .description').text('Navigate to the folder containing your converted json files, press "Load files in folder".')
			$('#itemsTab').removeClass('active')
			$('#dataPackOutputsTab').addClass('active')
			$('#loadEditedFiles').text('Load files in folder')
			this.currentTab = 'datapack'
			$('#loadButton').hide()
			$('#loadEditedFiles').show()
			$('#loadEditedFiles').attr('disabled', true)
            this.loadDirectoryContent('/data_pack_output');
        });
    }
    async loadDirectoryContent(directory = '/items') {
		try {
			$('#loadEditedFiles').attr('disabled', true)
			$('#loadButton').prop('disabled', true);
			this.selectedFile = null;
	
			const response = await $.get('/getDirectoryContent', { path: directory });
			const $nav = $('#directoryNav').empty();
	
			// Display current path
			const $pathDisplay = $('<div>').addClass('path-display').text(directory);
			$nav.append($pathDisplay);
	
			// Back Button
			if(directory !== '/items' && directory !== '/data_pack_output') {
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
					if (this.currentTab === 'datapack' && this.currentPath.split('/').length === 4) this.currentModFolderName = directory.split('/').slice(2).join('/') 
					this.loadDirectoryContent(this.currentPath);
				});
				$nav.append($dirElem);
			});
	
			response.files.forEach(file => {
				const $fileElem = $('<div>').addClass('file-item').text(file);
				if (file.split('.').includes('json')) {
					$('#loadEditedFiles').attr('disabled', false)
				}
				$fileElem.on('click', () => {
					// Check if this item is currently selected
					if($fileElem.hasClass('selected')) {
						// It's currently selected, so deselect it
						$fileElem.removeClass('selected');
						this.selectedFile = null;
						if (this.currentTab === 'datapack') {
							$('#loadEditedFiles').text('Load files in folder')
						}
						$('#loadButton').prop('disabled', true);
					} else {
						// It's not selected, so select it and deselect others
						$('.file-item.selected').removeClass('selected');
						$fileElem.addClass('selected');
						this.selectedFile = file;
						if (this.currentTab === 'datapack') {
							$('#loadEditedFiles').text('Load file')
						}
						$('#loadButton').prop('disabled', false);
					}
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
            } else {
                console.error(data.message);
            }
        } catch (error) {
            console.error('Error occurred while extracting assets:', error);
        }
    }

    async loadItemsFromFile(directory, fileName, mode) {
        if (!fileName) return;

        const $loader = addLoader($('#tableBody tr td:first'));

        try {
            const response = await $.ajax({
                url: '/findFile',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ filepath: directory, filename: fileName, mode: mode })
            });

            if (response.success) {
                showNotification('Files successfully loaded!');
                this.items = response.items; // Storing items in App instance
                this.parentApp.loadTable(this.items);
            } else {
                showNotification('Something went wrong. Is the file a json file inside a lang folder?', 5000);
            }
        } catch (error) {
            console.error('Error loading items from file:', error);
        } finally {
            $loader.remove();
        }
    }

	async loadEditedItems(directory, fileName) {
        // if (!fileName) return;

        const $loader = addLoader($('#tableBody tr td:first'));

        try {
            const response = await $.ajax({
                url: '/findFilesAndTextures',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ filepath: directory, filename: fileName, currentModItemsPath: this.currentModFolderName, currentMod: this.currentMod, })
            });

            if (response.success) {
                showNotification('Files successfully loaded!');
                this.items = response.items; // Storing items in App instance
                this.parentApp.loadTable(this.items);
            } else {
                showNotification('Something went wrong. Is the file a json file inside a lang folder?', 5000);
            }
        } catch (error) {
            console.error('Error loading items from file:', error);
        } finally {
            $loader.remove();
        }
	}
}
