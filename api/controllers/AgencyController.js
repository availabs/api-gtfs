var topojson = require("topojson");
var Stop     = require('../support/models/stop');
var assetCache = require("../support/assetCache.js");
var db = require('../support/dbmod.js');
/**
 * AgencyController
 *
 * @module		:: Controller
 * @description	:: Contains logic for handling requests.
 */
	// var preserveProperties = function(properties, key, value) {
	// 	properties[key] = value;
	// 	return true;
	// };
function preserveProperties(feature) {
  return feature.properties;
}


module.exports = { 

  /* e.g.
  sayHello: function (req, res) {
    res.send('hello world!');
  }
  */
	routes: function(req,res){


	 	Agency.findOne(req.param('id')).exec(function (err, agency) {
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
		  		if(req.param('format') == 'geo'){
		  			//JSON.stringify();
		  			res.send(routesCollection);	
		  		}else{
		  			var topology = topojson.topology({routes: routesCollection},{"property-transform":preserveProperties});
		  			 var newJson = {type:'FeatureCollection',features:[],bbox:topology.bbox,transform:topology.transform}
		  			 topology.objects.routes.geometries.forEach(function(d){
		  			 	var routeSwap = {type:"GeometryCollection",geometries:[d]};
		  			 	var mesh = topojson.mesh(topology, routeSwap,function(a,b){return true;});
		  				var feature = {type:'Feature',properties:d.properties, geometry:{type:mesh.type, coordinates:mesh.coordinates}};
		  			 	newJson.features.push(feature);
		  			 })
					// res.send(topology);
		  			res.send(newJson);
		  			//JSON.stringify()
		  			
		  		}
		  		
		  	});
	  	});
	},
	routeSchedule: function(req,res){
		if(typeof req.param('id') == 'undefined'){
			res.send('{status:"error",message:"Missing parameter: id. (Agency)"}',500);		
		}
		if(typeof req.param('day') == 'undefined'){
			res.send('{status:"error",message:"Missing parameter: day."}',500);
		}
		if(typeof req.param('routeId') == 'undefined'){
			res.send('{status:"error",message:"Missing parameter: routeId."}',500);
		}



		var assetDir = 'routeSchedule/'+req.param('id')+'/'+req.param('day');
			var assetFile = '/'+req.param('routeId') + '.json';
			assetCache.checkCache(assetDir,assetFile,function(data){
				if(data){
					res.json(data)
				}else{
				 	Agency.findOne(req.param('id')).exec(function (err, agency) {

					  	var routesCollection = {};
					  	routesCollection.type = "FeatureCollection";
					  	routesCollection.features = [];
					  	var sql = "SELECT a.trip_id,a.arrival_time, a.departure_time ,b.shape_id, a.stop_id,a.stop_sequence,b.direction_id "
									+ "from \""+agency.current_datafile+"\".stop_times as a "
									+ "join \""+agency.current_datafile+"\".trips as b "
									+ "on b.trip_id = a.trip_id "
									+ "join \""+agency.current_datafile+"\".calendar as c "
									+ "on c.service_id = b.service_id "
									+ "where route_id = '"+req.param('routeId')+"' "
									+ "and c."+req.param('day')+" "
									+ "order by trip_id,stop_sequence";
						Route.query(sql,{},function(err,data){
					  		if (err) {
					       		res.send('{status:"error",message:"'+err+'"}',500);
					       	return console.log(err);
					      }
					      	assetCache.addData(assetDir,assetFile,data.rows)
					      	return res.json(data.rows);
					  	});
				  	});
	 		}
	 	});
	},

	stops: function(req,res){
		
			  Agency.findOne(req.param('id')).exec(function (err, agency) {
			  	var where = '';
			  	if(typeof req.param('routeId') !== 'undefined'){
			  		where = "WHERE T1.route_id = '"+req.param('routeId')+"'";
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
							+" GROUP BY  T3.stop_id"
				

			  	Route.query(sql,{},function(err,data){
			  		if (err) {
			       res.send('{status:"error",message:"'+err+'"}',500);
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
			  		if(req.param('format') == 'geo'){
				  			//JSON.stringify();
				  			res.json(stopsCollection);	
				  		}else{
				  			var topology = topojson.topology({stops: stopsCollection},{"property-transform":preserveProperties});
			  				res.json(topology);
			  				if(req.pleaseCache)
				  				assetCache.addData(assetDir,assetFile,topology); 			
				  		}
			  	});
			  });
	},
	routeData:function(req,res){
		
		var fetchmod = require('../support/fetchandclean.js');
		var routeid;
		//First get the routes of the particular system
		if(typeof req.param('id') == 'undefined'){
			res.send('{status:"error",message:"Missing parameter: id. (Agency)"}',500);		
		}
		if(typeof req.param('routeId') !== 'undefined'){
			routeid = req.param('routeId');
		}
		if(typeof req.param('day') == 'undefined'){
			res.send('{status:"error",message:"Missing parameter: day."}',500);
		}
		else{
			console.log("fetching route data");
			var route = {	agency_id: req.param('id'), 
						 	day: req.param('day').toUpperCase(),
						 	route_id: req.param('routeId'),
						 	format: req.param('format') };
			var assetDir = 'routeData/'+route.agency_id;
			var assetFile = '/'+route.day + '.json';
			assetCache.checkCache(assetDir,assetFile,function(data){
				if(data){
					sendRouteData(res,routeid,data);
					
				}else{
					fetchmod.fetch(route,function(results){
						sendRouteData(res,routeid,results);
                        	assetCache.addData(assetDir,assetFile,results);
					});		
				}
			})
			
		}
		
	},
	segmentData: function(req,res){
		var pather = require('../support/pather.js'), wantsRoute=false,route='',id='';
		var fetchmod = require('../support/fetchandclean.js');

		if(typeof req.param('id') === 'undefined'){
			res.send('{status:"error",message:"Missing parameter: id. (Agency)"}');
		}
		if(typeof req.param('routeId') !== 'undefined'){
			wantsRoute=true;
			route = req.param('routeId');
		}
		id = req.param('id');
		var assetDir = 'segmentData/'
		var assetFile= req.param('id');
		assetCache.checkCache(assetDir,assetFile,function(data){
			if(data && wantsRoute){
				res.json(data[route]);
			}
			else if(data){
				res.json(data);
			}
			else{
				var struct = {'id':id,'route':route};
				fetchmod.fetchSegs(struct,function(data,err){
					if(err) console.log(err);
					res.json(data);
					assetCache.addData(assetDir,assetFile,data);
				})
			}
		})
	},
	createCachedObject: function(req,res){
		var rtype = req.param('requestType');
		if(typeof rtype == 'undefined'){
			res.send('{status:"error",message:"Missing parameter: requestType"}',500);
		}
		if(rtype == 'routeData'){
			req.pleaseCache = true;
			routeData(req,res);
		}else{
			res.json("Type Not Supported")
		}

	},
	simpleScheduleData: function(req,res){
		if(typeof req.param('id') == 'undefined'){
			res.send('{status:"error",message:"Missing parameter: id. (Agency)"}',500);		
		}
		if(typeof req.param('day') == 'undefined'){
			res.send('{status:"error",message:"Missing parameter: day."}',500);
		}

		db.getSimpleSchedule(req.param('id'),req.param('day'),function(err,data){
			if(err){
				console.log(err);
				res.send('{status:"error",message:"'+err+'"}',500);
				return
			}
			res.json(data.rows);
		})
	},

	uploadStops: function(req,res){
		var reqobj = req.body;
		var agency = reqobj.id;
		var featList = reqobj.data
		.map(function(d){
				return new Stop(d.stop);
			});
		console.log(featList);
		debugger;
		var trips = reqobj.trip_ids;
		var deltas = reqobj.deltas;
		var responses = 0;
		var errlist=[],datalist=[];
		var trip = reqobj.trip, route_id = trip.route_id;
		var shape = reqobj.shape;
		if(typeof agency === 'undefined'){
			res.send('{status:"error",message:"Missing parameter:id. (Agency)"}',500)
		}
		if(typeof featList === 'undefined'){
			res.send('{status:"error",message:"Missing parameter:geometry"}', 500);
		}
				
		db.putData(agency,featList,trips,deltas,route_id,shape,trip,function(err,data){
			if(err){
				res.send('{status:"error",message:'+JSON.stringify(errlist)+'}', 500)
			}
			else{
				console.log("HERE");
				res.json(datalist);
			}	
		});			
	},
	getStop:function(req,res){ ///////////DEBUGGING//////////////
		var agency = req.param('id')
		var stop = req.param('stopId')
		if(typeof agency === 'undefined'){
			res.send('{status:"error",message:"Missing parameter:id. (Agency)"}', 500);
		}
		if(typeof stop === 'undefined'){
			res.send('{status:"error",message:"Missing parameter:id. (stop)"}', 500);
		}
		db.getStop(agency,stop,function(err,data){
			res.json(data);
		});
	},

	uploadRoute: function(req,res){
		var agency = req.param('id');
		var route = req.param('routeId')
		if(typeof agency === 'undefined'){
			res.send('{status:"error",message:"Missing parameter:id. (Agency)"}', 500);
		}
		if(typeof stop === 'undefined'){
			res.send('{status:"error",message:"Missing parameter:id. (stop)"}', 500);
		}
		db.putRoute(agency,route,geomobj,function(err,data){

		});
	},

	backup: function(req,res){
		var secret = req.param('secret');
		if(typeof secret === 'undefined' || secret !== 'TheSuperSecretPassword'){
			res.send('{status:"error",message:"Incorrect Secret"}',500);
		}
		db.backup(function(err,data){
			res.json(data);
		});
	}
};

var sendRouteData = function(res,route,data){
	debugger;
	if(route){
		res.json(data.intervalObj['route_'+route]);
	}else{
		res.json(data);
	}
}	
