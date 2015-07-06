var Trip = function(){
	this.id = '';
	this.stops = [];
	this.route_id = '';
	this.intervals = [];
	this.start_times = [];
	this.stop_times = [];
	this.trip_ids = [];
	this.service_id = '';
	this.isNew = false;
};
Trip.prototype.getId = function(){
	return this.id;
}
Trip.prototype.getServiceId = function(){
	return this.service_id;
}
Trip.prototype.getStops = function(){
	return this.stops;
}
Trip.prototype.getRouteId = function(){
	return this.route_id;
}
Trip.prototype.getIntervals = function(){
	return this.intervals;
}
Trip.prototype.getInterval = function(i){
	return this.intervals[i];
}
Trip.prototype.getStartTime = function(i){
	return this.start_times[i];
}
Trip.prototype.getStopTime = function(i){
	return this.stop_times[i];
}
Trip.prototype.getIds =function(){
	return this.trip_ids;
}
Trip.prototype.setIds = function(ids){
	this.trip_ids = ids;
}
Trip.prototype.setId = function(id){
	this.id = id;
	this.stops = JSON.parse(id);
}
Trip.prototype.setStops = function(stops){
	this.id = JSON.stringify(stops);
	this.stops = stops;
}
Trip.prototype.setRouteId = function(rid){
	this.route_id = rid;
}
Trip.prototype.setServiceId = function(id){
	this.service_id = id;
}
Trip.prototype.addStartTime = function(start){
	this.start_times.push(start);
}
Trip.prototype.addStopTime = function(stop){
	this.stop_times.push(stop);
}
Trip.prototype.addInterval = function(start,stop){
	this.addStartTime(start);
	this.addStopTime(stop);
	this.intervals.push([start,stop]);
}
Trip.prototype.setIntervals = function(ints){
	this.intervals = ints;
}
Trip.prototype.setStopTimes = function(stoptimes){
	this.stop_times = stoptimes;
}
Trip.prototype.setStartTimes = function(starttimes){
	this.start_times = starttimes;
}
Trip.prototype.hasStop = function(sid){
	return this.stops.indexOf(sid) >= 0;
}
Trip.prototype.addTripId = function(tid){
	this.trip_ids.push(tid);
}
Trip.prototype.addStop = function(sid,ix){
	this.stops.splice(ix,0,sid);
}
Trip.prototype.setNew = function(){
	this.isNew = true;
}
Trip.prototype.isNewTrip = function(){
	return this.isNew;
}

module.exports=Trip;