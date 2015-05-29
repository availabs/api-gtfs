
var newRGraph = (function(){
			var Graph = function(){
					this.numEdges  = 0;   //private variable for the number of edges
					this.adjacencyLists = {};
				};
		
				var AdjacencyList = function(){
					this.list = new LinkedList();
				};
		
				AdjacencyList.prototype.add = function(obj){
					if(!this.list.exists(obj))
						this.list.add(obj);
				}
				AdjacencyList.prototype.remove = function(obj){
					this.list.remove(obj);
				}
				AdjacencyList.prototype.print = function(){
					this.list.print();
				}
		
				var Vertex = function(val){
					this.vertex = val; 		
				}
		
				Graph.prototype.addEdge = function(vertex1,vertex2){  //This function will add an edge to the graph given its endpoints
					if(vertex1 !== vertex2){
						this.adjacencyLists[vertex1] = this.adjacencyLists[vertex1] || new AdjacencyList();
						this.adjacencyLists[vertex2] = this.adjacencyLists[vertex2] || new AdjacencyList();
		
						this.adjacencyLists[vertex1].add(vertex2);
						this.adjacencyLists[vertex2].add(vertex1);
						this.numEdges += 1;
					}
					return this;
				}
		
				Graph.prototype.getVerticies = function(){
					return Object.keys(this.adjacencyLists);
				};
		
				Graph.prototype.toString = function(){
					var adjString = '';
					var current = null;
					var verticies = this.getVerticies();
					console.log(verticies.length + " verticies, " + this.numEdges + " edges");
					for(var i =0; i< verticies.length; i++){
						adjString = verticies[i] + ":";
						current = this.adjacencyLists[verticies[i]].list.listHead;
						while(current){
							adjString += " " + current.data;
							current = current.next;
						}
						console.log(adjString);
						adjString = '';
					}
					return this;
				};
		
				Graph.prototype.clearAdjacencies = function(vertex){
					var adjList = this.getAdjacencies[vertex] || null;
					if(adjList !== null){
						this.adjacencyLists[vertex] = new LinkedList();
					}
				}
		
				Graph.prototype.bridgeVerticies = function(v1,bridge,v2){
					var v1AdjList = this.adjacencyLists[v1].list || null;
					var v2AdjList = this.adjacencyLists[v2].list || null;
					this.adjacencyLists[bridge] = this.adjacencyLists[bridge] || (new LinkedList());
					var bridgeAdjList = this.adjacencyLists[bridge];
		
		
					if(v1AdjList !== null && v2AdjList !== null){
						v1AdjList.swap(v2,bridge);
						v2AdjList.swap(v1,bridge);
						if(!bridgeAdjList.list.exists(v1))
							this.adjacencyLists[bridge].list.add(v1);
						if(!bridgeAdjList.list.exists(v2))
		
							this.adjacencyLists[bridge].list.add(v2);
							
					}else{
						console.log("Error, unexpected vertex");
					}
				}
		
				Graph.prototype.getAdjacencies = function(vertex){
		
					var adjList = this.adjacencyLists[vertex] || (new AdjacencyList());
					var array = [];
					var tracer = adjList.list.listHead;
					while(tracer != null){  //while tracer isn't null
						array.push(tracer.data);
						tracer = tracer.next;
					}
					return array;
				}
		
		
				function dfs(Graph,start,end){
					var stack = new Stack();
					stack.push(start);
					var seenList = [];
					seenList.push(start);
					var parents = {};
					if(start === end){
						return [];
					}
					while(stack !== []){
						current = stack.pop();  //get the top of the stack
						if(current === end){	//if we found our point 
							var pathStack = [end];
							var child = end,parent = parents[child];
							pathStack.unshift(parent);	
							while(parent !== start){	//recreate path traversed with backwards parent map
							 	child = parent;
								parent = parents[child] || null;
								pathStack.unshift(parent);
							}
							return pathStack;		//return the stack
						}
						//if not get the adjacencies of current node
						var adjacencies = Graph.getAdjacencies(current); //get the Adjacencies of the current node
						seenList.push(current);  //mark it as seen
						for(var i=0; i< adjacencies.length; i++){  //for every node adjacent push it on the stack if unseen
							if(seenList.indexOf(adjacencies[i]) < 0){
								seenList.push(adjacencies[i]);
								stack.push(adjacencies[i]);
								parents[adjacencies[i]] = current;
							}
						}
					}
				}
		
				function bfs(Graph,source,target){
					var queue = [];      //initialize a queue
					var set = [];   //initialize the list of seen verticies
					var parents = {}
					queue.push(source);  // push it on the queue 
					set.push(source);  //push it on the of verticies that we are aware of
		
					while( queue.length != 0 ){  //while the queue is not empty
						var t = queue.splice(0,1)[0];   //get the first element in the queue
						if(t === target){				//if the  current vertex is the one we are looking for stop
							var pathStack = [target];
							var child = target, parent = parents[child];
							pathStack.unshift(parent);
							while(parent !== source){
								child = parent;
								parent = parents[child];
								pathStack.unshift(parent);
							}
							return pathStack;
						}
						var adjacencies = Graph.getAdjacencies(t);   // if not get the vertexes adjacent to this node
						adjacencies.forEach(function(vert){          // for each of them
							if(set.indexOf(vert) < 0){			 	 // if we are aware of them, ignore as they are already set to be evaluated 
								queue.push(vert);					 // if not, add them to the queue
								set.push(vert);						 // the set
								parents[vert] = t;					 // and the mapping of parent nodes for reconstruction
							}
						});
					}
					debugger;
					console.log("No Match Found",'source:',source,'target:',target);
					return [];
				}
		
			var Stack = function(){
				this.stack = [];
			}
			Stack.prototype={
				length:function(){return this.stack.length;},
				push:  function(obj){this.stack.push(obj);},
				pop:   function(){
							var ret = this.stack[this.length()-1];
							this.stack = this.stack.slice(0,this.length()-1);
				 			return ret;
				 			},
				toList: 	function(){ return this.stack;}
			}
		
		
		
			var LinkedList = function(){
				this.length =0;
				this.listHead = null;
			};
		
			LinkedList.prototype.add = function(obj){
		
				var node = {
					data:obj,
					next:null
				};
				var current = this.listHead;
				if(this.listHead === null)
					this.listHead = node;
				else{
					while(current.next != null){ //loop till next node is empty
						current = current.next;
					}
					//once it is empty set that link to the node;
					current.next = node;
				}
				//increment the length of the list
				this.length += 1;
				return this;
			};
		
			LinkedList.prototype.remove = function(obj){
				var current = this.listHead;
				if(current.data === obj){ 					//if it matches the first object just set it to the rest of the list
					this.listHead = current.next;
					this.length -= 1; 
					return this
					;
				}else{
					while(current && current.next.data !== obj){ //loop through the list until we fall off or find a match
						current = current.next;
					}
					if(current.next.data === obj){  		// if we found a match then just skip over it to the next link
						current.next = current.next.next;
					}
				}
				if(current){  								//if we didn't fall off the list we decrement the length of the list
					this.length -= 1;
				}
				return this;
			};
		
			LinkedList.prototype.print = function(){
				var tracer = this.listHead; //start at the beginning
				while(tracer){				//while tracer isn't null continue
					console.log(tracer.data);
					tracer = tracer.next;
				}
			}
		
			LinkedList.prototype.exists = function(obj){
				var tracer = this.listHead;
				while(tracer){
					if(tracer.data === obj)
						return true;
					tracer = tracer.next;
				}
				return false;
			}
		
			LinkedList.prototype.swap = function(el, newEl){
				var tracer = this.listHead;
				while(tracer){
					if(tracer.data === el){
						tracer.data = newEl;
					}
					tracer = tracer.next;
				}
		
			}
		
			var newRGraph = function(){
					var RouteGraphs = {
						numRoutes:0,
						Routes:{},
						addRoute:function(route_id){
							if(!this.Routes[route_id]){
								this.Routes[route_id] = new Graph();
								this.numRoutes++;
							}
						},
						printRouteGraph:function(route_id){
							if(this.Routes[route_id])
								this.Routes[route_id].toString();
							else
								console.log("Graph does not exist");
						},
						getRouteNodes:function(route_id){ // useful for debugging
							if(this.Routes[route_id])
								return this.Routes[route_id].getVerticies();
							else
								console.log("Graph does not exist");

						},
						addEdgeToRoute:function(route_id,v1,v2){
							this.addRoute(route_id);
							this.Routes[route_id].addEdge(v1,v2);
							return this;
						},
						getShortestPath:function(route_id,source,target){
							var shortestPath;
							if(!this.Routes[route_id]){
								return [];
							}
							else{
								shortestPath = bfs(this.Routes[route_id],source,target);
							}
							return shortestPath;
						}	
					};
					return RouteGraphs;
				}
				return newRGraph;
})();
if(typeof module !== 'undefined')
	module.exports ={'newRGraph':newRGraph};
