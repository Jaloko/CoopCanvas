/*------------------------------------------
	Global JS
	
	Events - Mouse
	Events - Key
	Events - onChange
	Events - Click
------------------------------------------*/


var socket = io.connect();
var hasSynced = false;
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
var pointerCanvas = document.getElementById('pointer-canvas');
var pointerContext = pointerCanvas.getContext('2d');

var canDraw = false;

var tool = new ToolSet();
	
var name;
var randomNames;
var connectedUsers;
var currentlyVoting = false;
var readyForText = false;
var currentlySaving = false;
var textPos = {
	x: 0,
	y: 0
};

var shapePos = {
	x: 0,
	y: 0
};
var shapeEndPos = {
	x: 0,
	y: 0
};
var messageCounter = 0;
var userJoinCounter = 0;
var canvasRect = canvas.getBoundingClientRect();

function loadCanvasPage() {
	var roomId = document.getElementById('room-id').innerHTML;
	socket.emit('does room exist', roomId);
}

function sendChatMessage() {
	var data = {
		'name': name,
		'message': document.getElementById('chat-message').value
	}
	if(data.message.length > 0) {
		document.getElementById('chat-message').value = "";
		addChatMessage(data);
		socket.emit('chat message', data);
	}
}

document.getElementById('chat-message').onkeypress = function(e){
    if (!e) e = window.event;
    var keyCode = e.keyCode || e.which;
    if (keyCode == '13'){
     	sendChatMessage();
      	return false;
    }
}

document.getElementById('name').onkeypress = function(e){
    if (!e) e = window.event;
    var keyCode = e.keyCode || e.which;
    if (keyCode == '13'){
     	sync();
      	return false;
    }
}

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
	ColourPicker.initColourPicker();
	getNameList();
}

function getNameList() {
	var txtFile = new XMLHttpRequest();
	txtFile.open("GET", "/files/names.txt", true);
	txtFile.onreadystatechange = function() {
		if (txtFile.readyState === 4) {  // document is ready to parse.
		    if (txtFile.status === 200) {  // file is found
		      	allText = txtFile.responseText; 
		      	lines = txtFile.responseText.split("\n");
		      	randomNames = lines;
		      	setNameTextBox();
		    }
		}
	}
	txtFile.send(null);
}

function sync() {
	if(hasSynced === false) {
		var roomId = document.getElementById('room-id').innerHTML;
		name = document.getElementById('name').value;
		var me = {
			'id': roomId,
			'name' : name,
			'colour': tool.brush.colour
		}
		socket.emit('join room', roomId);
		socket.emit('im online', me);
	}
}

socket.on('does room exist result', function(data) {
	if(data == true) {
		document.getElementById('name-box').className = "";
		document.getElementById('name-content').className = "";
	} else {
		document.getElementById('name-box').className = "";
		document.getElementById('room-not-exist').className = "";
		document.getElementById('name-content').className = "Invisible";
	}
});

socket.on('room does not exist', function(data) {
	document.getElementById('name-box').className = "";
	document.getElementById('room-not-exist').className = "";
	document.getElementById('name-content').className = "Invisible";
});

socket.on('name taken', function() {
	document.getElementById('name-taken').className = "";
});

socket.on('user validated', function() {
	document.getElementById('name-content').className = "invisible";
	document.getElementById('name-taken').className = "invisible";
	document.getElementById('currently-syncing').className = "";
	socket.emit('sync');
	// Hide enter name box
});

socket.on('room full', function() {
	document.getElementById('room-full').className = "";
});

socket.on('sync draw', function(data) {
	tool.shapeTool.drawCircle(data['x'], data['y'], data['lastX'], data['lastY'], data['size'], data['colour']);
});

socket.on('sync draw text', function(data) {
	tool.textTool.drawText(data['x'], data['y'], data['font'], data['colour'], data['text']);
});

socket.on('sync draw rect', function(data) {
	tool.shapeTool.drawShapeRect(data['x'], data['y'], data['endX'], data['endY'], data['colour']);
});

