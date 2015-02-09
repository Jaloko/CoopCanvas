var mouseDown = false;
var mousePos = {
	x : 0,
	y : 0
}
var lastPos = {
	x: 0,
	y: 0
}
var socket = io.connect();
var hasSynced = false;
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
var pointerCanvas = document.getElementById('pointer-canvas');
var pointerContext = pointerCanvas.getContext('2d');

var Brush = function(){
	this.size = 30,
	this.colour = getRandomColor(),
	this.brushType = "freeroam",

	this.setBrushType = function(type){
		this.brushType = type;
	},

	this.getBrushType = function(){
		return this.brushType;
	}

	this.setColour = function(newColour){
		this.colour = newColour;
	}
};

var brush = new Brush();

var name;
var randomNames = [
"Beulah Wright", "Curtis Fox", "Levi Collins", "Gustavo	Russell", "Erica Lowe", "Sherri Mcbride", "Zachary Martin", "Preston Fletcher", "Jack Shaw", "Chris Carr", "Morris Goodwin", "Raquel Drake", "Sandy Pearson", "Francis Farmer", "Erika Haynes", "Edgar Warren", "Randal Love", "Lucas Cannon", "Ismael Terry", "Rex Alexander", "Russell Houston", "Kenneth Potter", "Ricky James", "Latoya Rivera", "Katherine Chapman", "Gerald Gomez", "Glenda Robinson", "Adrian Cox", "Maurice Barton", "Harold Hansen", "Nicole Townsend", "Jorge Waters", "Hugo Hampton", "Stephen Mcgee", "Marguerite Conner", "Bill Newman", "Rodney Cook", "Santiago Reid", "Toby Casey", "Mamie Allison", "Tami Lawrence", "Tim Crawford", "Paula Carpenter", "Flora Young", "Marian Ferguson","Lewis Carlson", "Nina Wise", "Elisa Hanson", "Shelly Lucas", "Gabriel Stevenson", "Elbert Reeves", "Vicky Jackson", "Cassandra Moreno", "Becky Todd", "Jimmy Soto", "Opal Hicks", "Darren Mendoza", "Reginald Watts", "Cesar Sutton", "Lionel Rodgers", "Christopher Robertson", "Terrance Byrd", "Kristy Garza", "Herbert Flowers", "Kirk Schmidt", "Dennis Thomas", "Essie Henry", "Abel Tucker", "Katrina Phelps", "Rolando Gonzalez", "Olga Howard", "Cecilia Cortez", "Tanya Cohen", "Juanita Rios", "Jeff Davis", "Marty Perkins", "Ian Ortiz", "Andy George", "Salvatore Hamilton", "Verna Barker", "Louise Frank", "April Nunez", "Bonnie Ramirez", "Kay Sherman", "Stacy Nelson", "Lorraine White", "Paul Glover", "Otis Woods", "Darrin Guerrero", "Whitney Underwood", "Henry Graves", "Eula Leonard", "Francis Sanchez", "Hubert Christensen", "Doug Stanley", "Neal Washington", "Everett Harvey", "Nicholas Hale", "Pedro Ramsey", "Sadie Stephens"];
var connectedUsers;

function pickRandomName() {
	var rand = Math.floor(Math.random() * randomNames.length);
	return randomNames[rand];
}

function setNameTextBox() {
	var theName = pickRandomName();
	document.getElementById('name').value = theName;
	name = theName;
}

function init() {
	context.fillStyle = "white";
	context.fillRect(0, 0, canvas.width, canvas.height);
	setNameTextBox();
	webGLStart();
}


function createRoom() {
	socket.emit('create room');
}


function joinRoom() {
	insertURLParam("room", selectedRoom);
}

function searchRoom() {
	var table = document.getElementById('room-list');
	var row = table.rows;
	var roomSearch = document.getElementById('room-search');
	for(var i = 1; i < row.length; i++) {
		row[i].className = "";
		if(roomSearch.value != "") {
			if(roomSearch.value != row[i].cells[0].innerHTML) {
				 row[i].className = "invisible";
			}
		}
	}
}

socket.on('room result', function(data) {
	insertURLParam("room", data);
});

