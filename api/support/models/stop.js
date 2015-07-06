var Stop = function(stop){
	if(stop)
		this.stop = stop;
	else
		this.stop = {type:'Feature',properties:{},geometry:{type:'Point',coordinates:[]}}
};
Stop.prototype.getProperty = function(pname){
	return this.stop.properties[pname];
}
Stop.prototype.getPoint = function(){
	return this.stop.geometry.coordinates;
}
Stop.prototype.getLon = function(){
	return this.stop.geometry.coordinates[0];
}
Stop.prototype.getLat = function(){
	return this.stop.geometry.coordinates[1];
}
Stop.prototype.getId = function(){
	return this.stop.properties.stop_id;
}
Stop.prototype.getName = function(){
	return this.stop.properties.stop_name;
}
Stop.prototype.getGeoFeat = function(){
	return this.stop.geometry;
}
Stop.prototype.getRoutes = function(){
	return this.stop.properties.routes;
}
Stop.prototype.getTrips = function(){
	return this.stop.properties.groups;
}
Stop.prototype.getFeature = function(){
	return this.stop;
}
Stop.prototype.setPoint = function(lonlat){
	this.stop.geometry.coordinates = lonlat;
}
Stop.prototype.setLon = function(lon){
	this.stop.geometry.coordinates[0] = lon;
}
Stop.prototype.setLat = function(lat){
	this.stop.geometry.coordinates[1] = lat;
}
Stop.prototype.setId = function(id){
	this.stop.properties.stop_id = id; 
}
Stop.prototype.setName = function(name){
	this.stop.properties.stop_name = id;
}
Stop.prototype.setRoutes = function(routes){
	this.stop.properties.routes = routes;
}
Stop.prototype.setTrips = function(groups){
	this.stop.properties.groups = groups;
}
Stop.prototype.addRoute = function(route){
	if(!this.stop.properties.routes)
		this.stop.properties.routes = [];
	this.stop.properties.routes.push(route);
}
Stop.prototype.addTrip = function(group){
	if(!this.stop.properties.groups)
		this.stop.properties.groups = [];
	this.stop.properties.groups.push(group);
}
Stop.prototype.delRoute = function(route){
	var routes = this.stop.properties.routes,ix = routes.indexOf(route);
	if(ix>0)
		routes.splice(ix,1);
}
Stop.prototype.delTrip = function(group){
	var groups = this.stop.properties.groups, ix = groups.indexOf(group);
	if(ix>0)
		groups.splice(ix,1);
}
Stop.prototype.hasNoGroups = function(){
	var list = this.stop.properties.groups;
	return !list || list.length === 0;
}
Stop.prototype.inGroup = function(gid){
	return this.stop.properties.groups.indexOf(gid) >= 0;
}
Stop.prototype.inRoute = function(rid){
	return this.stop.properties.routes.indexOf(rid) >= 0;
}
Stop.prototype.setEdited = function(){
	this.stop.edited = true;
}
Stop.prototype.setNormal = function(){
	this.stop.edited = false;
}
Stop.prototype.isEdited = function(){
	return this.stop.edited === true;
}
Stop.prototype.setRemoval = function(){
	return this.stop.properties.removed = true;
}
Stop.prototype.wasRemoved = function(){
	return this.stop.properties.removed;
}
Stop.prototype.isNew = function(){
	return this.stop.isNew;
}
Stop.prototype.isDeleted = function(){
	return this.stop.deleted;
}
Stop.prototype.setNew = function(tf){
	this.stop.isNew = tf;
}
Stop.prototype.setDeleted = function(tf){
	this.stop.deleted = tf;
}
Stop.prototype.setSequence = function(id){
	this.stop.sequence = id;
}
Stop.prototype.getSequence = function(){
	return this.stop.sequence;
}

module.exports = Stop;