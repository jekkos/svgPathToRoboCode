/*console.log( ' ');
console.log ('\\\\\\\\\ START PARSING SVG '+ process.argv[2] +' //////////');
console.log( ' ');*/

if (process.argv.length < 4) {
	if (process.argv.length < 3) {
	  //console.log('Usage: node ' + process.argv[1] + ' FILENAME');
	  process.exit(1);
	}
}
Array.prototype.removeEmpty = function () {
	if (this[0] == ''){
		this.splice(0, 1);
	}
	return this;
}

Array.prototype.toFloat = function() {
  	for (i=0;i<this.length;i++) {
  		this[i]=parseFloat(this[i]);
  	}
  	return this;
};

Array.prototype.insert = function(index, item) {
	  this.splice(index, 0, item);
}

function generateGuid() {
  var result, i, j;
  result = '';
  for(j=0; j<32; j++) {
    if( j == 8 || j == 12|| j == 16|| j == 20) 
      result = result + '-';
    i = Math.floor(Math.random()*16).toString(16).toUpperCase();
    result = result + i;
  }
  return result;
}

var fs = require('fs'),
	Bezier = require('./bezier.js'),
	PointsOnCurve = require('./pointsOnCurve.js'),
	CartesianToScara = require('./cartesianToScara.js'),
	filename = process.argv[2], 
	conversionType = process.argv[3],
	output = process.argv[4], 
	XmlStream = require('xml-stream'), 
	stream = fs.createReadStream(filename,{encoding: "utf8"}), 
	xml =new XmlStream(stream), 
	paths = new Array(), 
	allPaths = new Array(), 
	svgData,
	svgObject = {g:{},data:{}},
	guid,
	totalLength = 0,
	resolution = 3,
	transform =  new Array(),
	processing = "void setup() {\r\nsize(400, 400);\r\nnoLoop();\r\n}\r\n \r\n void position(x,y,l) {\r\n if(l == 0) {\r\nstroke(#FFCC00);\r\n} else {\r\nstroke(#00CCFF);\r\n}\r\n ellipse(x,y,1,1)}\r\n void draw() {\r\n background(255);\r\nnoFill()\;\r\n";




xml.collect('path');

xml.on('endElement: path', function(item) {
	if(item.$.transform){
		var regExp = /\(([^)]+)\)/;
		var transform = regExp.exec(item.$.transform)[1].split(' ')
		console.log("transform: "+ transform);
		console.log("g transform: "+ svgObject.g[guid].transform);
		svgObject.g[guid].transform[0] = parseFloat(svgObject.g[guid].transform[0]) + parseFloat(transform[0]);
		svgObject.g[guid].transform[1] = parseFloat(svgObject.g[guid].transform[1]) + parseFloat(transform[1]);
		console.log("new transform: "+ svgObject.g[guid].transform);
	}
	var pathData = item.$.d
	var pathSegmentPattern = /[a-z][^a-z]*/ig;
	// split on every letter
	var pathSegments = pathData.match(pathSegmentPattern);
	// add to an array with all the paths (l,L,h,H,v,V,s,S,c,C,M)
  	paths.push(pathSegments);

  	var pathGuid = generateGuid();
  	svgObject.g[guid].path[pathGuid] = pathSegments;
});

xml.on('startElement: g', function(item){
	guid = generateGuid();
	svgObject.g[guid] = [];
	svgObject.g[guid].path = [];
	if(item.$.transform){
		var regExp = /\(([^)]+)\)/;
		svgObject.g[guid].transform = regExp.exec(item.$.transform)[1].split(' ')
	}else{
		svgObject.g[guid].transform = [0,0];
	}

});

