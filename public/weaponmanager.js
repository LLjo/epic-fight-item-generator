class WeaponManager {
    constructor(parentApp) {
        this.currentWeapon = null;
        this.weaponTypes = []
		this.parentApp = parentApp;
        // Initialize event listeners
        this.initEventListeners();
    }

    initEventListeners() {
        $('#saveDefaultPreset').on('click', this.saveDefaultPreset.bind(this));

        $('.tab').on('click', function() {
            $('.tab').removeClass('active');
            $(this).addClass('active');

            const selectedTab = $(this).data('tab');
            if (selectedTab === 'one-hand') {
                $('td.one-hand-number').show();
                $('td.two-hand-number').hide();
            } else {
                $('td.two-hand-number').show();
                $('td.one-hand-number').hide();
            }
        });
    }

	async fetchWeaponDefaults() {
		const $loader = addLoader($('#directoryNav'))
		await fetch('/getLatestWeaponDefaults')
			.then(response => response.json())
			.then(async (data) => {
				this.weaponTypes = data
			})
			.catch(error => {
				console.error("Error fetching weapon defaults:", error);
			});
		$loader.remove()
	}

	addTag(container, tagName) {
		const $tag = $('<span>').addClass('match-tag').text(tagName);

		$tag.click(() => {
			$tag.remove();
			const matchIndex = this.weaponTypes[this.currentWeapon].matches.indexOf(tagName);
			if (matchIndex > -1) {
				this.weaponTypes[this.currentWeapon].matches.splice(matchIndex, 1);
		}});
		container.append($tag);
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
				const $holder = $('<div>').addClass('holder')
				$.each(attributeKeys, (index, attrKey) => {
					const $inputHolder = $('<div class="input-holder">')
					const $inputLabel = $('<label>').text(attrKey);
					const $input = $('<input>').attr({
						type: 'number',
						'data-weapon': weaponType,
						'data-attribute': attrKey,
						'data-hand-type': handType,
						placeholder: attrKey
					}).addClass('default-attribute-input');
					
					$input.on('input', this.updateWeaponAttributes.bind(this));
					$inputHolder.append($inputLabel).append($input);
					$holder.append($inputHolder);
				});
				$column.append($holder);
			});
	
			// Tag UI Feature
			this.currentWeapon = weaponType; // Temporarily set current weapon type
			const $matchesContainer = $('<div>').addClass('matches-container');
			this.generateMatchesTabContent($matchesContainer);
			$wrapper.append($matchesContainer);
	
			$wrapper.append($leftColumn).append($rightColumn);
			$container.append($wrapper);
		});
	
		this.replaceWeaponAttributesWithDefaults()
		// Default: First tab active
		$tabs.children().first().click();
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
	
	replaceWeaponAttributesWithDefaults() {
		$.each(this.weaponTypes, (weaponType, details) => {
			$.each(details.attributes, (handType, attributes) => {
				$.each(attributes, (attrKey, attrValue) => {
					const $input = $(`input[data-weapon="${weaponType}"][data-attribute="${attrKey}"][data-hand-type="${handType}"]`);
					$input.val(attrValue);
				});
			});
		});
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

}