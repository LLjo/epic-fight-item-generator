# epic-fight-item-generator

This is an item compatibility generator for the minecraft mod Epic Fight to easily generate data packs for other mods weapons. Made as a web app.

Start:
- Start the server pressing the node-win file. It should open up a page in your web browser (Works best on chrome).

**Important**
Right now mods that use subfolders for their weapons won't work. 

Make mod weapons compatible:
-------------------------
**Using the app:**

- When starting the app it will read your default type settings (a json file located in the folder default_types I have provided one already).

- In the app you can edit any weapon type template and save whenever you want. It will create a new file in the default_types folder (Saves history of 15 files). The server always uses the latest file created.

- In the input field beneath the weapon type tabs you can add keywords that you want each weapon type to look and match with when loading in mods weapons.

- Save the default type template before loading in the mod items in the next step.

**Load mod weapons to edit:**

- Add any mod.jar into the /items folder (you can add as many as you want but it will increase the load). When starting the server it will unzip every mod's asset folder. You can also press the button "Update folders" whenever you added a new mod or removed one in the /items folder.

- In the folder navigator in the app, navigate and select for example epic-fight-item-generator/epicfight/lang/en_us.json

- It will now load all files from the mod into the table at the bottom of the page. It will also try to find texture for each item.

- Once all files are uploaded you can change the default input fields for each type and it will change on all weapons that has that type in the table.

- Delete any file you dont want to save and then scroll down and press "Save as data pack". It will save a new folder in your /data_pack_output folder.

- You should now be able to use that data pack located in /data_pack_output/[modname]-xxxx/[modname]-xxxx.zip.


**It's still in WIP and I don't know how much more I will work on this but if you have suggestions leave them here**

Todo:
Make it possible to load exported generated files.
Support mods with sub folders.
Maybe support armors?