function sync() {
	if(hasSynced == false) {
		name = document.getElementById('name').value;
		socket.emit('join room', getURLParam('room'));
	}
}

socket.on('room verification', function() {
	var me = {
		id: getURLParam('room'),
		name : name,
		colour: brush.colour
	}
	socket.emit('im online', me);
});

socket.on('user validated', function() {
	socket.emit('sync');
	// Hide enter name box
	document.getElementById('name-wrap').className = "invisible";
});

socket.on('sync draw', function(data) {
	drawLine(data.x, data.y, data.lastX, data.lastY, data.size, data.colour);
});

socket.on('sync result', function(data) {
	if(data != null) {
		var img = new Image();
		img.onload = function(){
		  	context.drawImage(img,0,0); // Or at whatever offset you like
		};
		img.src = data;
	}
	hasSynced = true;
});

socket.on('send canvas', function() {
	socket.emit('recieve canvas', canvas.toDataURL());
});

socket.on('user list', function(data) {
	clearUsers();
	if(data.length != 0) {
		connectedUsers = data.length;
		for(var i = 0; i < data.length; i++) {
			if(data[i] != null) {
				if(data[i].name == name) {
					addUser(data[i].name + " (you)", data[i].colour);
				} else {
					addUser(data[i].name, data[i].colour);
				}
			}
		}
	}
});

socket.on('recieve clear canvas', function() {
	context.fillStyle = "white";
   	context.fillRect(0, 0, canvas.width, canvas.height);
});


/*
	Canvas Methods
*/

function clearCanvas() {
	context.fillStyle = "white";
   	context.fillRect(0, 0, canvas.width, canvas.height);
   	socket.emit('clear canvas');
}

function drawBrushOutline(x, y) {
	var cr = pointerCanvas.getBoundingClientRect();
	pointerContext.clearRect ( 0 , 0 , pointerCanvas.width, pointerCanvas.height );
    pointerContext.beginPath();
    pointerContext.strokeStyle = 'white';
    pointerContext.arc(x - cr.left, y - cr.top, brush.size / 2,0,2*Math.PI);
    pointerContext.stroke();
    pointerContext.beginPath();
    pointerContext.strokeStyle = 'black';
    pointerContext.arc(x - cr.left, y - cr.top, brush.size / 2,0,2*Math.PI);
    pointerContext.stroke();
    pointerContext.beginPath();
    pointerContext.strokeStyle = 'white';
    pointerContext.arc(x - cr.left, y - cr.top, brush.size / 2,0,2*Math.PI);
    pointerContext.stroke();
}

function draw() {
	var canvasRect = canvas.getBoundingClientRect();
	var json = {
		name: name,
		x: mousePos.x - canvasRect.left,
		y: mousePos.y - canvasRect.top,
		lastX: lastPos.x - canvasRect.left,
		lastY: lastPos.y - canvasRect.top,
		size: brush.size,
		colour: brush.colour
	}
	drawLine(json.x, json.y, json.lastX, json.lastY, json.size, json.colour);
	socket.emit('draw', json);
}

function drawRect(x, y, colour) {
    context.fillStyle = colour;
	context.fillRect(x, y, 15, 15);
}

function drawCircle(x, y, size, colour) {
	//draw a circle
	context.lineTo(x, y);
	context.fillStyle = colour;
	context.beginPath();
	context.arc(x, y, size, 0, Math.PI*2, true); 
	context.closePath();
	context.fill();
}

function drawLine(x, y, lastX, lastY, size, colour) {
	context.strokeStyle = colour;
	context.lineWidth = size;
	context.lineCap = "round";
	context.beginPath();
	context.moveTo(lastX, lastY);
	context.lineTo(x,y);
	context.stroke();
}

var myEvent = window.attachEvent || window.addEventListener;
var chkevent = window.attachEvent ? 'onbeforeunload' : 'beforeunload'; /// make IE7, IE8 compitable

