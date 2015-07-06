var Route = function(id){
	this.id = id;
	this.trips = [];
	this.ids = [];
}
Route.prototype.getTrip = function(id){
	var ix = this.ids.indexOf(id);
	if(ix >= 0)
		return this.trips[ix];
}
Route.prototype.addTrip = function(trip){
	this.trips.push(trip);
	this.ids.push(trip.id);
}
Route.prototype.getId = function(){
	return this.id;
}
Route.prototype.addTrips = function(){
	return this.trips;
}
var Routes = function(){
	this.routes = [];
	this.ids 	= [];
}
Routes.prototype.addRoute = function(route){
	this.routes.push(route);
	this.ids.push(route.getId());
}
Routes.prototype.getRoute = function(id){
	var ix = this.ids.indexOf(id);
	if(ix >= 0)
		return this.routes[ix];
}
Routes.prototype.getIds = function(){
	return this.ids;
}
Routes.prototype.cloneIds = function(){
	return this.ids.map(function(d){return d;});
}
Routes.prototype.containsRoute = function(id){
	return this.ids.indexOf(id) >= 0;
}
module.exports={Route:Route,Routes:Routes};