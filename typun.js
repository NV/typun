var text = document.getElementById('text');
var type_area = document.getElementById('type_area');

var position = 0;
var data = '';
var error_data = '';

var CHUNK_SIZE = 100;
var chunks = [];


function splitOnChunks(data, size) {
	var chunks = [];
	var start = 0;
	var length = data.length;
	while (start < length) {
		chunks.push(data.slice(start, start + size));
		start += size;
	}
	return chunks;
}

var chunkElems = [];
var prev_position = 0;
function redraw() {
	if (chunks.length === 0 && data.length > 0) {
		chunks = splitOnChunks(data, CHUNK_SIZE);
		var frag = document.createDocumentFragment();
		for (var i = 0; i < chunks.length; i++) {
			var span = document.createElement('span');
			span.className = 'chunk';
			span.textContent = chunks[i];
			frag.appendChild(span);
			chunkElems.push(span);
		}
		text.textContent = '';
		text.appendChild(frag);
	}

	var doneCount = Math.floor(position / CHUNK_SIZE);
	var doneReminder = position % CHUNK_SIZE;
	for (var i = 0; i < chunkElems.length; i++) {
		var chunkElem = chunkElems[i];
		if (i < doneCount) {
			setState(chunkElem, 'done')
		} else if (i === doneCount) {
			var start = CHUNK_SIZE * i;
			var mid = start + doneReminder;
			var end = CHUNK_SIZE * (i + 1);
			chunkElem.innerHTML = doneElem(data.slice(start, mid)) + delElem(error_data) + undoneElem(data.slice(mid, end));
		} else {
			setState(chunkElem, 'undone');
		}
	}

	prev_position = position;
}

function doneElem(text) {
	if (text) {
		return '<span class="done">' + text + '</span>';
	} else {
		return '';
	}
}
function undoneElem(text) {
	if (text) {
		return '<span class="undone">' + text + '</span>';
	} else {
		return '';
	}
}
function delElem(text) {
	if (text) {
		return '<del>' + text + '</del>';
	} else {
		return '';
	}
}

function setState(elem, state) {
	if (state === 'done') {
		elem.classList.remove('undone');
		elem.classList.add(state);
	} else {
		elem.classList.remove('done');
		elem.classList.add(state);
	}
}

window.addEventListener('load', function(e) {
	initialize();
	text.focus();
}, false);


function addErrorWord(item) {
	var errors = document.getElementById('errors');
	var li = document.createElement('li');
	if (item.start) {
		li.appendChild(document.createTextNode(item.start));
	}
	if (item.end) {
		var del = document.createElement('del');
		del.textContent = item.end[0];
		li.appendChild(del);
		if (item.end.length >= 2) {
			li.appendChild(document.createTextNode(item.end.slice(1)));
		}
	}
	errors.appendChild(li);
}

function addToDeck(item) {
	var li = document.createElement('li');
	li.textContent = item.start + item.end;
	deck.appendChild(li);
}


function currentWord(text, position) {
	var startStr = text.slice(0, position);
	var startMatch = startStr.match(/[\w'’-]+$/);
	var endStr = text.slice(position);
	var endMatch = endStr.match(/^[\w'’-]+/) || '';
	return {
		start: startMatch ? startMatch[0] : '',
		end: endMatch ? endMatch[0] : ''
	};
}


function isLatinChar(code) {
	return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function lastNonWord(string, startPosition) {
	var i = startPosition || string.length - 1;
	var END_LATIN = isLatinChar(string[i]);
	while (i) {
		i--;
		var code = string.charCodeAt(i);
		if (!isLatinChar(code)) {
			if (END_LATIN) {
				break;
			} else {

			}
		} else {
			END_LATIN = true;
		}
	}
	if (i > 0) {
		i++;
	}
	return i;

}

text.addEventListener('keypress', function(e) {
	switch (e.which) {
		case 13: //ENTER
			sendChar('\n');
			break;
		default:
			sendChar(String.fromCharCode(e.which));
			break;
	}
	e.preventDefault();
	e.stopPropagation();
}, true);

text.addEventListener('keydown', function(e) {
//	console.log('KEYDOWN', e.which);
	var code = e.which;
	if (code === 8) {
		if (e.altKey) {
			if (error_data) {
				var index = lastNonWord(error_data, position);
				error_data = error_data.slice(0, index);

				//FIXME: This looks overcomplicated.
				if (index === 0 && isLatinChar(data.charCodeAt(position - 1))) {
					position = lastNonWord(data, position);
				}
			} else {
				position = lastNonWord(data, position);
			}
		} else {
			if (error_data) {
				error_data = error_data.slice(0, -1);
			} else if (position > 0) {
				position--;
			}
		}

		redraw();

		if (position === data.length) {
			completed();
		}
		e.preventDefault();
		e.stopPropagation();
	} else if (code === 68 && e.ctrlKey) {
		addToDeck(currentWord(data, position));
	} else if (code === 39) {
		position++;
		redraw();
	} else if (code === 37) {
		if (error_data) {
			error_data = error_data.slice(0, -1);
		} else {
			position--;
		}
		redraw();
	}
}, true);


function sendChar(char) {
	var expectedChar = data[position];
	if (fuzzyMatch(expectedChar, char)) {
		if (error_data === '') {
			position++;
		} else {
			error_data += char;
		}
	} else {
		if (error_data === '') {
			addErrorWord(currentWord(data, position));
		}
		error_data += char;
	}
	redraw();
}

function fuzzyMatch(expected, actual) {
	if (expected === actual) {
		return true;
	}
	if ((expected === '“' || expected === '”') && actual === '"') {
		return true;
	}
	if (expected === '’' && actual === '\'') {
		return true;
	}
	return false;
}


function completed() {
	var h1 = document.createElement('h1');
	h1.textContent = 'You did it!';
	document.body.appendChild(h1);
}

function initialize() {
	data = cleanupText(type_area.value);
	position = 0;
	error_data = '';
	chunks = [];
	chunkElems = [];
	prev_position = 0;
	redraw();
}

function cleanupText(text) {
	return text
		.replace(/[.]([A-Z])/g, '. $1')
		.replace(/\r\n/g, '\n');
}

var edit = document.getElementById('edit');
edit.onclick = function() {
	var isOn = !!edit._on;
	if (isOn) {
		edit.textContent = 'Edit';
		document.body.classList.add('edit-off');
		document.body.classList.remove('edit-on');
		initialize();
	} else {
		edit.textContent = 'Done';
		document.body.classList.add('edit-on');
		document.body.classList.remove('edit-off');
		requestAnimationFrame(function() {
			type_area.focus();
			type_area.select();
		});
	}
	text.contentEditable = !isOn;
	edit._on = !isOn;
};