socket.on('sync draw circle', function(data) {
	tool.shapeTool.drawShapeCircle(data['x'], data['y'], data['endX'], data['endY'], data['colour']);
});

socket.on('sync draw pentagon', function(data) {
	tool.shapeTool.drawShapeRegularPolygon(5, data['x'], data['y'], data['endX'], data['endY'], data['colour']);
});

socket.on('sync draw hexagon', function(data) {
	tool.shapeTool.drawShapeRegularPolygon(6, data['x'], data['y'], data['endX'], data['endY'], data['colour']);
});

socket.on('sync draw line', function(data) {
	tool.brush.drawShapeLine(data['x'], data['y'], data['endX'], data['endY'], data['colour'], data['size'], data['lineTip']);
});

socket.on('sync erase', function(data) {
	tool.shapeTool.drawRect(data['x'], data['y'], data['lastX'], data['lastY'], data['size'], "white");
});

socket.on('sync draw square', function(data) {
	tool.shapeTool.drawRect(data['x'], data['y'], data['lastX'], data['lastY'], data['size'], data['colour']);
});

socket.on('sync result', function(data) {
	document.getElementById('name-wrap').className = "invisible";
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
					addUser(data[i]['name'] + " (you)", data[i]['colour']);
				} else {
					addUser(data[i]['name'], data[i]['colour']);
				}
			}
		}
		var ele = document.getElementById('users-online-tab');
		if(ele.className != "tab selected") {
			userJoinCounter++;
			ele.innerHTML = '<a>Users Online</a>' +
					'<div class="orange-notification">' +
							userJoinCounter +
					'</div>';
		} else {
			userJoinCounter = 0;
		}
	}
});

socket.on('sync user colour', function(data) {
	if(data.length != 0) {
		for(var i = 0; i < data.length; i++) {
			var user;
			if(data[i]['name'] === name) {
				user = document.getElementById(data[i]['name'] + " (you)");
				if(user != null) {
					user.innerHTML = '<div class="user-colour" style="background-color:' + data[i]['colour'] + '"></div>' +
								 '<div class="user-name">' + data[i]['name'] + ' (you)</div>';
				}
			} else {
				user = document.getElementById(data[i]['name']);
				if(user != null) {
					user.innerHTML = '<div class="user-colour" style="background-color:' + data[i]['colour'] + '"></div>' +
							     	'<div class="user-name">' + data[i]['name'] + '</div>';
				}
			}
		}
	}	
});

socket.on('recieve clear canvas', function() {
	context.fillStyle = "white";
   	context.fillRect(0, 0, canvas.width, canvas.height);
});

socket.on('send vote clear', function(data) {
	currentlyVoting = true;
	var clearVoteBox = document.getElementById('clear-canvas-vote-box');
	clearVoteBox.className = "";
	document.getElementById('timeRemain').innerHTML = data;
});

socket.on('send clear vote timer', function(data) {
	var clearVoteBox = document.getElementById('clear-canvas-vote-box');
	clearVoteBox.className = "";
	document.getElementById('clear-wrap').className ="table-visible";
	document.getElementById('result').className = "invisible";
	document.getElementById('time').className = "";
	document.getElementById('timeRemain').innerHTML = data['timeRemaining'];
	document.getElementById('pYes').innerHTML = "Yes: " + data['yesVotes'];
	document.getElementById('pNo').innerHTML = "No: " + data['noVotes'];
	document.getElementById('pTotal').innerHTML = "Total Possible: " + data['total'];
	if(currentlyVoting === false) {
		document.getElementById('voteButtons').className = "invisible";
	}
});

socket.on('send clear vote result', function(data) {
	document.getElementById('result').className = "";
	document.getElementById('time').className = "invisible";
	document.getElementById('resultData').innerHTML = data;
});

socket.on('cannot start vote', function(data) {
	// This fixes the invisible buttons bug for some reason
	document.getElementById('voteButtons').className = "";	
	alert("Cannot vote to clear for another: " + data + " seconds.");
});

