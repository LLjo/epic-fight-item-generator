
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const fsExtra = require('fs-extra');
const open  = require('open');

const app = express();
const PORT = 3000;

const weaponTypes = JSON.parse(fs.readFileSync('weaponTypes.json', 'utf-8'));  // Load weaponTypes at server start
let parentDir

app.use(express.static('public'), bodyParser.json());

app.post('/findFile', async (req, res) => {
    if (!req.body.filename) {
        return res.status(400).send('Filename not provided');
    }

    const findFileInDir = (startPath, filter) => {
        let result = null;
        fs.readdirSync(startPath).forEach(dir => {
            const filePath = path.join(startPath, dir);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                result = result || findFileInDir(filePath, filter);
            } else if (dir === filter) {
                result = filePath;
            }
        });
        return result;
    }

    const foundFilePath = findFileInDir('./items', req.body.filename);
    if (!foundFilePath) {
        return res.status(404).send('File not found in /items directory');
    }

    parentDir = path.dirname(path.dirname(foundFilePath)); 
    const texturesDir = path.join(parentDir, 'textures/item');
    let textures = [];
    if (fs.existsSync(texturesDir)) {
        textures = fs.readdirSync(texturesDir).filter(file => {
            return fs.statSync(path.join(texturesDir, file)).isFile();
        });
    }

    const items = JSON.parse(fs.readFileSync(foundFilePath, 'utf8'));

    const processedItems = {};
    const defaultWeapon = Object.keys(weaponTypes)[0];  // Gets the first weapon key from weaponTypes
    const defaultType = weaponTypes[defaultWeapon].type;  // Gets the type of the first weapon

    for (const [key, value] of Object.entries(items)) {
        const identifier = key.split('.').pop();
        const textureFileName = textures.find(texFile => texFile.split('.')[0] === identifier);

        // Convert image to base64
        let textureBase64 = null;
        if (textureFileName) {
            const imageBuffer = await fsExtra.readFile(path.join(texturesDir, textureFileName));
            textureBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        }
    
        let matchedWeapon = defaultWeapon;
        for (const [weapon, details] of Object.entries(weaponTypes)) {
            if (details.matches.some(match => value.toLowerCase().includes(match))) {
                matchedWeapon = weapon;
                break;
            }
        }
    
        processedItems[value] = {
            texture: textureBase64  || 'No texture',
            type: weaponTypes[matchedWeapon].type || defaultType,
            weapon: matchedWeapon,
            attributes: weaponTypes[matchedWeapon].attributes,
            fileName: identifier,
        };
    }

    console.log(processedItems)
    res.json({
        success: true,
        items: processedItems,
        weaponTypes: weaponTypes
    });
});





app.post('/saveData', (req, res) => {
    const currentDateTime = String((new Date()).getTime());
    const rootSavePath = `${parentDir}-${currentDateTime}/data`
    const weaponsSavePath = path.join(rootSavePath, `${parentDir.split("\\")[1]}/capabilities/weapons`);

    if (!fs.existsSync(weaponsSavePath)) {
        fs.mkdirSync(weaponsSavePath, { recursive: true });
    }
    const data = req.body;

    for (const [itemName, itemData] of Object.entries(data)) {
        const filePath = path.join(weaponsSavePath, `${itemName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(itemData, null, 4));  // 4 spaces indentation
    }

    // Create the additional JSON content
    const additionalJSONContent = {
        "pack": {
            "pack_format": 15,
            "description": `${parentDir.split("\\")[1]} converted weapons`
        }
    };
    
    // Path for the new file (located next to the "data" folder)
    const additionalFilePath = path.join(rootSavePath, '..', 'pack.mcmeta');

    // Write the content to the new file
    fs.writeFileSync(additionalFilePath, JSON.stringify(additionalJSONContent, null, 4));  // 4 spaces indentation
    
    res.json({ success: true });
});








app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    open(`http://localhost:${PORT}`);
});