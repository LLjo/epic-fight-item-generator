const express = require('express');
const multer = require('multer');
const fsOriginal = require('fs');
const fsp = fsOriginal.promises;
const path = require('path');
const bodyParser = require('body-parser');
const fsExtra = require('fs-extra');
const open  = require('open');
const archiver = require('archiver');
const unzipper = require('unzipper');

const app = express();
const PORT = 3000;

let parentDir;

fsp.access('./default_types')
    .catch(() => fsp.mkdir('./default_types'));

app.use(express.static('public'), bodyParser.json());

const loadLatestWeaponTypes = async () => {
    const files = await fsp.readdir('./default_types').then(files => files.filter(file => file.startsWith('weaponDefaults_')));

    if (files.length === 0) return {};

    const latestFile = files.sort((a, b) => {
        const timestampA = parseInt(a.split('_')[1].split('.json')[0], 10);
        const timestampB = parseInt(b.split('_')[1].split('.json')[0], 10);
        return timestampB - timestampA;
    })[0];

    const fileContents = await fsp.readFile(`./default_types/${latestFile}`, 'utf-8');
    return JSON.parse(fileContents);
};



const findTextureInDir = async (startPath, filter, isRecursive = false) => {
    let results = [];
    try {
        const dirs = await fsp.readdir(startPath);
        for (const dir of dirs) {
            const filePath = path.join(startPath, dir);
            const stat = await fsp.stat(filePath);
            if (stat && stat.isDirectory() && isRecursive) {
                results = results.concat(await findTextureInDir(filePath, filter, isRecursive));
            } else if (filePath.endsWith(filter)) {
                results.push(filePath);
            }
        }

    } catch (err) { 
        results = []
    }
    return results;
};


