const express = require('express');
const fs = require('fs');
const convert = require('heic-convert');
const multer = require('multer');
const bodyParser = require("body-parser");
const AdmZip = require('adm-zip');
const {
    promisify
} = require('util');
const app = express();
const port = process.env.PORT || 3000;

var storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, './uploads');
    },
    filename: function(req, file, callback) {
        callback(null, file.originalname);
    }
});

var upload = multer({
    storage: storage
}).array('files');

async function heicToJpg(file, output) {
    const inputBuffer = await promisify(fs.readFile)(file);
    const outputBuffer = await convert({
        buffer: inputBuffer, // the HEIC file buffer
        format: 'PNG' // output format
    });
    await promisify(fs.writeFile)(output, outputBuffer);
    await promisify(fs.unlink)(file);
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
})

app.post('/convert', function(req, res) {
    upload(req, res, function(err) {
        if (err) return res.end("Error uploading file.");

        // If upload successful
        const zip = new AdmZip();
        const downloadName = `${Date.now()}.zip`;
        const files = fs.readdirSync("./uploads");
        var size = files.length;
        var remaining = size;
        files.forEach(file => {
            var input_file = "./uploads/" + file;
            var output_file = input_file.substring(0,input_file.length - 4) + "png";
            heicToJpg(input_file, output_file).then(() => {
                zip.addLocalFile(output_file);
                fs.unlinkSync(output_file);
                --remaining;
                if (remaining == 0) {
                    const data = zip.toBuffer();
                    res.set('Content-Type', 'application/octet-stream');
                    res.set('Content-Disposition', 'attachment; filename=' + downloadName);
                    res.set('Content-Length', data.length);
                    res.send(data);
                }
            });
        });
    });
});

app.listen(port, () => {
    if (!fs.existsSync(__dirname + "/uploads")) {
        fs.mkdirSync(__dirname + "/uploads");
    }
    console.log(`Example app listening at http://localhost:${port}`);
})
