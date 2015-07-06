var dbhelper = require('./batchmod.js');
var pg = require('pg');
var connString = 'yourconnectionstringhere';
var fs = require('fs');
var segFinder = require('./simsegments');
var frequencybuilder = function(schema){

	var dotprod = function(l1,l2){
		var sum =0;
		for(var i =0, max = Math.min(l1.length,l2.length); i< max; i++){
			sum += l1[i]*l2[i];
		}
		return sum
	}

	var diffSecs = function(t1,t2){
		factors = [3600,60,1]
		t1 = t1.split(':');
		t2 = t2.split(':');
		var parseI = function(x){return parseInt(x)}
		var p1= t1.map(parseI);
		var p2 = t2.map(parseI);
		var ctime1 = dotprod(factors,p1);
		var ctime2 = dotprod(factors,p2);
		return (ctime2 - ctime1)
	}

	var processData = function(data){
		var diffMat = [];
		data.forEach(function(row){	//iterate through the data
			var diffs = [];			//init list of time differences
			var starts = row.starts;//get the list of start times
			if(starts.length-1 === 0){//if it only has one then when mark turnaround as 24 hours
				diffs.push(0)
			}else{
				for(var i = 0; i < starts.length-1; i++){//otherwise go through the list of times
					var t1 = starts[i];						//get current time
					var t2 = starts[i+1];					//and forthcoming time
					diffs.push(diffSecs(t1,t2));		//add their difference in seconds to the list
				}
			}
			//fs.appendFileSync('test.txt',JSON.stringify({starts:starts,diffs:diffs}));
			diffMat.push(diffs);						//add this trip groups time deltas to a list
		});
		return diffMat;


	}


	//function to partition a single list of time deltas
	//into groups
	var parseGroups = function(List){
		var groups = [[]], ix = 0,gix=0, lastEl, El;
		lastEl = List[ix++];
		groups[gix].push(lastEl);	//push first element into the first group
		while(ix < List.length){	//iterate through the list
			El = List[ix]		//get the next element of list
			if(El !== lastEl){	//if the current element last are not he same
				groups.push([]);		//create a new group
				gix += 1;				//increment the current group index
				ix += 1;				//increment index in the list
				El = List[ix];			//skip over the current element
				lastEl = El;			//set the current element to the one following
			}
			groups[gix].push(El)		//add the current element to the current group
			ix += 1;						//increment the index
		}
		groups = groups.map(function(g){
			if(!g[0])
				var d = 0
			else
				d = g[0]
			return {size:g.length, delta:d};
		})
		return groups
	}
	//function to group data into logical groups based on
	//common and connected time deltas
	var parseData = function(data,deltaMat){

		deltaMat.forEach(function(deltaList,i){
			var deltas=[] ,trip_ids = data[i].trips,tripList = [], starts = data[i].starts, startsList = [], ends=data[i].ends, endList=[];
			groupList = parseGroups(deltaList);//get a list of grouped time deltas
			groupList.forEach(function(group){ //for each grouping of time deltas
				deltas.push(group.delta);
				tripList.push(trip_ids.splice(0,group.size+1)); //add to the trip list the corresponding trips for each group
				startsList.push(starts.splice(0,group.size+1)); //add to the starts list the corresponding start times for each group
				endList.push(ends.splice(0,group.size+1));		//same for the end times
			})
			data[i].trips = tripList;
			data[i].starts = startsList;
			data[i].ends = endList;
			data[i].deltas = deltas;
		});
		fs.writeFileSync('test.txt',JSON.stringify(data));
		console.log('write finished')
		return data;
	}

	var newParseData = function(data){

		data.forEach(function(row,i){
			var deltas = [], trip_ids=data[i].trips, tripList = [], starts = data[i].starts, startsList = [], ends=data[i].ends, endList=[];
			debugger;
			groupList = segFinder(row.starts,diffSecs);
			groupList.forEach(function(group){
				var len = group.seg.length;
				deltas.push(group.del);
				tripList.push(trip_ids.splice(0,len)); //add to the trip list the corresponding trips for each group
				startsList.push(group.seg); //add to the starts list the corresponding start times for each group
				endList.push(ends.splice(0,len));		//same for the end times
			});
			data[i].trips = tripList;
			data[i].starts = startsList;
			data[i].ends = endList;
			data[i].deltas = deltas;
		});
		fs.writeFileSync('test.txt',JSON.stringify(data));
		console.log('write finished')
		return data;
	}

	var createFrequencies = function(data){
		var template  = 'INSERT INTO "?".frequencies(start_time,end_time,headway_secs,trip_id)'
						+'VALUES (?,?,?,?)';
		var objs = [];
		data.forEach(function(topoGroup){
			topoGroup.trips.forEach(function(tripGroup,i){
				tripGroup.forEach(function(trip_id){
					var obj = {
						table:schema,
						trip: '\'{' + trip_id + '}\'',
						start:"'"+topoGroup.starts[i][0]+"'",
						end:"'"+topoGroup.starts[i][topoGroup.starts[i].length-1]+"'",
						headway:topoGroup.deltas[i],
					};
					objs.push(obj);
				});
			});
		});
		map = ['table','start','end','headway','trip'];
		dbhelp = new dbhelper(template,objs);
		dbhelp.setMapping(map);
		fs.writeFileSync('test2.txt',dbhelp.getQuery());
		return dbhelp.getQuery();

	}

	var handleResponse = function(data){
		// var deltaMat = processData(data.rows);
		// parseData(data.rows,deltaMat);
		newParseData(data.rows);

		var sql = createFrequencies(data.rows);
		return sql;
	}
	pg.connect(connString,function(err,client,done){
		if(err){
			return console.error('error fetching client from pool',err)
		}
		var temp = 'Select array_agg(T2.starting ORDER BY T2.starting)as starts, array_agg(T2.ending ORDER BY T2.starting) as ends, T2.service_id, array_agg(T2.trip_id ORDER BY T2.starting) as trips from ( '
							+'SELECT MIN(ST.departure_time)as starting,MAX(ST.arrival_time)as ending, '
				  			+'T.route_id, T.service_id, T.shape_id, T.trip_id,T.direction_id, array_agg(ST.stop_id Order By ST.stop_sequence) as stops '
							+'FROM "?".trips as T '
							+'JOIN "?".stop_times as ST '
							+'ON T.trip_id = ST.trip_id '
							+'JOIN "?".calendar as C '
							+'ON T.service_id = C.service_id '
							+'Group By T.trip_id '
							+'Order By T.route_id, starting, T.trip_id '
							+	' ) as T2 '
					+'Group by T2.shape_id,T2.stops,T2.route_id,T2.service_id;'

		dbhelp = new dbhelper(temp,[{table:schema,table2:schema,table3:schema}]);
		dbhelp.setMapping(['table','table2','table3']);
		client.query(dbhelp.getQuery(),[],function(err,data){
			if(err){
				return console.error('error running query',err);
			}
			var newquery = handleResponse(data);
			client.query(newquery,[],function(err,data){
				done();
				if(err){
					return console.error('error running query',err);
				}else
					return console.log(data);
			})
		} );
	});


}
frequencybuilder('gtfs_20141014_13_1_edited');

module.exports= frequencybuilder;
