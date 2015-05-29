var swap = function(point){
	return [point[1],point[0]];
}
var shapefetcher  = (function(){
	if(!d3){
		throw new Error({message:'This Requies D3'})
	}

	var hereApi = (function(){
		var here = {};
		here.app_id = '&app_id=Bz4ZlbpcifSacIK9v2mq', here.app_code = '&app_code=laXkT6pG_eHHQckETu5AEg'
		here.baseUrl = 'http://route.cit.api.here.com/routing/7.2/calculateroute.json?'
		here.mode = '&mode=fastest;car'
		here.addwaypoint1 = function(point){
			this.p1 = swap(point);
		}
		here.addwaypoint2 = function(point){
			this.p2 = swap(point);
		}
		here.addwaypoints = function(p1,p2){
			this.addwaypoint1(p1);
			this.addwaypoint2(p2);
		}
		here.getWayPoint0 = function(){
			return '&waypoint0=geo!' + this.p1[0]+','+this.p1[1];
		}
		here.getWayPoint1 = function(){
			return '&waypoint1=geo!' + this.p2[0]+','+this.p2[1];
		}
		here.getUrl = function(){
			return this.baseUrl + this.app_id + this.app_code + this.getWayPoint0()+this.getWayPoint1() + this.mode;
		}

		here.parser = {
			handleResponse: function(resp){
				//assume that we will take the first route in the response
				//then for each leg of the route
				var coorpath = [];
				var dataofinterest = resp.response.route[0].leg.forEach(function(l){
					l.maneuver.forEach(function(man){
						coorpath.push([man.position.longitude,man.position.latitude]);
					})
				})
				return coorpath; 
			},
		};
		return here;	
	})();

	var osrmApi = (function(){
		var osrm = {};
		// Taken from 
		// https://github.com/mapzen/routing/blob/gh-pages/js/leaflet_rm/L.Routing.OSRM.js
		// Adapted from
		// https://github.com/DennisSchiefer/Project-OSRM-Web/blob/develop/WebContent/routing/OSRM.RoutingGeometry.js
			var decode = function(encoded, precision) {
			var len = encoded.length,
			    index=0,
			    lat=0,
			    lng = 0,
			    array = [];

			precision = Math.pow(10, -precision);

			while (index < len) {
				var b,
				    shift = 0,
				    result = 0;
				do {
					b = encoded.charCodeAt(index++) - 63;
					result |= (b & 0x1f) << shift;
					shift += 5;
				} while (b >= 0x20);
				var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
				lat += dlat;
				shift = 0;
				result = 0;
				do {
					b = encoded.charCodeAt(index++) - 63;
					result |= (b & 0x1f) << shift;
					shift += 5;
				} while (b >= 0x20);
				var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
				lng += dlng;
				//array.push( {lat: lat * precision, lng: lng * precision} );
				array.push( [lat * precision, lng * precision] );
			}
			return array;
		}
		osrm.baseUrl = 'https://osrm.mapzen.com/psv/viaroute?'
		osrm.addwaypoints = function(p1,p2){
			this.locs = '&loc='+p1[1]+'%2C'+p1[0];
			this.locs += '&loc='+p2[1]+'%2C'+p2[0];
		}
		osrm.getUrl = function(){
			return this.baseUrl+this.locs;
		}
		osrm.parser={
				handleResponse: function(resp){
				if(resp.status_message !== "Found route between points"){
					console.log("Error",resp.status_message)
					return;
				}
				var array = decode(resp.route_geometry,6);
				return array.map(swap);

			},
		}
		return osrm;
	})();
	var googApi = (function(){
		if(typeof google === 'undefined'){
			console.log('missing google maps library');
			return undefined;
		}
		var goog = {};
		var id = function(x){return x};
		goog.addorigin = function(p){
			this.origin = new google.maps.LatLng(p[1],p[0]);
		}
		goog.adddestination = function(p){
			this.destination = new google.maps.LatLng(p[1],p[0]);
		}
		goog.addwaypoints = function(p1,p2){
			this.addorigin(p1);
			this.adddestination(p2);
		}
		goog.directionsService = new google.maps.DirectionsService();
		goog.parser= {
				handleResponse: function(resp){
					var pullf = function(lf){return [lf.lng(),lf.lat()]}
					if(resp){
						var path = resp.routes[0].overview_path;
						return path.map(pullf);	
					}else
						return null;
					
				},
		};
		goog.calcRoute = function(cb,route){
			var request = {
				origin:this.origin,
				destination:this.destination,
				travelMode: google.maps.TravelMode.DRIVING
			};
			this.directionsService.route(request,function(response,status){
				if(status = google.maps.DirectionsStatus.OK){
					console.log(response);
					response = goog.parser.handleResponse(response);
					cb(response,route);
				}

			});
		}
		
		return goog;
	})();
	var fetch = function(start,stop,callback,route){

		// googApi.addwaypoints(start,stop);
		// googApi.calcRoute(callback,route);
		hereApi.addwaypoints(start,stop);
		d3.json(hereApi.getUrl(),function(err,data){
			if(err) console.log(err);
			var shapes = hereApi.parser.handleResponse(data);
			callback(shapes)
		});

	}

	return {
		fetch:fetch,
	}
})();

if(typeof module !== 'undefined'){
	module.exports=shapefetcher;
}


//OSRM WAY
	// 	var baseUrl = 'https://osrm.mapzen.com/'+type+'/viaroute?'
	// 					//latitiude   //longitude
	// 	var loc1 = 'loc='+start[1]+'%2C'+start[0];
	// 	var loc2 = 'loc='+ stop[1]+'%2C'+ stop[0];

	// 	var route_url = baseUrl + loc1 + '&' + loc2
	// 	var precision = getMaxPrecision(start.concat(stop));
	

	// var getPrecision = function(val){
	// 	var strval = val.toString();
	// 	if(strval.indexOf('.') < 0)
	// 		return 0
	// 	else
	// 		return strval.split('.')[1].length -1
	// }
	// var getMaxPrecision = function(valList){
	// 	val = Math.max.apply(Math,valList.map(getPrecision))
	// 	return 6
	// }
