//DBMod.js
var topojson = require('topojson');
function preserveProperties(feature) {
  return feature.properties;
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
		}
	
}

module.exports=DBMod;