app.post('/findFile', async (req, res) => {
    const weaponTypes = await loadLatestWeaponTypes();
    const { filepath, filename, currentmod } = req.body;
    if (!filename || !filepath) {
        return res.status(400).send('Filepath or Filename not provided');
    }
    
    // Combine the script directory with the relative path received from the frontend
    const absoluteFilePath = path.join(process.cwd(), filepath);
    const findFileInDir = async (startPath, filter) => {
        let result = null;
        const dirs = await fsp.readdir(startPath);
        for (const dir of dirs) {
            const filePath = path.join(startPath, dir);
            const stat = await fsp.stat(filePath);
            if (stat && stat.isDirectory()) {
                result = result || await findFileInDir(filePath, filter);
            } else if (dir === filter) {
                result = filePath;
            }
        }
        return result;
    }

    const foundFilePath = await findFileInDir(absoluteFilePath, filename);
    if (!foundFilePath) {
        return res.status(404).send(`File not found in ${absoluteFilePath} directory`);
    }

    parentDir = path.dirname(path.dirname(foundFilePath)); 
    const texturesDir = path.join(parentDir, 'textures');

    let texturePaths
    let items
    let processedItems
    let defaultWeapon
    let defaultType
    
    try {
        texturePaths = await findTextureInDir(texturesDir, ".png", true); 
        items = JSON.parse(await fsp.readFile(foundFilePath, 'utf8'));
        processedItems = {};
        defaultWeapon = Object.keys(weaponTypes)[0];
        defaultType = weaponTypes[defaultWeapon].type;

        for (const [key, value] of Object.entries(items)) {
            const identifier = key.split('.').pop();
            const textureFilePath = texturePaths.find(texPath => path.basename(texPath, '.png') === identifier);
            let textureBase64 = null;

            if (identifier === 'tooltip' || key.split('.')[0] !== 'item') continue

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
    } catch (err) {
        return res.json({
            success: false,
            items: processedItems,
            weaponTypes: weaponTypes,
            message: err.message,
        });
    }


    res.json({
        success: true,
        items: processedItems,
        weaponTypes: weaponTypes
    });
});




app.post('/saveData', async (req, res) => {
    const currentDateTime = String((new Date()).getTime());
    
    
    const data = req.body;
    const outputData = data.output
    const currentMod = data.currentmod
    const modDataPackSaveDir = path.join(process.cwd(), 'data_pack_output', currentMod)
    // Save to the project's /data_pack_output folder

    try {
        await fsp.access(currentMod);
        // File or directory exists
    } catch (error) {
        await fsp.mkdir(modDataPackSaveDir, { recursive: true });
        // File or directory doesn't exist
    } 


    const rootSavePath = path.join(modDataPackSaveDir, `${currentMod}-${currentDateTime}/data`);
    const weaponsSavePath = path.join(rootSavePath, `${currentMod}/capabilities/weapons`);
    
    try {
        await fsp.access(rootSavePath);
        // File or directory exists
    } catch (error) {
        await fsp.mkdir(weaponsSavePath, { recursive: true });
        // File or directory doesn't exist
    } 
    
    for (const [itemName, itemData] of Object.entries(outputData)) {
        const filePath = path.join(weaponsSavePath, `${itemName}.json`);
        await fsp.writeFile(filePath, JSON.stringify(itemData, null, 4));  // 4 spaces indentation
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
    await fsp.writeFile(additionalFilePath, JSON.stringify(additionalJSONContent, null, 4));  // 4 spaces indentation

    const output = fsOriginal.createWriteStream(path.join(rootSavePath, '..', `${currentMod}-weapons-${currentDateTime}.zip`));
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
});


app.post('/saveDefaultPreset', async (req, res) => {
    const timestamp = req.query.timestamp;
    const newWeaponTypes = req.body;

    // Modify the filename to be stored inside the default_types directory
    const filename = `./default_types/weaponDefaults_${timestamp}.json`;

    try {
        // Get list of files in the directory
        const files = await fsp.readdir('./default_types');
        
        // Filter JSON files and sort them
        const sortedFiles = files
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => Number(a.split('_')[1].split('.json')[0]) - Number(b.split('_')[1].split('.json')[0]));

        // If there are more than 15 files, remove the oldest one
        if (sortedFiles.length > 15) {
            await fsp.unlink(`./default_types/${sortedFiles[0]}`);
        }

        await fsp.writeFile(filename, JSON.stringify(newWeaponTypes, null, 4))
        res.json({ success: true });
    } catch (err) {
        console.error('Error:', err);
        res.json({ success: false });
    }
});

app.get('/getLatestWeaponDefaults', async (req, res) => {
    const weaponTypes = await loadLatestWeaponTypes();
    if (!weaponTypes) {
        return res.status(404).send('No weapon defaults found');
    }
    res.json(weaponTypes);
});

const BASE_DIR = process.cwd();

app.get('/getDirectoryContent', async (req, res) => {
    try {
        // Make sure to remove any leading '/' from the request path before joining.
        const relativePath = (req.query.path || '/').replace(/^\/+/, '');
        const dirPath = path.join(BASE_DIR, relativePath);
        
        const content = await fsp.readdir(dirPath, { withFileTypes: true });
        
        const directories = content.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
        const files = content.filter(dirent => dirent.isFile()).map(dirent => dirent.name);

        res.json({ directories, files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/extractAssets', async (req, res) => {
    const itemsDirectory = path.join(BASE_DIR, 'items');
    const jarFiles = (await fsp.readdir(itemsDirectory)).filter(file => path.extname(file).toLowerCase() === '.jar');

    // If no JAR files are found, return an error
    if (jarFiles.length === 0) {
        return res.status(404).json({ success: false, message: 'No jar files found in /items' });
    }

    try {
        // Process each JAR file
        for (const jarFile of jarFiles) {
            const jarPath = path.join(itemsDirectory, jarFile);
            const destinationDirectory = path.join(itemsDirectory, path.basename(jarFile, '.jar'));
            const parentDictName = destinationDirectory.split('-')[0]

            // Create a directory for extracted contents
            await fsp.mkdir(parentDictName, { recursive: true });

            // Stream the JAR file and extract relevant contents
            await new Promise((resolve, reject) => {
                const stream = fsOriginal.createReadStream(jarPath)
                    .pipe(unzipper.Parse())
                    .on('entry', function(entry) {
                        const fileName = entry.path;
                    
                        // If the entry is within the 'assets' folder
                        if (fileName.startsWith('assets/')) {
                            // Modify the destination path to place it inside the new directory
                            const destPath = path.join(parentDictName, fileName.replace('assets/', ''));
                    
                            if (entry.type === 'Directory') {
                                // If the entry is a directory, just ensure the directory is created
                                fsExtra.ensureDirSync(destPath);
                                entry.autodrain();
                            } else {
                                // If the entry is a file, ensure the parent directory exists and then extract it
                                fsExtra.ensureDirSync(path.dirname(destPath));
                                entry.pipe(fsOriginal.createWriteStream(destPath));
                            }
                        } else {
                            entry.autodrain();
                        }
                    });

                stream.on('finish', resolve);
                stream.on('error', reject);
            });
        }

        res.json({ success: true, message: 'Assets extracted successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error extracting assets', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    open(`http://localhost:${PORT}`);
});