//DBMod.js
var topojson = require('topojson');
var dbbackup = require('./dbbackup');
var dbhelper = require('./batchmod.js');
var Feature = require('./feature.js');
function preserveProperties(feature) {
  return feature.properties;
}
function puts(err,stdout,stderr){
	sys.puts(stdout);
	sys.puts(stderr);
}
function updateStopTimes(datafile,trips,deltas){
	var map = ['trips','deltas','file'],template = 'Select update_st_times(?,?,\'?\')';
	var sqlTimeUpdate = new dbhelper(template,{
												trips:formatStringList(trips),
												deltas:formatNumList(deltas),
												file:datafile
											});
	sqlTimeUpdate.setMapping(map);
	return sqlTimeUpdate.getQuery();
}
function getField(field,feat){
	if(field === 'trips'){
		return formatStringList(feat.get(field));
	}else if(field === 'geo'){
		return JSON.stringify(feat.get(field));
	}else{
		return feat.get(field);
	}
}

function formatNumList(nums){
	return'Array['+nums.toString()+']';
}

function formatStringList(strings){
	var outString =''; 
		var temp = strings[0];
		var templist= strings.filter(function(e,i,a){return i!==0;})
		outString = templist.reduce(function(pr,cur,i,arr){
			return pr + ',\'' + cur+'\'';
		}, ['\''+temp+'\''])		
	return 'Array[' + outString + ']';
}

function buildFeatureQuery(temp1,m1,f){
	var data1={};
	m1.forEach(function(field){
		data1[field] = getField(field,f);
	})
	dbhelp = new dbhelper(temp1,data1);
	dbhelp.setMapping(m1);
	return dbhelp.getQuery();
}

