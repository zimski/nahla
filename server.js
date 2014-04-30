/**
 * NodeJs Server-Side Example for Fine Uploader (traditional endpoints).
 * Maintained by Widen Enterprises.
 *
 * This example:
 *  - handles non-CORS environments
 *  - handles delete file requests assuming the method is DELETE
 *  - Ensures the file size does not exceed the max
 *  - Handles chunked upload requests
 *
 * Requirements:
 *  - express (for handling requests)
 *  - rimraf (for "rm -rf" support)
 *  - mkdirp (for "mkdir -p" support)
 */

var //dependencies
    express = require("express"),
    fs = require("fs"),
    rimraf = require("rimraf"),
    mkdirp = require("mkdirp"),
    app = express(),

    // paths/constants
    fileInputName = "qqfile",
    assetsPath = __dirname + "/assets/",
    placeholdersPath = assetsPath + "placeholders/",
    uploadedFilesPath_origin = "/var/dropfiles/",
    uploadedFilesPath = "",
    chunkDirName = "chunks",
    maxFileSize = 0; // in bytes, 0 for unlimited


app.use(express.bodyParser({limit:"1000mb"}));
app.listen(9000);

// routes
app.use(express.static(__dirname));
app.use("/fineuploader", express.static(assetsPath));
app.use("/placeholders", express.static(placeholdersPath));
app.delete("/uploads/:uuid", onDeleteFile);
app.use(express.json({limit: '5000mb'}));
app.use(express.limit('5000mb'));
app.use(express.urlencoded({limit: '5000mb'}));
app.options('/uploads/:id', function(req, res){
  console.log("writing headers only");
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header("Access-Control-Allow-Headers", "Cache-Control,Origin, X-Requested-With, Content-Type, Accept");
  res.header('Cache-Control','no-cache,no-store');
  res.end('');
});

app.use(express.methodOverride());

app.post("/uploads/:port", onUpload);
// ## CORS middleware
// see: http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-nodejs
/*var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};
app.use(allowCrossDomain);*/
function onUpload(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    // update folder destination
    //
    uploadedFilesPath =uploadedFilesPath_origin+"/"+req.params.port 
    console.log('uploads');
    
    //res.header('Access-Control-Allow-Origin', "192.168.0.44:5000")
    var partIndex = req.body.qqpartindex;

    // text/plain is required to ensure support for IE9 and older
    res.set("Content-Type", "text/plain");

    if (partIndex == null) {
        onSimpleUpload(req, res);
    }
    else {
        onChunkedUpload(req, res);
    }
}

function onSimpleUpload(req, res) {
    var file = req.files[fileInputName],
        uuid = req.body.qquuid,
        responseData = {
            success: false
        };

    file.name = req.body.qqfilename;

    if (isValid(file.size)) {
        moveUploadedFile(file, uuid, function() {
            responseData.success = true;
            res.send(responseData);
        },
        function() {
            responseData.error = "Problem copying the file!";
            res.send(responseData);
        });
    }
    else {
        failWithTooBigFile(responseData, res);
    }
}

function onChunkedUpload(req, res) {
    var file = req.files[fileInputName],
        size = parseInt(req.body.qqtotalfilesize),
        uuid = req.body.qquuid,
        index = req.body.qqpartindex,
        totalParts = parseInt(req.body.qqtotalparts),
        responseData = {
            success: false
        };

    file.name = req.body.qqfilename;

    if (isValid(size)) {
        storeChunk(file, uuid, index, totalParts, function() {
            if (index < totalParts-1) {
                responseData.success = true;
                res.send(responseData);
            }
            else {
                combineChunks(file, uuid, function() {
                    responseData.success = true;
                    res.send(responseData);
                },
                function() {res.header("Access-Control-Allow-Origin", "*");

                    responseData.error = "Problem conbining the chunks!";
                    res.send(responseData);
                });
            }
        },
        function(reset) {
            responseData.error = "Problem storing the chunk!";
            res.send(responseData);
        });
    }
    else {
        failWithTooBigFile(responseData, res);
    }
}

function failWithTooBigFile(responseData, res) {
    responseData.error = "Too big!";
    responseData.preventRetry = true;
    res.send(responseData);
}

function onDeleteFile(req, res) {
    var uuid = req.params.uuid,
        dirToDelete = uploadedFilesPath + uuid;

    rimraf(dirToDelete, function(error) {
        if (error) {
            console.error("Problem deleting file! " + error);
            res.status(500);
        }

        res.send();
    });
}

function isValid(size) {
    return maxFileSize === 0 || size < maxFileSize;
}

function moveFile(destinationDir, sourceFile, destinationFile, success, failure) {
    mkdirp(destinationDir, function(error) {
        var sourceStream, destStream;

        if (error) {
            console.error("Problem creating directory " + destinationDir + ": " + error);
            failure();
        }
        else {
            sourceStream = fs.createReadStream(sourceFile);
            destStream = fs.createWriteStream(destinationFile);

            sourceStream
                .on("error", function(error) {
                    console.error("Problem copying file: " + error.stack);
                    destStream.end();
                    failure();
                })
                .on("end", function(){
                    destStream.end();
                    success();
                })
                .pipe(destStream);
        }
    });
}

function moveUploadedFile(file, uuid, success, failure) {
    var destinationDir = uploadedFilesPath + "/",
        fileDestination = destinationDir + file.name;

    moveFile(destinationDir, file.path, fileDestination, success, failure);
}

function storeChunk(file, uuid, index, numChunks, success, failure) {
    var destinationDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
        chunkFilename = getChunkFilename(index, numChunks),
        fileDestination = destinationDir + chunkFilename;

    moveFile(destinationDir, file.path, fileDestination, success, failure);
}

function combineChunks(file, uuid, success, failure) {
    var chunksDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
        destinationDir = uploadedFilesPath + uuid + "/",
        fileDestination = destinationDir + file.name;


    fs.readdir(chunksDir, function(err, fileNames) {
        var destFileStream;

        if (err) {
            console.error("Problem listing chunks! " + err);
            failure();
        }
        else {
            fileNames.sort();
            destFileStream = fs.createWriteStream(fileDestination, {flags: "a"});

            appendToStream(destFileStream, chunksDir, fileNames, 0, function() {
                rimraf(chunksDir, function(rimrafError) {
                    if (rimrafError) {
                        console.log("Problem deleting chunks dir! " + rimrafError);
                    }
                });
                success();
            },
            failure);
        }
    });
}

function appendToStream(destStream, srcDir, srcFilesnames, index, success, failure) {
    if (index < srcFilesnames.length) {
        fs.createReadStream(srcDir + srcFilesnames[index])
            .on("end", function() {
                appendToStream(destStream, srcDir, srcFilesnames, index+1, success, failure);
            })
            .on("error", function(error) {
                console.error("Problem appending chunk! " + error);
                destStream.end();
                failure();
            })
            .pipe(destStream, {end: false});
    }
    else {
        destStream.end();
        success();
    }
}

function getChunkFilename(index, count) {
    var digits = new String(count).length,
        zeros = new Array(digits + 1).join("0");

    return (zeros + index).slice(-digits);
}
