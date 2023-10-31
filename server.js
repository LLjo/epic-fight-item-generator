const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const fsExtra = require('fs-extra');
const open  = require('open');
const archiver = require('archiver');

const app = express();
const PORT = 3000;

// Ensure the default_types directory exists
if (!fs.existsSync('./default_types')) {
    fs.mkdirSync('./default_types');
}

const loadLatestWeaponTypes = () => {
    const files = fs.readdirSync('./default_types').filter(file => file.startsWith('weaponDefaults_'));
    
    // If there are no files, return an empty object or a default object if you have it
    if (files.length === 0) return {};

    // Sort the files based on timestamp and get the latest
    const latestFile = files.sort((a, b) => {
        const timestampA = parseInt(a.split('_')[1].split('.json')[0], 10);
        const timestampB = parseInt(b.split('_')[1].split('.json')[0], 10);
        return timestampB - timestampA;
    })[0];

    return JSON.parse(fs.readFileSync(`./default_types/${latestFile}`, 'utf-8'));
};

let parentDir;

app.use(express.static('public'), bodyParser.json());

const findTextureInDir = (startPath, filter, isRecursive = false) => {
    let results = [];
    console.log('dir', startPath)
    fs.readdirSync(startPath).forEach(dir => {
        const filePath = path.join(startPath, dir);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory() && isRecursive) {
            results = results.concat(findTextureInDir(filePath, filter, isRecursive));
        } else if (filePath.endsWith(filter)) {
            results.push(filePath);
        }
    });
    return results;
}


app.post('/findFile', async (req, res) => {
    const weaponTypes = loadLatestWeaponTypes();
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
    const texturesDir = path.join(parentDir, 'textures');

    let texturePaths = findTextureInDir(texturesDir, ".png", true); 

    const items = JSON.parse(fs.readFileSync(foundFilePath, 'utf8'));
    const processedItems = {};
    const defaultWeapon = Object.keys(weaponTypes)[0];  // Gets the first weapon key from weaponTypes
    const defaultType = weaponTypes[defaultWeapon].type;  // Gets the type of the first weapon
    
    for (const [key, value] of Object.entries(items)) {
        const identifier = key.split('.').pop();
        const textureFilePath = texturePaths.find(texPath => path.basename(texPath, '.png') === identifier);

        // Convert image to base64
        let textureBase64 = null;
        if (textureFilePath) {
            const imageBuffer = await fsExtra.readFile(textureFilePath);
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

    const output = fs.createWriteStream(path.join(rootSavePath, '..', `${parentDir.split("\\")[1]}-weapons-${currentDateTime}.zip`));
    const archive = archiver('zip', {
        zlib: { level: 9 } // Level 9 is the highest compression
    });

    output.on('close', function() {
        console.log('ZIP has been finalized and the output file descriptor has closed.');
        res.json({ success: true });
    });

    archive.on('error', function(err) {
        console.error('Error while creating ZIP:', err);
        res.status(500).send('Error creating ZIP archive');
    });

    // pipe archive data to the output file
    archive.pipe(output);

    // append the "data" folder (including the folder itself) to the ZIP
    archive.directory(rootSavePath, 'data');

    // append the "pack.mcmeta" file to the ZIP
    archive.file(additionalFilePath, { name: 'pack.mcmeta' });

    // finalize the ZIP creation
    archive.finalize();
    
    // res.json({ success: true });
});


app.post('/saveDefaultPreset', (req, res) => {
    const timestamp = req.query.timestamp;
    const newWeaponTypes = req.body;

    // Modify the filename to be stored inside the default_types directory
    const filename = `./default_types/weaponDefaults_${timestamp}.json`;

    fs.writeFile(filename, JSON.stringify(newWeaponTypes, null, 4), (err) => {
        if (err) {
            console.error('Error writing file', err);
            return res.json({ success: false });
        }
        res.json({ success: true });
    });
});

app.get('/getLatestWeaponDefaults', (req, res) => {
    const weaponTypes = loadLatestWeaponTypes();
    if (!weaponTypes) {
        return res.status(404).send('No weapon defaults found');
    }
    res.json(weaponTypes);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    open(`http://localhost:${PORT}`);
});