socket.on('unlock canvas', function(data) {
	currentlyVoting = false;
	document.getElementById('clear-wrap').className = "invisible";
	document.getElementById('voteButtons').className = "";	
});

socket.on('sync chat message', function(data) {
	addChatMessage(data);
	var ele = document.getElementById('users-chat-tab');
	if(ele.className != "tab selected") {
		messageCounter++;
		ele.innerHTML = '<a>Chat</a>' +
				'<div class="orange-notification">' +
						messageCounter +
				'</div>';
	} else {
		messageCounter = 0;
	}
});

socket.on('canvas saved', function(data) {
	cSavedTimer = new Date().getTime();
	document.getElementById('save-complete').className = "";
	document.getElementById('save-progress').className = "invisible";
	setTimeout(function() {
		document.getElementById('save-wrap').className ="invisible";
		document.getElementById('save-complete').className = "invisible";
		document.getElementById('save-progress').className = "";
		currentlySaving = false;
	}, 1500)
});

socket.on('room does not exist', function() {
	location.reload();
});

function clearChatNotifs() {
	messageCounter = 0;
	document.getElementById('users-chat-tab').innerHTML = '<a>Chat</a>';
}

function clearUserCounter() {
	userJoinCounter = 0;
	document.getElementById('users-online-tab').innerHTML = '<a>Users Online</a>';
}

function addChatMessage(data) {
	var chat = document.getElementById('chat-box');
	var theName = data['name'];
	if(data['name'] === name) {
		theName = "You";
	}
	var newMesage = '<div class="chat-row">' +
						'<div class="name" style="font-weight: bold;">' + theName + ': ' + '</div>' +
						'<div class="message"><p>' + data['message'] + '</p></div>' +
					'</div>';
	chat.innerHTML += newMesage;
	chat.scrollTop = chat.scrollHeight;
}

function clearVote(vote) {
	socket.emit('recieve clear vote', vote);
	document.getElementById('voteButtons').className = "invisible";
}

/*
	Canvas Methods
*/
function clearCanvas() {
   	socket.emit('vote clear');
	document.getElementById('voteButtons').className = "invisible";
}

function distanceBetween(point1, point2) {
  return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
}

function angleBetween(point1, point2) {
  return Math.atan2( point2.x - point1.x, point2.y - point1.y );
}

var myEvent = window.attachEvent || window.addEventListener;
var chkevent = window.attachEvent ? 'onbeforeunload' : 'beforeunload'; /// make IE7, IE8 compitable

// Fired when just before you leave the site
// It appears the problem here was that it cant send 2 socket.emits()
myEvent(chkevent, function(e) { // For >=IE7, Chrome, Firefox
	var me = {
		'name': name,
		'colour': tool.brush.colour
	};
	if(connectedUsers <= 1) {
		me['canvas'] = canvas.toDataURL();
		socket.emit('im offline store canvas', me);	
	} else {
		socket.emit('im offline', me);	
	}
});

function saveRoom() {
	if(hasSynced === true) {
		currentlySaving = true;
		document.getElementById('save-wrap').className = "table-visible";
		document.getElementById('save-progress').className = "";
		var me = {
			'canvas': canvas.toDataURL()
		};
		socket.emit('store canvas', me);
	}
}

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

document.getElementById('brushSelection').addEventListener("input", function(evt){
	tool.brush.setBrushSize(this.value);
});

speedSelection.addEventListener("input", function(evt){
	tool.brush.rainbowSpeed = parseInt(this.value);
	tool.brush.gradientSpeed = parseInt(this.value);
});

var textSizeSel = document.getElementById('textSizeSel');
textSizeSel.addEventListener("input", function(evt){
	tool.textTool.changeTextSize(this.value);
});

function changeLineTip() {
	var e = document.getElementById("lineTip");
	tool.brush.lineTip = e.options[e.selectedIndex].value;
}

/*function inputColourChange() {
	var rgb = {
		r: document.getElementById("rValue").value | 0,
		g: document.getElementById("gValue").value | 0,
		b: document.getElementById("bValue").value | 0
	};
	onColourChange(rgb);
}

function onHexChange() {
	if(document.getElementById("hexValue").value.length == 7) {
		var rgb = Util.hexToRgb(document.getElementById("hexValue").value);
		// Moved to dropper.js
		onColourChange(rgb);
	}
}*/

