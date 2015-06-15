var sys = require('sys');
var exec = require('child_process').exec;
var fs = require('fs')

var puts = function(err,stdout,stderr){
	console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
      console.log('exec error: ' + error);
    }
}


var backup = function(dataList,exclude){
	var datastr = dataList.reduce(function(d0,d1,i,arr){
			return d0 + '\n' + d1;
		})
	fs.writeFileSync('backuplist.txt',datastr);

	if(!exclude){
		// exec('api/support/schema_backup.sh -i backuplist.txt gtfs',puts);	
	}else{
		// exec('api/support/schema_backup.sh -e backuplist.txt gtfs',puts);
	}
}	

module.exports = backup;