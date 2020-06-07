let ffprobe = require('ffprobe');
let ffprobeStatic = require('ffprobe-static');
let fs = require('fs');
let mkdirp = require('mkdirp');
let id3 = require('node-id3');
let os = require('os');
let path = require('path');

if(process.argv.length != 3 && process.argv.length != 4) {
  console.error(`Invalid number of arguments. This is the correct usage:
    node index.js <source directory> <destination directory> [-mirror|-scan]
    By default, this script will flatten the source nested directory.
  `)
  return;
}
let sourceDir = process.argv[2];
let options = process.argv.length == 4 ? process.argv[3] : null;

console.log("source directory:", sourceDir);
console.log("options:", options);
console.log("\n\nSearching for files...\n");

recFindByExt(sourceDir, options);

function recFindByExt(fromDir,  options) {
  let { COPYFILE_EXCL } = fs.constants;
  let files = fs.readdirSync(fromDir);

  files.forEach(
    function (file) {
      let sourceFile = path.join(fromDir,file);

      if ( fs.statSync(sourceFile).isDirectory()) {
        recFindByExt(sourceFile, options);
      }
      else if(sourceFile.indexOf(".DS_Store") == -1) {
        probeFile(fromDir, sourceFile);
      }
    }
  );
}

function probeFile(dir, fileName) {
  ffprobe(fileName, { path: ffprobeStatic.path }, function (err, info) {
    if (err) {
      console.error(`ERROR in ffprobe:`,fileName, err);
      return;
    }

    // console.log(info);

    info.streams.map(stream => {
      if(stream.codec_type == "audio") {
        let fileExtension = stream.codec_name;
        renameFileUsingTags(dir, fileName, fileExtension);
      }
    })
  });
}


function renameFileUsingTags(dir, fileName, fileExtension) {
  id3.read(fileName, function (err, tags) {
    if (err) {
      console.error(`ERROR in id3.read:`,fileName, err);
      return;
    }

    // console.log(tags);
    let artist = tags.artist;
    var title = tags.title;

    if(title.indexOf("- ") > -1) {
      title = title.replace("- ", "(") + ")";
    }
    let newFileName = `${dir}${path.sep}${artist} - ${title}.${fileExtension}`;
    renameFile(fileName, newFileName);
  });
}

function renameFile(original, latest) {
  fs.rename(original, latest, (err) => {
    if (err) {
      console.error("ERROR renaming file!\noriginal File Name:", original,
        "\n\tNew File Name:", latest, "\n", err
      )
      return;
    }

    console.log("original File Name:", original,
      "\n\tNew File Name:", latest
    )
  });
}