function applyText() {
	if(readyForText == true) {
		var cr = canvas.getBoundingClientRect();
		var data = {
			'x': textPos.x - cr.left,
			'y': textPos.y - cr.top,
			'font': tool.textTool.textFont,
			'colour': tool.brush.colour,
			'text': tool.textTool.textToRender
		};
		socket.emit('draw text', data);
		tool.textTool.drawText(data['x'], data['y'], tool.textTool.textFont, data['colour'], tool.textTool.textToRender);
		tool.textTool.textToRender = "";
		document.getElementById('text-tool-text').value = "";
		tool.textTool.drawTempText(textPos.x, textPos.y, tool.textTool.textFont, data['colour'], tool.textTool.textToRender);
		readyForText = false;
		document.getElementById('text-tool-text').blur();
	}
}

/*------------------------------------------
	Events (Mouse)
------------------------------------------*/
document.addEventListener('mousemove', function(evt) {
	// update Mouse Positions
	Input.lastPos = Input.mousePos;
	Input.mousePos = Input.getMousePos(evt);
	// Based on brush type draw an outline for the brush on the pointer canvas
	switch(tool.getBrushType()) {
		case ToolTypes.FREE_ROAM:
		case ToolTypes.GRADIENT_BRUSH:
		case ToolTypes.RAINBOW_BRUSH:
			tool.brush.drawBrushOutline(Input.mousePos.x, Input.mousePos.y);
			break;
		case ToolTypes.ERASER:
		case ToolTypes.SQUARE_BRUSH:
			tool.brush.drawEraserOutline(Input.mousePos.x, Input.mousePos.y);
			break;
	}
	// Enter this scope if the user is wanting to draw
	if(Input.mouseDown === true && hasSynced === true && canDraw === true && 
		currentlyVoting === false && currentlySaving === false) {
		// Handle what tools do on mouse move	
		switch(tool.getBrushType()) {
			case ToolTypes.FREE_ROAM:
				tool.brush.draw();
				break;
			case ToolTypes.GRADIENT_BRUSH:
				tool.updateGradientBrush();
				tool.brush.gradientDraw();
				break;
			case ToolTypes.RAINBOW_BRUSH:
				tool.updateRainbowBrush();
				tool.brush.rainbowDraw();
				break;
			case ToolTypes.DROPPER:
				tool.dropper.updateColour();
				break;
			case ToolTypes.ERASER:
				tool.brush.erase();
				break;
			case ToolTypes.SQUARE_BRUSH:
				tool.brush.drawSquare();
				break;
			case ToolTypes.TEXT_TOOL:
				textPos = Input.mousePos;
				tool.textTool.drawTempText(textPos.x, textPos.y, tool.textTool.textFont, tool.brush.colour, tool.textTool.textToRender);
				break;
			case ToolTypes.SHAPE_TOOL:
				// Means the shapes initial position has been set
				if(tool.shapeTool.readyToDraw === true) {
					tool.shapeTool.sizingReady = true;
					shapeEndPos = Input.mousePos;
					tool.shapeTool.drawTemp(shapePos, shapeEndPos);
				}
				break;
			case ToolTypes.LINE_TOOL:
				// Means the lines initial position has been set
				if(tool.shapeTool.readyToDraw === true) {
					tool.shapeTool.sizingReady = true;
					shapeEndPos = Input.mousePos;
					tool.brush.drawTempLine(shapePos.x, shapePos.y, shapeEndPos.x, shapeEndPos.y, tool.brush.colour, tool.brush.size, tool.brush.lineTip);
				}
				break;
		}
	} 
	// Unsure why this needs to be here
	else if(hasSynced === true) {
		ColourPicker.changeColour();
	}
}, false);

