﻿# epic-fight-item-generator

This is an item compability generator for the minecraft mod Epic Fight to easily generate data packs for other mods weapons. Made as a web app.

Start:
- Start the server pressing any of the node-linux, node-macos or node-win files. It should open up a page in your web browser (Works best on chrome).

**Important**
Right now mods that use subfolders for their weapons won't work, textures are in subfolders is ok. 

Make mod weapons compatible:
-------------------------
*Using the web page*:

- When starting the server it will read your default type settings (a json file located in the folder default_types)

- In the page You can edit any type and save whenever you want. It will create a new file in the default_types folder, the server always uses the latest file created.

- In the input field beneath the weapon type tabs you can add keywords that you want each weapon type to look for when loading in mods weapons.

*Load mod weapons to edit*:

- Open [anymod].jar, for example epicfight.jar.

- Take the mod folder for it's assets (assets -> [mod name folder]). Copy that folder into the "items" folder located in the EpicFightWeaponGenerator folder. 

- In the web page click on the input field "select lang file containing all items". Now navigate and select EpicFightWeaponGenerator/items/epicfight/lang/en_us.json

- It will now load all files from the mod into the table at the bottom of the page. It will also try to find texture for each item.

- Once all files are uploaded to the page you can change the default input fields for each type and it will change on all weapons that has that type in the table.

- Delete any file you dont want to save and then scroll down and press "Save as data pack". It will save a new folder in your /items folder.

- You should now be able to use that data pack located in /items/[modname]-xxxx/[modname]-xxxx.zip.


**It's still in WIP and I don't know how much more I will work on this but if you have suggestions leave them here**

Todo:

Load in generated items again.
Support mods with sub folders.
Maybe support armors?