var DBMod = {
		getStops: function(agencyId,callback,route_id,format){
				Agency.findOne(agencyId).exec(function (err, agency) {
				  	var where = '';
				  	if(typeof route_id !== 'undefined'){
				  		where = "WHERE T1.route_id = '"+route_id+"'";
				  	}
				  	var stopsCollection = {};
				  	stopsCollection.type = "FeatureCollection";
				  	stopsCollection.features = [];
				  	//var sql = 'select ST_AsGeoJSON(geom) as stop_shape,stop_name,stop_id,stop_code from "'+agency.current_datafile+'".stops'
				  	var sql = "SELECT ST_AsGeoJSON(T3.geom) as stop_shape, T3.stop_name, T3.stop_id, T3.stop_code, array_agg(distinct T1.route_id) as routes "
							+"FROM \""+agency.current_datafile+"\".trips AS T1 "
							+ " JOIN "
							+ "\""+agency.current_datafile+"\".stop_times AS T2 "
							+"ON T1.trip_id=T2.trip_id "
							+"JOIN \""+agency.current_datafile+"\".stops AS T3 "
							+"ON T2.stop_id=T3.stop_id "
							+ where
							+" GROUP BY  T3.stop_id"
					

				  	Route.query(sql,{},function(err,data){
				  		if (err) {
				       callback('{status:"error",message:"'+err+'"}',500);
				       return console.log(err);
				      }
				      data.rows.forEach(function(stop,index){
				  			var stopFeature = {};
				  			stopFeature.type="Feature";
				  			stopFeature.id = index;
				  			stopFeature.geometry = JSON.parse(stop.stop_shape);
				  			stopFeature.properties = {};
				  			stopFeature.properties.stop_id = stop.stop_id;
				  			stopFeature.properties.routes = stop.routes;
				  			stopFeature.properties.stop_code = stop.stop_code;
				  			stopFeature.properties.stop_name= stop.stop_name;
				  			stopsCollection.features.push(stopFeature);
				  			
				  		});
				  		
				  		//res.json(routesCollection);
				  		if(format == 'geo'){
					  			//JSON.stringify();
					  			callback(stopsCollection);	
					  		}else{
					  			var topology = topojson.topology({stops: stopsCollection},{"property-transform":preserveProperties});
				  				callback(topology);
					  			//JSON.stringify()  			
					  		}
				  	});
				  });
		},

		getRouteSchedule: function(agencyID,day,route_id,cb){
			Agency.findOne(agencyID).exec(function (err, agency) {

				  	var routesCollection = {};
				  	routesCollection.type = "FeatureCollection";
				  	routesCollection.features = [];
				  	var sql = "SELECT a.trip_id,a.arrival_time, a.departure_time ,b.shape_id, a.stop_id,a.stop_sequence,b.direction_id "
								+ "from \""+agency.current_datafile+"\".stop_times as a "
								+ "join \""+agency.current_datafile+"\".trips as b "
								+ "on b.trip_id = a.trip_id "
								+ "join \""+agency.current_datafile+"\".calendar as c "
								+ "on c.service_id = b.service_id "
								+ "where route_id = '"+route_id+"' "
								+ "and c."+day+" "
								+ "order by trip_id,stop_sequence";
					Route.query(sql,{},function(err,data){
				  		if (err) {
				       res.send('{status:"error",message:"'+err+'"}',500);
				       return console.log(err);
				      }
				      cb(route_id,data.rows);
				  	});
			  	});
		},

		getRoute: function(agencyId,cb,format){
			Agency.findOne(agencyId).exec(function (err, agency) {

				  	var routesCollection = {};
				  	routesCollection.type = "FeatureCollection";
				  	routesCollection.features = [];
				  	var sql = 'select ST_AsGeoJSON(geom) as route_shape,route_id,route_short_name,route_long_name,route_color from "'+agency.current_datafile+'".routes'
				  	Route.query(sql,{},function(err,data){
				  		if (err) {
				       res.send('{status:"error",message:"'+err+'"}',500);
				       return console.log(err);
				      }
				      data.rows.forEach(function(route,index){
				  			var routeFeature = {};
				  			routeFeature.type="Feature";
				  			routeFeature.geometry = JSON.parse(route.route_shape);
				  			routeFeature.id = index;
				  			routeFeature.properties = {};
				  			routeFeature.properties.route_id = route.route_id;
				  			routeFeature.properties.route_short_name = route.route_short_name;
				  			routeFeature.properties.route_long_name = route.route_long_name;
				  			routeFeature.properties.route_color = route.route_color;
				  			routesCollection.features.push(routeFeature);
				  		});
				  		if( format == 'geo'){
				  			//JSON.stringify();
				  			callback(routesCollection);	
				  		}else{
				  			var topology = topojson.topology({routes: routesCollection},{"property-transform":preserveProperties});
				  			 var newJson = {type:'FeatureCollection',features:[],bbox:topology.bbox,transform:topology.transform}
				  			 topology.objects.routes.geometries.forEach(function(d){
				  			 	var routeSwap = {type:"GeometryCollection",geometries:[d]};
				  			 	var mesh = topojson.mesh(topology, routeSwap,function(a,b){return true;});
				  				var feature = {type:'Feature',properties:d.properties, geometry:{type:mesh.type, coordinates:mesh.coordinates}};
				  			 	newJson.features.push(feature);
				  			 })

				  			cb(newJson);
				  			//JSON.stringify()
				  			
				  		}
				  		
				  	});
			  	});
		},
		getSimpleSchedule: function(agencyID,day,cb){
			Agency.findOne(agencyID).exec(function (err, agency) {
				  	var routesCollection = {};
				  	var datafile = agency.current_datafile;
				  	routesCollection.type = "FeatureCollection";
				  	routesCollection.features = [];
				  	var sql = 'Select T2.stops, array_agg(T2.starting ORDER BY T2.starting)as starts,T2.route_id, array_agg(T2.ending ORDER BY T2.starting) as ends, array_agg(T2.trip_id ORDER BY T2.starting) as trips from ( '
							+'SELECT MIN(ST.departure_time)as starting,MAX(ST.arrival_time)as ending, '
				  			+'T.route_id, T.service_id, T.trip_id,T.direction_id, array_agg(ST.stop_id Order By ST.stop_sequence) as stops '
							+'FROM \"'+datafile+'\".trips as T '
							+'JOIN \"'+datafile+'\".stop_times as ST ' 
							+'ON T.trip_id = ST.trip_id '
							+'JOIN \"'+datafile+'\".calendar as C '
							+'ON T.service_id = C.service_id '
							+'Group By T.trip_id '
							+'Order By T.route_id, starting, T.trip_id '
							+') as T2 ' 
					+'Group By T2.stops,T2.route_id;'

					Route.query(sql,{},function(err,data){
				      	cb(err,data);
				  	});
			  	});
		},

		putShape:function(datafile,routeId,trips,geojson,dbhelper){
				debugger;
				//first delete the shape if it exists in the shape table x
				//update or insert the shape into the shapes table x
				//insert new trips into the trips table 
				//use the distinct shape id's associated with all trips involved  
				//to reforge the geometry of the associated route in the routes table
				var template1 = 'SELECT delete_and_update_shapes_with_trips(?,?,?,?,\'?\')', 
				map = ['trips','lats','lons','geoms','file'],sql = '';
				var lons=[],lats=[],dbhelper;
				var geoms = geojson.coordinates.map(function(pt){
					lats.push(pt[1]), lons.push(pt[0]);
					return JSON.stringify({type:"Point",coordinates:pt});
				})
				lons = formatNumList(lons);
				lats = formatNumList(lats);
				trips = formatStringList(trips);
				geoms = formatStringList(geoms);
				data = {trips:trips,lats:lats,lons:lons,geoms:geoms,file:datafile};
				dbhelp = new dbhelper(template1,data);
				dbhelp.setMapping(map);
				sql = dbhelp.getQuery();
				// console.log(sql);
				return sql;
		},

		addDelStops:function(datafile,featlist,trips,deltas,cb){
			if(featlist.length <=0) cb(undefined,{});
			
				debugger;
				var sql = '';
				var template1 = 'INSERT INTO "?".stops(geom,stop_lon,stop_lat,stop_id,stop_name)'
							  + 'VALUES (ST_SetSRID(ST_GeomFromGeoJSON(\'?\'),4326), ?, ?, \'?\',\'?\')',
					template2 = 'SELECT add_stop_to_stop_times(\'?\',?,?,\'?\')',

					template3 = 'SELECT del_stop_from_stop_times(?,?,\'?\')',
					template4 = 'DELETE FROM "?".stops WHERE stop_id=\'?\'';
					

				var map1 = ['file','geo','lon','lat','stop_id','stop_name']
				var map2 = ['stop_id','sequence','trips','file']
				var map3 = ['sequence','trips','file']
				var map4 = ['file','stop_id']
				
				featlist.forEach(function(feat){
					var temp1,temp2,m1,m2,data1={},data2={};
					feat.file = datafile;
					feat.trips = trips;
					var f = new Feature(feat);
					if(feat.isNew()){ //if it is a new feature add it to the database
						sql += buildFeatureQuery(template1,map1,f);
						sql += buildFeatureQuery(template2,map2,f);
					}
					else if(feat.isDeleted()){ //if it was marked for deletion from a tgroup
						sql += buildFeatureQuery(template3,map3,f);//delete from tgroup
						if(feat.wasRemoved){	//if it was marked for removal
							sql += buildFeatureQuery(template4,map4,f);//remove it from the database.
						}
					}
				});
				sql += updateStopTimes(datafile,trips,deltas);
				// console.log(sql);
				return sql;
		},



		putStops: function(datafile,featlist,trips,deltas){
			var updates,insertsDeletes,sql = '';
			debugger;
			updates = featlist.filter(function(feat){return !(feat.isNew() || feat.isDeleted());});
			insertsDeletes = featlist.filter(function(feat){return feat.isNew() || feat.isDeleted();});
			if(insertsDeletes.length > 0){
				sql += this.addDelStops(datafile,insertsDeletes,trips,deltas);
			}
			if(updates.length > 0){
				sql += this.updateStops(datafile,updates,trips,deltas);
			}
			return sql;
		},

		putTrip: function(datafile,trip){
			var template = 'INSERT INTO \"?\".trips(trip_id,service_id,route_id) VALUES '
						  +'(\'?\',\'?\',\'?\')', map =['file','trip_id','service_id','route_id'],sql ='';

			var data = {file:datafile,trip_id:trip.trip_ids,service_id:trip.service_id,route_id:trip.route_id};
			dbhelp = new dbhelper(template,data);
			dbhelp.setMapping(map);
			return dbhelp.getQuery();
		},

		putRoute: function(datafile,route_id){
			var sql = 'INSERT INTO \"'+datafile+'\".routes(route_id,route_type) Values (\''+route_id+'\',3);';
			return sql;
		},

		putData:function(agencyId,featlist,trips,deltas,route_id,shape,trip,cb){
			var db = this;
			Agency.findOne(agencyId).exec(function(err,agency){
				var sql = '', datafile=agency.current_datafile;
			

				console.log(trip.isNew);
				if(trip.isNew){
					sql += db.putRoute(datafile,route_id);
					sql += db.putTrip(datafile,trip)
				}
				//sql += db.putStops(datafile,featlist,trips,deltas);
				sql += db.putShape(datafile,route_id,trips,shape,dbhelper);
				sql = 'BEGIN ' + sql + ' COMMIT;'
				Route.query(sql,{},function(err, data){
					if(err){
						console.log(err);
						console.log(sql);
					}
					cb(err,data);
				});
			})
		},

		updateStops:function(datafile,featlist,trips,deltas,cb){
			if(featlist.length <= 0) cb(undefined,{})
				var template = 'UPDATE "?".stops '  //!!!!Dangerous code if failures but for now if one fails, the rest persist
													//and no one knows the difference!!!
							+ 'SET geom = ST_SetSRID(ST_GeomFromGeoJSON(\'?\'),4326), '
							+ 'stop_lon=?, stop_lat=?,stop_name=\'?\' WHERE stop_id=\'?\''
					
				var data={}, data2={}, sql='';
				var map  = ['file','geo','lon','lat','stop_name','stop_id'];
				featlist.forEach(function(feat){
					feat.file=datafile;
					feat.trips=trips;
					var f = new Feature(feat);
					sql += buildFeatureQuery(template,map,f);
				});
				sql += updateStopTimes(datafile,trips,deltas); //update the arrivals & departures of the necessary trips
																//based on the time deltas.
				// console.log(sql);
				return sql;
		},

		backup:function(cb){
			Agency.find().exec(function(err,agencies){
				var files = [];
				agencies.forEach(function(agency){
					var datafile = agency.current_datafile;
					if(datafile !== 'public'){
						files.push(datafile);
					}
					dbbackup(files);
				});
				cb(err,{data:'Things'})
			});
		},

		getStop:function(agencyId,stopId,cb){
			Agency.findOne(agencyId).exec(function(err,agency){
				var datafile = agency.current_datafile;
				var sql = 'SELECT ST_AsGeoJson(geom) as geo FROM \"'+datafile+'\".stops WHERE stop_id=\''+stopId.toString()+'\'';
				
				Route.query(sql,{},function(err,data){
					var stopinfo = {};
					if(err){
						console.log(err);
						cb(err,{});
					}
					else{
						
						data.rows.forEach(function(stop,index){
							stopinfo.geo = JSON.parse(stop.geo);
						})
						cb(err,stopinfo);	
					}
				})  
			})
		}
	
}

module.exports=DBMod;