xml.on('endElement: svg', function(item) {
	//svgData  stores all svg data.
	svgData = item.$	
	svgObject.data = svgData;
});
xml.on('end', function(){
	// start processing the data

	if (svgObject.data.version == 1.2){
		allPaths = [{
			type: "O",
			points: [svgObject.data.width.slice(0,-2)/2, svgObject.data.height.slice(0,-2)/2],
			paint: false
		}];
	} else if (svgObject.data.version == 1.1) {
		allPaths = [{
			type: "O",
			points: [svgObject.data.width/2, svgObject.data.height/2],
			paint: false
		}];
	}


	for (var key in svgObject.g) {
   		if (svgObject.g.hasOwnProperty(key)) {
      		var obj = svgObject.g[key];
      		var transform = obj.transform.toFloat();
      		for (var uid in obj.path) {
         		if (obj.path.hasOwnProperty(uid)) {
         			var path = obj.path[uid]
         			for (var i = 0; i < path.length; i++) {
         				if (svgObject.data.version == 1.1) {
         					var numbers = path[i].substr(1).replace(/^\s\s*/, '').replace(/\s\s*$/, '').split(/ +/).removeEmpty().toFloat();
         					if ( path[i].slice(0, 1) == path[i].slice(0, 1).toUpperCase()){
         						for (var j = 0; j < numbers.length; j++) {
	         						if (j%2 !== 0){
	         							numbers[j] = numbers[j]+transform[1];
	         						} else {
	         							numbers[j] = numbers[j]+transform[0];
	         						}
	         					};
         					}
							allPaths.push({
								type: path[i].slice(0, 1),
								points : numbers.toFloat(),
								paint : true
							});
         				} else if (svgObject.data.version == 1.2) {
         					var numbers = path[i].substr(1).replace(/-/gi, ',-').split(",").removeEmpty().toFloat();
         					if ( path[i].slice(0, 1) == path[i].slice(0, 1).toUpperCase()){
								for (var j = 0; j < numbers.length; j++) {
	         						if (j%2 !== 0){
	         							numbers[j] = numbers[j]+transform[0];
	         						} else {
	         							numbers[j] = numbers[j]+transform[1];
	         						}
	         					};
         					}
							allPaths.push({
								type: path[i].slice(0, 1),
								points : numbers.toFloat(),
								paint : true
							});
			         	}
         			};
         		}
      		}
   		}
	}

	//remove z
	for (var i = allPaths.length - 1; i >= 0; i--) {
		var p = allPaths[i].points;
		if (allPaths[i].type === "z") {
			allPaths.splice(i, 1);
		};
	};

	// change all the relative positioned paths to absolute paths
	for (var i = 1; i < allPaths.length; i++) {
		var absolutePointsArray = new Array();
		var prevAbsoluteX = allPaths[i-1].points[allPaths[i-1].points.length-2];
		var prevAbsoluteY = allPaths[i-1].points[allPaths[i-1].points.length-1];
		absolutePointsArray[0] = allPaths[i-1].points[allPaths[i-1].points.length-2];
		absolutePointsArray[1] = allPaths[i-1].points[allPaths[i-1].points.length-1];
		if (allPaths[i].type !== allPaths[i].type.toUpperCase()) {
			if (allPaths[i].type !== "v" && allPaths[i].type !== "h" && allPaths[i].type !== "z" && allPaths[i].type !== "l") {
				for (var j = 0; j < allPaths[i].points.length; j++) {
					if (j%2 == 0) {
						absolutePointsArray[j+2] = prevAbsoluteX + allPaths[i].points[j]
					} else {
						absolutePointsArray[j+2] = prevAbsoluteY + allPaths[i].points[j]
					}
				}
			} else {
				if (allPaths[i].type === "v") {
					absolutePointsArray[2] = prevAbsoluteX 
					absolutePointsArray[3] = prevAbsoluteY + allPaths[i].points[0]
				} else if(allPaths[i].type === "h") {
					absolutePointsArray[2] = prevAbsoluteX + allPaths[i].points[0]
					absolutePointsArray[3] = prevAbsoluteY 
				} else if(allPaths[i].type === "z") {
					for (var j = i - 1; j >= 0; j--) {
						if (allPaths[j].type === "M") {

							absolutePointsArray[2] = allPaths[j].points[0]
							absolutePointsArray[3] = allPaths[j].points[1]
							break;
						}
					};
				} else if(allPaths[i].type === "l") {

					absolutePointsArray[2] = prevAbsoluteX  + allPaths[i].points[0]
					absolutePointsArray[3] = prevAbsoluteY + allPaths[i].points[1]
				}
			}
			
			// deze posities zijn relatief en moeten absolute gemaakt worden.
			// ga één terug en kijk of deze al absoluut is en trek alle x y op bij de absolute waarden.
		} else if(allPaths[i].type == "V") {
					absolutePointsArray[2] = prevAbsoluteX
					absolutePointsArray[3] = allPaths[i].points[0]
		} else if(allPaths[i].type == "H") {
					absolutePointsArray[2] = allPaths[i].points[0]
					absolutePointsArray[3] = prevAbsoluteY
		} else if(allPaths[i].type == "L") {
					absolutePointsArray[2] = allPaths[i].points[0]
					absolutePointsArray[3] = allPaths[i].points[1]
		} else if(allPaths[i].type == "S" || allPaths[i].type == "C") {
				for (var j = 0; j < allPaths[i].points.length; j++) {
					if (j%2 == 0) {
						absolutePointsArray[j+2] = allPaths[i].points[j]
					} else {
						absolutePointsArray[j+2] = allPaths[i].points[j]
					}
			    }
		} else if(allPaths[i].type == "Q") {
			allPaths[i].type = "C";
			absolutePointsArray[2] = allPaths[i].points[0];
			absolutePointsArray[3] = allPaths[i].points[1];
			absolutePointsArray[4] = allPaths[i].points[0];
			absolutePointsArray[5] = allPaths[i].points[1];
			absolutePointsArray[6] = allPaths[i].points[2];
			absolutePointsArray[7] = allPaths[i].points[3];
		}

		
		if(allPaths[i].type !== "M") {
			allPaths[i].type = allPaths[i].type.toUpperCase()
			allPaths[i].points = absolutePointsArray;
		}
		if (allPaths[i].type === "H" || allPaths[i].type === "V") {
			allPaths[i].type = "L"
		}
	};
	
	// change all "M" and "S" to Curves
	for (var i = 0; i < allPaths.length; i++) {
		if (allPaths[i].type === "M") {
			var prevX = allPaths[i-1].points[allPaths[i-1].points.length-2];
			var prevY = allPaths[i-1].points[allPaths[i-1].points.length-1];
			var prevX2 = allPaths[i-1].points[allPaths[i-1].points.length-4];
			var prevY2 = allPaths[i-1].points[allPaths[i-1].points.length-3];
			
			if (prevX2 === undefined) {
				prevX2 = prevX
			}
			if (prevY2 === undefined) {
				prevY2 = prevY
			}
			var prevLineX = prevX2 - prevX;
			var prevLineY = prevY2 - prevY;
			var nextX = allPaths[i+1].points[0];
			var nextY = allPaths[i+1].points[1];
			var nextX2 = allPaths[i+1].points[2];
			var nextY2 = allPaths[i+1].points[3];
			if (nextX2 == nextX && allPaths[i+1].type !== "L") {

				nextX2 = allPaths[i+1].points[4];
			}
			if (nextY2 == nextY && allPaths[i+1].type !== "L") {
				nextY2 = allPaths[i+1].points[5];
			}
			var nextLineX = nextX - nextX2;
			var nextLineY = nextY - nextY2;
			var prevDirX = prevX - prevLineX;
			var prevDirY = prevY - prevLineY;

			// TODO check minimum lenght on both directions, specially if previous or next was a L

			var points = [
				prevX, 
				prevY, 
				prevDirX , 
				prevDirY, 
				nextX + nextLineX, 
				nextY + nextLineY, 
				nextX, 
				nextY
			]
			allPaths[i].type = "C"
			allPaths[i].points = points
			allPaths[i].paint = false


		} else if (allPaths[i].type === "S") {
			var prevX = allPaths[i-1].points[allPaths[i-1].points.length-2];
			var prevY = allPaths[i-1].points[allPaths[i-1].points.length-1];
			var prevX2 = allPaths[i-1].points[allPaths[i-1].points.length-4];
			var prevY2 = allPaths[i-1].points[allPaths[i-1].points.length-3];
			if (prevX2 === undefined) {
				prevX2 = prevX
			}
			if (prevY2 === undefined) {
				prevY2 = prevY
			}
			var prevLineX = prevX - prevX2;
			var newPointX
			if (prevX > prevX2) {
				newPointX = allPaths[i].points[0] + prevLineX
			} else {
				newPointX = allPaths[i].points[0] + prevLineX
			}
			

			var prevLineY = prevY - prevY2;
			var newPointY
			if (prevY > prevY2) {
				newPointY = allPaths[i].points[1] + prevLineY
			} else {
				newPointY = allPaths[i].points[1] + prevLineY
			}
			
			
			var points = [
				allPaths[i].points[0], 
				allPaths[i].points[1], 
				newPointX, 
				newPointY, 
				allPaths[i].points[2], 
				allPaths[i].points[3], 
				allPaths[i].points[4], 
				allPaths[i].points[5]
			]
			allPaths[i].type = "C"
			allPaths[i].points = points
		} else if (allPaths[i].type === "C" && allPaths[i].points.length === 6) {
			var points = [
				allPaths[i-1].points[allPaths[i-1].points.length-2],
				allPaths[i-1].points[allPaths[i-1].points.length-1],
				allPaths[i].points[0], 
				allPaths[i].points[1], 
				allPaths[i].points[2], 
				allPaths[i].points[3], 
				allPaths[i].points[4], 
				allPaths[i].points[5]
			]
			allPaths[i].points = points
		}
	};


	// check if all the curves are in one fluid line if not add a new curve in between to smooth out this curve
	for (var i = 1; i < allPaths.length-1; i++) {
		var slope = function () {
			var fixedX = allPaths[i].points[allPaths[i].points.length-2];
			var fixedY = allPaths[i].points[allPaths[i].points.length-1];
			var dirX = allPaths[i].points[allPaths[i].points.length-4];
			var dirY = allPaths[i].points[allPaths[i].points.length-3];
			if (fixedX === dirX && fixedY === dirY && allPaths[i].type === "C") {
				var dirX = allPaths[i].points[allPaths[i].points.length-6];
				var dirY = allPaths[i].points[allPaths[i].points.length-5];	
			}
			return (fixedX - dirX)/(fixedY - dirY);
		}();
		var nextSlope = function () {
			var fixedX = allPaths[i+1].points[0];
			var fixedY = allPaths[i+1].points[1];
			var dirX = allPaths[i+1].points[2];
			var dirY = allPaths[i+1].points[3];
			if (fixedX === dirX && fixedY === dirY && allPaths[i+1].type === "C") {
				var dirX = allPaths[i+1].points[4];
				var dirY = allPaths[i+1].points[5];
			}
			return (fixedX - dirX)/(fixedY - dirY);
		}();

		if (slope !== nextSlope ) {
			
			var testX = allPaths[i].points[allPaths[i].points.length-2];
			var testY = allPaths[i].points[allPaths[i].points.length-1];			
			if (slope - nextSlope > 2 || slope - nextSlope < -2 ) { // 18 is a good value
				if (Math.abs(slope) !== Math.abs(nextSlope)) {
						var fixedX = allPaths[i].points[allPaths[i].points.length-2];
						var fixedY = allPaths[i].points[allPaths[i].points.length-1];
						var dirX = allPaths[i].points[allPaths[i].points.length-4];
						var dirY = allPaths[i].points[allPaths[i].points.length-3];
						if (fixedX === dirX && fixedY === dirY && allPaths[i].type === "C") {
							var dirX = allPaths[i].points[allPaths[i].points.length-6];
							var dirY = allPaths[i].points[allPaths[i].points.length-5];	
						}
						var opositeX = fixedX +(fixedX - dirX);
						var opositeY = fixedY +(fixedY - dirY);
						var length = Math.sqrt(Math.pow((fixedX-opositeX),2)+Math.pow((fixedY-opositeY),2));
						
						if (length < 20 ) {
							opositeX = fixedX +4*(fixedX - dirX);
							opositeY = fixedY +4*(fixedY - dirY);
						} else if (length > 80) {
							opositeX = fixedX +(fixedX - dirX)/2;
							opositeY = fixedY +(fixedY - dirY)/2;
						}


						var fixedX2 = allPaths[i+1].points[0];
						var fixedY2 = allPaths[i+1].points[1];
						var dirX2 = allPaths[i+1].points[2];
						var dirY2 = allPaths[i+1].points[3];
						if (fixedX2 === dirX2 && fixedY2 === dirY2 && allPaths[i+1].type === "C") {
							var dirX2 = allPaths[i+1].points[4];
							var dirY2 = allPaths[i+1].points[5];
						}
						var opositeX2 = fixedX2 +(fixedX2 - dirX2);
						var opositeY2 = fixedY2 +(fixedY2 - dirY2);
						var length2 = Math.sqrt(Math.pow((fixedX2-opositeX2),2)+Math.pow((fixedY2-opositeY2),2));						
							
						if (length2 < 20) {
							opositeX2 = fixedX2 +4*(fixedX2 - dirX2);
							opositeY2 = fixedY2 +4*(fixedY2 - dirY2);
						} else if (length2 > 80) {
							opositeX2 = fixedX2 +(fixedX2 - dirX2)/2;
							opositeY2 = fixedY2 +(fixedY2 - dirY2)/2;
						}
						
						//TODO check if the oposite value fall out of the drawing box

						allPaths.insert(i+1,{
							type: "C",
							points : [
								fixedX,
								fixedY,
								opositeX,
								opositeY,
								opositeX2,
								opositeY2,
								fixedX2,
								fixedY2
							],
							paint: false
						});
						i++
					//console.log(slope- nextSlope);

					};
				
			};
			
			
		}
	};

	//add lenght to all C's and L's + calculate total lenght of the curve
	for (var i = 0 ; i < allPaths.length; i++) {
		var p = allPaths[i].points
		if (allPaths[i].type === "C") {
			allPaths[i].bezier = new Bezier({x:p[0],y:p[1]},{x:p[2],y:p[3]},{x:p[4],y:p[5]},{x:p[6],y:p[7]});
			allPaths[i].startLength = totalLength;
			totalLength = totalLength + allPaths[i].bezier.length;
			allPaths[i].endLength = totalLength;
		} else if (allPaths[i].type === "L") {
			allPaths[i].length = Math.sqrt(Math.pow((p[0]-p[2]),2)+Math.pow((p[1]-p[3]),2));
			allPaths[i].startLength = totalLength;
			totalLength = totalLength +  allPaths[i].length;
			allPaths[i].endLength = totalLength;
		}
	};

	
	// PROCESSING OUTPUT show bezier curves
	if (output === "processing" ) {
		for (var i = 0 ; i < allPaths.length; i++) {
			var color = (allPaths[i].paint)? 0 : 230 ;
			processing = processing + "stroke("+ color +")\;\r\n"
			if (allPaths[i].type === "C") {

				var y = ""
				for (var j =  0; j < allPaths[i].points.length; j++) {
					y = y + allPaths[i].points[j] + ', '
				};

				processing = processing + "bezier (" + y.slice(0,-2) + ")\;\r\n";

			} else if (allPaths[i].type === "L") {

				var y = ""
				for (var j =  0; j < allPaths[i].points.length; j++) {
					y = y + allPaths[i].points[j] + ', '
				};

				processing = processing + "line (" + y.slice(0,-2) + ")\;\r\n";

			}
		};
	};
	
	// PointsOnCurve returns object of x y paint on a give distance on the curve
	var points = new PointsOnCurve(resolution,allPaths);

	// PROCESSING OUTPUT show bezier curves
	if (output === "processingx" ) {
		var color = 255;
		for (var i = 0 ; i < points.length; i++) {
			var newColor = (points[i].paint)? 255 : 0 ;	
			if (newColor !== color) {
				processing = processing + "stroke("+ color +")\;\r\n"
				color = newColor;
			}
			processing = processing + "ellipse("+ points[i].x + ', '+ points[i].y + ', 1, 1)\;\r\n';
			
		};
	};
	
	points.shift();
	if (conversionType === "scara") {
		var xyPoints = new CartesianToScara(points);
		// PROCESSING OUTPUT show two arms based on there angle
		if (output === "processingx") {
			processing = processing + "colorMode(HSB, "+xyPoints.length+")\;\r\n"
			for (var i = 1 ; i < xyPoints.length; i++) {
				processing = processing + "stroke("+i+","+xyPoints.length+", 200)\;\r\n";
				var	secondXPoint = 200 + Math.cos(xyPoints[i].step0*Math.PI/180)* 100 ;
				var secondYPoint = 200 + Math.sin(xyPoints[i].step0*Math.PI/180)* 100 ;
				processing = processing + "line( 200, 200, "+secondXPoint+", "+secondYPoint+")\;\r\n";
				var	thirdXPoint = secondXPoint + Math.cos(xyPoints[i].step1*Math.PI/180)* 100;
				var thirdYPoint = secondYPoint + Math.sin(xyPoints[i].step1*Math.PI/180)* 100;
				processing = processing + "line( " +secondXPoint+", "+secondYPoint+", "+thirdXPoint+", "+thirdYPoint+")\;\r\n";

			};
		};
		// set angles to start position of the robot boom1 down boom 2 up istead of both straight to the right
		var arduinoAngles = new Array();
		for (var i = 0; i < xyPoints.length; i++) {
			var angleObject = [
				xyPoints[i].step0 - 90,
				xyPoints[i].step1 - 270,
				(xyPoints[i].paint)? 1:0
			];
			arduinoAngles.push(angleObject);
		};

		// takes the shortest route to next positon
		var compensatie = [0,0]
		for (var i = 1; i < arduinoAngles.length; i++) {
			for (var j = 0; j < 2; j++) {
				// Bepaal de range waartussen de hoek moet zitten nooit meer of minder dan 180° van de vorige
				var newValue = arduinoAngles[i][j] + compensatie[j]
				var minValue = arduinoAngles[i-1][j]-180;
				var maxValue = arduinoAngles[i-1][j]+180;
				if (newValue < minValue) {
					compensatie[j] = compensatie[j] + 360;
					i--;
				} else if (newValue > maxValue) {
					compensatie[j] = compensatie[j] - 360;
					i--;
				} else {
					arduinoAngles[i][j] = arduinoAngles[i][j] + compensatie[j];
				}
			};
		};
		// change from degrees to steps
		var stepsPerDegree = 1/(1.8/8)
		var arduinoSteps = new Array();
		for (var i = 0; i < arduinoAngles.length; i++) {
			var stepsObject = [[
					Math.round(arduinoAngles[i][0]*stepsPerDegree),
					Math.round(-arduinoAngles[i][1]*stepsPerDegree)
				],
				arduinoAngles[i][2]
			]
			arduinoSteps.push(stepsObject);
		};

		var painterPositions = new Array();
		for (var i = 0; i < arduinoAngles.length; i++) {
			var stepsObject = {
				p : Math.round(arduinoAngles[i][0]*stepsPerDegree),
				s : Math.round(-arduinoAngles[i][1]*stepsPerDegree),
				l : arduinoAngles[i][2],
				x : Math.round(xyPoints[i].x),
				y : Math.round(xyPoints[i].y)
			}
			painterPositions.push(stepsObject);
		};
		console.info(JSON.stringify({painterPositions: painterPositions}));
	};



	if (output === "processing") {
		processing = processing +"}";

		// PROCESSING OUTPUT finish the processing data and write to processing file and execupte that file.
		fs.writeFile(__dirname+"/../public/processing/processing.pde", processing, function(err) {
			if(err) {
			    console.log(err);
			} else {
			    //console.log("The processing file was saved in public");
			}
			/*var spawn = require('child_process').spawn
				, ls    = spawn('processing-java', [
		    		'--sketch='+ __dirname+'/../paintOverBluetooth/public/processing', 
		    		'--output='+ __dirname+'/tmp',
		    		'--force',
		    		'--run'
		    	]);*/
		}); 
	};
})