document.addEventListener("mousedown", function(evt) {
	canvas.className = "dragged";
	if(evt.button === 0) {
		Input.mouseDown = true;
		if(Input.mouseDown === true && hasSynced === true &&
		currentlyVoting === false && currentlySaving === false) {
			// Located in colour-picker2.js
			if(ColourPicker.canMoveTintPointer === false) {
				if(Util.isMouseOnCanvas(ColourPicker.getTintContext().canvas)) {
					ColourPicker.canMoveTintPointer = true;
					canDraw = false;
				}  else if(Util.isMouseOnCanvas(ColourPicker.getHueContext().canvas)) {
					ColourPicker.canMoveHuePointer = true;
					canDraw = false;
				} 
			}
			// To stop drawing when dragging tint pointer
			if(canDraw === false) {
				if(Util.isMouseOnCanvas(canvas)) {
					canDraw = true;
				}
			}
			ColourPicker.changeColour();
			if(canDraw === true) {
				// Handle what tools do on mouse down	
				switch(tool.getBrushType()) {
					case ToolTypes.FREE_ROAM:
						tool.brush.draw();
						break;
					case ToolTypes.GRADIENT_BRUSH:
						tool.brush.gradientTimer = 0;
						tool.brush.gradientDraw();
						break;
					case ToolTypes.RAINBOW_BRUSH:
						tool.brush.rainbowDraw();
						break;
					case ToolTypes.DROPPER:
						tool.dropper.updateColour();
						break;
					case ToolTypes.ERASER:
						tool.brush.erase();
						break;
					case ToolTypes.SQUARE_BRUSH:
						tool.brush.drawSquare();
						break;
					case ToolTypes.TEXT_TOOL:
						readyForText = true;
						textPos = Input.mousePos;
						break;
					case ToolTypes.SHAPE_TOOL:
					case ToolTypes.LINE_TOOL:
						if(tool.shapeTool.readyToDraw === false) {
							tool.shapeTool.readyToDraw = true;
							shapePos = Input.mousePos;
						}
						break;
				}
			}
		}
	}
	});

document.addEventListener("mouseup", function(evt) {
	canvas.className = ""; // Reverts to no classname
	if(evt.button === 0) {
		Input.mouseDown = false;
		if(tool.shapeTool.sizingReady === true && currentlyVoting === false && currentlySaving === false) {
			pointerContext.clearRect(0 ,0 , pointerCanvas.width, pointerCanvas.height);
			canvasRect = canvas.getBoundingClientRect();
			switch(tool.getBrushType()) {
				case ToolTypes.SHAPE_TOOL:
					var shapeData = {
						'x': shapePos.x - canvasRect.left,
						'y': shapePos.y - canvasRect.top,
						'endX': shapeEndPos.x - canvasRect.left,
						'endY': shapeEndPos.y - canvasRect.top,
						'colour': tool.brush.colour
					}

					// Only work if shapes
					if(tool.shapeTool.readyToDraw === true) {
						tool.shapeTool.draw(shapeData);
					}
					break;
				case ToolTypes.LINE_TOOL:
					var lineData = {
						'x': shapePos.x - canvasRect.left,
						'y': shapePos.y - canvasRect.top,
						'endX': shapeEndPos.x - canvasRect.left,
						'endY': shapeEndPos.y - canvasRect.top,
						'lineTip': tool.brush.lineTip,
						'size': tool.brush.size,
						'colour': tool.brush.colour
					};
					tool.brush.drawShapeLine(lineData['x'], lineData['y'], lineData['endX'], lineData['endY'], lineData['colour'], lineData['size'], lineData['lineTip']);
					socket.emit('draw line', lineData);
					tool.shapeTool.sizingReady = false;
					break;
			}
			tool.shapeTool.readyToDraw = false;
		}
		tool.shapeTool.readyToDraw = false;
		// Located in colour-picker2.js
		if(ColourPicker.canMoveTintPointer === true) {
			ColourPicker.canMoveTintPointer = false;
		}

		if(ColourPicker.canMoveHuePointer === true) {
			ColourPicker.canMoveHuePointer = false;
		}

		if(canDraw === true) {
			canDraw = false;
		}
	}
});

