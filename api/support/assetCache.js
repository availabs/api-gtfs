//base code for Caching.
var fs = require('fs');
var appname = 'api-gtfs';
var assetCache = {
	
	cache : {},

	checkCache : function(assetDir,assetFile,callback){
		console.log('----------------checkCache----------------')
		var file = __dirname.substring(0,__dirname.indexOf(appname)+appname.length) + '/assets/'+assetDir + assetFile;
		
		console.time('file Read')
		fs.readFile(file, 'utf8', function (err, data) {
		  if (err) {
		    console.log('Error: ' + err);
		    return callback(false);
		  }
		 		 
		  console.timeEnd('file Read');
		  data = JSON.parse(data);
		  return callback(data);
		 
		});

	},

	addData : function(assetDir,assetFile,data){
		var dir = __dirname.substring(0,__dirname.indexOf(appname)+appname.length) + '/assets/'+assetDir;

		ensureExists(dir, 0744, function(err) {
		    if (err){
		    	console.log('ensure exists error',dir)
		    	console.log(err);
		    } // handle folder creation error
		    var file = dir+assetFile;
		    
		    fs.writeFile(file,JSON.stringify(data), function(err) {
			    if(err) {
			        console.log('file write error',err);
			    } else {
			        console.log("The file was saved!",file);
			    }
			});
		
		});

	},

};

function ensureExists(path, mask, cb) {
    if (typeof mask == 'function') { // allow the `mask` parameter to be optional
        cb = mask;
        mask = 0777;
    }
    mkdirp = require('mkdirp');
    var opts = {mode:mask};
    mkdirp(path, opts, function(err) {
        if (err) {
            if (err.code == 'EEXIST') cb(null); // ignore the error if the folder already exists
            else cb(err); // something else went wrong
        } else cb(null); // successfully created folder
    });
}



module.exports = assetCache;