// Fired when just before you leave the site
// It appears the problem here was that it cant send 2 socket.emits()
myEvent(chkevent, function(e) { // For >=IE7, Chrome, Firefox
	var me = {
		name: name,
		colour: brush.colour
	};
	if(connectedUsers == 1) {
		me.canvas = canvas.toDataURL();
		socket.emit('im offline store canvas', me);
	} else {
		socket.emit('im offline', me);
	}
});

function clearUsers() {
	var users = document.getElementById('users');
	users.innerHTML = "";
}

function addUser(name, colour) {
	var users = document.getElementById('users');
	var newUser = '<div id="' + name + '"class="row">'
						+ '<div class="user-colour" style="background-color: ' + colour + '">'
						+ '</div>'
						+ '<div class="user-name">'
							+ name +
						'</div>'
					+ '</div>';
	users.innerHTML += newUser;
}

/**
** Helper Functions
**/

function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function getMousePos(evt) {
	// Scroll bar offsets
	var doc = document.documentElement;
	var left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
	var top = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
    return {
        x: evt.clientX + left,
       	y: evt.clientY + top
    };
}


//  Can be removed as it has been potentially replaced with brushSelection

// **
// Brushes
//

// Brush Lines 
// note: doesnt support other browsers gl
var brushSelection = document.getElementById('brushSelection');

brushSelection.addEventListener("input", function(evt){
	brushSize(this.value);
});


function brushSize(newSize){
	brush.size = newSize;
}

function inputColourChange() {
	var rgb = {
		r: document.getElementById("rValue").value | 0,
		g: document.getElementById("gValue").value | 0,
		b: document.getElementById("bValue").value | 0
	};
	onColourChange(rgb);
}

function onHexChange() {
	if(document.getElementById("hexValue").value.length == 7) {
		var rgb = convertHexToRGB(document.getElementById("hexValue").value);
		onColourChange(rgb);
	}
}

function onColourChange(rgb) {
	var hex = convertRGBToHex(rgb.r, rgb.g, rgb.b);
	var hsv = convertRGBToHSV(rgb.r, rgb.g, rgb.b);
	tintPointer = {
		x: Math.ceil((100 - hsv.s) * 2.55),
		y: Math.ceil((100 - hsv.v) * 2.55)
	};
	huePointer = {
		y: Math.ceil((360 - hsv.h) / 360 * 255)
	};
	updateColour();
	brush.setColour(hex);
	brush.setBrushType("freeroam");
}

document.addEventListener('mousemove', function(evt) {
	lastPos = mousePos;
	mousePos = getMousePos(evt);
	drawBrushOutline(mousePos.x, mousePos.y);
	if(mouseDown === true && brush.getBrushType() === "freeroam") {
		if(hasSynced == true) {
			if(mouseIsHoveringCanvas(canvas)) {
				draw();
			}
			changeColour();
		}
	}
}, false);

document.addEventListener("mousedown", function(evt) {
	canvas.className = "dragged";
	if(evt.button === 0) {
    	mouseDown = true;
    	if(mouseDown === true) {
    		// Located in colour-picker2.js
		    if(canMoveTintPointer == false) {
		        if(mouseIsHoveringCanvas(tintCanvas)) {
		            canMoveTintPointer = true;
		        }  
		    }
    		if(hasSynced == true) {
    			if(brush.brushType === "dropper"){
    				var rgb = getColourOnCanvas(canvas, context);
					onColourChange(rgb);
				} else if(brush.brushType === "fillBucket") {
					fillBucket(context, brush.colour);
					brush.setBrushType("freeroam");
				}
				changeColour();
    		}
    	}
	} else {
		brush.colour = getRandomColor();
	}
});
document.addEventListener("mouseup", function(evt) {
	canvas.className = ""; // Reverts to no classname
	if(evt.button === 0) {
    	mouseDown = false;
	   // Located in colour-picker2.js
	    if(canMoveTintPointer == true) {
	        canMoveTintPointer = false;
	    }
	}
});

document.getElementById('clearCanvas').addEventListener('click', function(evt){
	clearCanvas();
})

document.getElementById('colourDrop').addEventListener('click', function(evt){
	brush.setBrushType('dropper');
});

/*document.getElementById('fillBucket').addEventListener('click', function(evt){
	brush.setBrushType('fillBucket');
});
*/