/*------------------------------------------
	Events (Keys)
------------------------------------------*/
document.body.addEventListener("keydown", function(e) {
	if(readyForText === true && currentlyVoting === false && currentlySaving === false) {
		tool.textTool.textToRender = document.getElementById('text-tool-text').value;	
		tool.textTool.drawTempText(textPos.x, textPos.y, tool.textTool.textFont, tool.brush.colour, tool.textTool.textToRender);
		document.getElementById('text-tool-text').focus();
		if(e.keyCode == 13) {
			applyText();
		}
	}
});
 
document.body.addEventListener("keyup", function(e) {
	if(readyForText === true && currentlyVoting === false && currentlySaving === false) {
		tool.textTool.textToRender = document.getElementById('text-tool-text').value;	
		tool.textTool.drawTempText(textPos.x, textPos.y, tool.textTool.textFont, tool.brush.colour, tool.textTool.textToRender);
	}
});

/*------------------------------------------
	Events (onChange)
------------------------------------------*/
// Change fonts
document.getElementById('fontSel').addEventListener('change', function(evt){
	tool.textTool.changeFont();
});

/*------------------------------------------
	Events (Click) - Tools
------------------------------------------*/
document.getElementById('clearCanvas').addEventListener('click', function(evt){
	clearCanvas();
});

/* Brushes */
document.getElementById('brushes').addEventListener('click', function(evt){
	tool.brush.setBrushType('freeroam');
	resetCategoryFlags();
	resetSubCategoryFlags();
	this.className = "button bselect tool";
	document.getElementById('brush-settings').className = "inline-block";

	var brush = document.getElementById('brush');
	brush.className = "button bselect tool";
	
	document.getElementById('canvas').style.cursor = "none";
	document.getElementById('pointer-canvas').style.cursor = "none";
});

document.getElementById('brush').addEventListener('click', function(evt){
	resetSubCategoryFlags();
	tool.brush.setBrushType('freeroam');
	this.className = "button bselect tool";
	document.getElementById('brush-settings').className = "inline-block";

	document.getElementById('canvas').style.cursor = "none";
	document.getElementById('pointer-canvas').style.cursor = "none";
});

document.getElementById('square-brush').addEventListener('click', function(evt){
	resetSubCategoryFlags();
	tool.brush.setBrushType('square-brush');
	this.className = "button bselect tool";
	document.getElementById('brush-settings').className = "inline-block";

	document.getElementById('canvas').style.cursor = "none";
	document.getElementById('pointer-canvas').style.cursor = "none";
});

document.getElementById('gradient-brush').addEventListener('click', function(evt){
	resetSubCategoryFlags();
	tool.brush.setBrushType('gradient-brush');
	this.className = "button bselect tool";
	document.getElementById('brush-settings').className = "";
	document.getElementById('rainbow-settings').className = "inline-block";

	document.getElementById('canvas').style.cursor = "none";
	document.getElementById('pointer-canvas').style.cursor = "none";
});

document.getElementById('rainbow-brush').addEventListener('click', function(evt){
	resetSubCategoryFlags();
	tool.brush.setBrushType('rainbow-brush');
	this.className = "button bselect tool";
	document.getElementById('brush-settings').className = "";
	document.getElementById('rainbow-settings').className = "inline-block";

	document.getElementById('canvas').style.cursor = "none";
	document.getElementById('pointer-canvas').style.cursor = "none";
});

document.getElementById('line-tool').addEventListener('click', function(evt){
	resetSubCategoryFlags();
	tool.brush.setBrushType('line');
	this.className = "button bselect tool";
	document.getElementById('canvas').style.cursor = "pointer";
	document.getElementById('pointer-canvas').style.cursor = "pointer";
	document.getElementById('brush-settings').className = "";
	document.getElementById('line-settings').className = "inline-block";
});

document.getElementById('eraser').addEventListener('click', function(evt){
	resetSubCategoryFlags();
	tool.brush.setBrushType('eraser');
	this.className = "button bselect tool";
	document.getElementById('brush-settings').className = "";
	document.getElementById('canvas').style.cursor = "none";
	document.getElementById('pointer-canvas').style.cursor = "none";
});


/* Shape tool */
document.getElementById('shape-tool').addEventListener('click', function(evt){
	resetCategoryFlags();
	resetSubCategoryFlags();
	tool.brush.setBrushType('shape');
	tool.shapeTool.setShapeType(document.getElementById('shapeRect'), 'rectangle');
	this.className = "button bselect tool";
	document.getElementById('canvas').style.cursor = "pointer";
	document.getElementById('pointer-canvas').style.cursor = "pointer";
	document.getElementById('shape-settings').className = "";
});

document.getElementById('shapeRect').addEventListener('click', function(evt){
	resetSubCategoryFlags();
	tool.shapeTool.setShapeType(this, 'rectangle');
	document.getElementById('shape-settings').className = "inline-block";
});

document.getElementById('shapeCircle').addEventListener('click', function(evt){
	resetSubCategoryFlags();
	tool.shapeTool.setShapeType(this, 'circle');
	document.getElementById('shape-settings').className = "inline-block";
});

document.getElementById('shapePentagon').addEventListener('click', function(evt){
	resetSubCategoryFlags();
	tool.shapeTool.setShapeType(this, 'pentagon');
	document.getElementById('shape-settings').className = "inline-block";
});

document.getElementById('shapeHexagon').addEventListener('click', function(evt){
	resetSubCategoryFlags();
	tool.shapeTool.setShapeType(this, 'hexagon');
	document.getElementById('shape-settings').className = "inline-block";
});

document.getElementById('text-tool').addEventListener('click', function(evt){
	resetCategoryFlags();
	resetSubCategoryFlags();	
	tool.brush.setBrushType('text');
	this.className = "button bselect tool";
	document.getElementById('canvas').style.cursor = "text";
	document.getElementById('pointer-canvas').style.cursor = "text";
	document.getElementById('text-settings').className = "";
});

document.getElementById('colourDrop').addEventListener('click', function(evt){
	tool.brush.setBrushType('dropper');
	resetCategoryFlags();
	resetSubCategoryFlags();
	this.className = "button bselect tool";
	document.getElementById('pointer-canvas').style.cursor = "crosshair";
	document.getElementById('dropper-settings').className = "";
});

document.getElementById('saveCanvas').addEventListener('click', function(evt){
	window.open(canvas.toDataURL());
});

function resetCategoryFlags() {
	tool.textTool.textToRender = "";
	readyForText = false;
	// Tools
	document.getElementById('brushes').className = "button tool";
	document.getElementById('colourDrop').className = "button tool";
	//document.getElementById('grid-tool').className = "button tool";
	document.getElementById('text-tool').className = "button tool";
	document.getElementById('shape-tool').className = "button tool";
	pointerContext.clearRect(0, 0, pointerCanvas.width, pointerCanvas.height);
}

function resetSubCategoryFlags(){
	// Brushes
	document.getElementById('brush').className = "button tool";
	document.getElementById('square-brush').className = "button tool";
	document.getElementById('gradient-brush').className = "button tool";
	document.getElementById('rainbow-brush').className = "button tool";
	document.getElementById('line-tool').className = "button tool";
	document.getElementById('eraser').className = "button tool";

	// Shapes
	document.getElementById('shapeRect').className = "button tool";
	document.getElementById('shapeCircle').className = "button tool";
	document.getElementById('shapePentagon').className = "button tool";
	document.getElementById('shapeHexagon').className = "button tool";

	// Tool Settings
	document.getElementById('brush-settings').className = "invisible";
	document.getElementById('rainbow-settings').className = "invisible";
	document.getElementById('dropper-settings').className = "invisible";
	document.getElementById('text-settings').className = "invisible";
	document.getElementById('shape-settings').className = "invisible";
	document.getElementById('line-settings').className = "invisible";

	// Clear brush outline
	pointerContext.clearRect(0, 0, pointerCanvas.width, pointerCanvas.height);
}