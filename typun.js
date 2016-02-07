var text = document.getElementById('text');
var type_area = document.getElementById('type_area');

// Text caret position
var position = 0;

var data = '';
var error_data = '';


var prev_position = 0;
function redraw() {
	if (paragraphs.length === 0 && data.length > 0) {
		var textChunks = splitIntoParagraphs(data);
		var frag = document.createDocumentFragment();
		for (var i = 0; i < textChunks.length; i++) {
			var textChunk = textChunks[i];
			var div = document.createElement('p');
			div.className = 'paragraph';
			div.textContent = textChunks[i];
			frag.appendChild(div);
			paragraphs.push({
				text: textChunk,
				elem: div
			});
		}
		text.textContent = '';
		text.appendChild(frag);
	}

	var charIndex = 0;
	for (var i = 0; i < paragraphs.length; i++) {

		var paragraph = paragraphs[i];
		var paragraphElem = paragraph.elem;
		if (position >= charIndex + paragraph.text.length) {
			setState(paragraphElem, 'done')
		} else if (position >= charIndex) {
			var mid = position - charIndex;
			paragraphElem.innerHTML = doneElem(paragraph.text.slice(0, mid)) + delElem(error_data) + undoneElem(paragraph.text.slice(mid));
			setState(paragraphElem, 'undone');
		} else {
			setState(paragraphElem, 'undone');
		}

		charIndex += paragraph.text.length;
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
	advance(5);
}, false);


function addErrorWord(wordPair, char) {
	var errors = document.getElementById('errors');

	if (errors.childNodes.length === 0) {
		var p = document.createElement('p');
		p.textContent = "Words with typos:";
		errors.appendChild(p);
	}

	var li = document.createElement('li');
	if (wordPair.start) {
		li.appendChild(document.createTextNode(wordPair.start));
	}
	if (wordPair.end) {
		var del = document.createElement('del');
		del.textContent = char;
		li.appendChild(del);
		var ins = document.createElement('ins');
		ins.textContent = wordPair.end[0];
		li.appendChild(ins);
		if (wordPair.end.length >= 2) {
			li.appendChild(document.createTextNode(wordPair.end.slice(1)));
		}
	}
	errors.appendChild(li);

	speak(wordPair.start + wordPair.end, {voice: "Alex"});
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

document.body.addEventListener('keypress', function(e) {
	if (e.metaKey)
		return;
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
}, false);

document.body.addEventListener('keydown', function(e) {
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
	} else if (code === 68 && e.ctrlKey) { // Ctrl-D
		addToDeck(currentWord(data, position));
	} else if (code === 39) {
		advance(1);
	} else if (code === 37) {
		if (error_data) {
			error_data = error_data.slice(0, -1);
		} else {
			position--;
		}
		redraw();
	} else if (code === 78 && (e.ctrlKey || e.altKey)) { // Ctrl-N
		speakClauseAt(position, true);
		e.preventDefault();
	}
}, false);


function advance(n) {
	position += n;

	// FIXME: Need a better clause splitters
	if (position < data.length) {
		var currentChar = data[position - 1];
		if (!/[\w\d'’ \t-]/.test(currentChar)) {
			speakClauseAt(position, false);
		}
	}

	redraw();
}


function sendChar(char) {
	var expectedChar = data[position];
	if (fuzzyMatch(expectedChar, char)) {
		if (error_data === '') {
			advance(1);
		} else {
			error_data += char;
		}
	} else {
		if (error_data === '') {
			addErrorWord(currentWord(data, position), char);
		}
		error_data += char;
	}
	redraw();
}

function fuzzyMatch(expected, actual) {
	if (expected === actual) {
		return true;
	}

	var regEmptySpace = /\s/;
	if (regEmptySpace.test(expected) && regEmptySpace.test(actual)) {
		return true;
	}

	if ((expected === '“' || expected === '”') && actual === '"') {
		return true;
	}
	if ((expected === '’' || expected === '‘') && actual === '\'') {
		return true;
	}

	if (expected === "…" && actual === ".") {
		return true;
	}

	return false;
}


function completed() {
	var h1 = document.createElement('h1');
	h1.textContent = 'You did it!';
	document.body.appendChild(h1);
}

var paragraphs = [];

function initialize() {
	data = cleanupText(type_area.value);
	paragraphs = [];
	position = 0;
	error_data = '';

	prev_position = 0;
	redraw();
}

function splitIntoParagraphs(text) {
	var parts = [];
	var wordsRegEx = /(\s*\n)+/g;
	var lastIndex = 0;
	var result;

	while((result = wordsRegEx.exec(text)) !== null) {
		var index = result.index;
		var data = result[0];
		if (index > 0 && lastIndex !== index) {
			parts.push(text.slice(lastIndex, index + data.length));
		}

		lastIndex = index + data.length;
	}

	return parts;
}


function cleanupText(text) {
	return text
		//.replace(/[.]([A-Z])/g, '. $1')
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


function stopKeydownPropagation(element) {
	function stop(e) {
		e.stopPropagation();
	}

	element.addEventListener("keydown", stop, true);
	element.addEventListener("keypress", stop, true);
}


var lastSpokenClausePos = 0;
function speakClauseAt(charPos, force, options) {
	var text = data.slice(charPos);

	var trimmed = text.replace(/^[\s\n]+/, "");

	var trimmedPos = charPos + (text.length - trimmed.length);
	if (!force && trimmedPos === lastSpokenClausePos) {
		return;
	}
	lastSpokenClausePos = trimmedPos;

	var match = text.match(/[\w '’-]+/); // Fails on "5.4$"
	//var match = text.match(/[\s\n.,:;?!—]+(.+?)[.,:;?!—][\s\n.,:;?!—]/);
	var clause = "";
	if (match && match[0]) {
		clause = match[0];
		speak(clause, options);
	}
}

var voicesMap = null;

function getVoices() {
	var voicesMap = {};
	var googleChromeDefault = null;
	var nativeDefault = null;
	console.log(window.speechSynthesis.getVoices());
	window.speechSynthesis.getVoices().forEach(function(voice) {
		if (voice.lang === "en-US") {
			voicesMap[voice.name] = voice;

			if (voice.name === "Google US English") {
				nativeDefault = googleChromeDefault = voice;
			}

			if (voice.default) {
				nativeDefault = voice;
			}
		}
	});
	var defaultVoice = googleChromeDefault || nativeDefault;
	if (defaultVoice) {
		voicesMap["default"] = defaultVoice;
		return voicesMap
	}
	return null;
}


function speak(text, options) {
	if (!options)
		options = {};

	var msg = new SpeechSynthesisUtterance();

	if (!voicesMap) {
		voicesMap = getVoices();
	}

	var voice = options.voice ? voicesMap[options.voice] : (voicesMap && voicesMap.default);
	if (voice) {
		msg.voice = voice;
	}
	msg.voiceURI = 'native';

	msg.volume = options.volume || 1; // 0 to 1
	//msg.rate = options.rate || 1; // 0.1 to 10
	//msg.pitch = options.pitch || 1; //0 to 2
	msg.text = text;
	msg.lang = 'en-US';

	speechSynthesis.speak(msg);

	if (voice) {
		console.info(voice.name + ": " + text);
	} else {
		console.warn("SpeechSynthesisUtterance doesn't work :(");
	}
}


function rand(min, max) {
	var diff = max - min;
	return Math.round(min + Math.random() * diff);
}

stopKeydownPropagation(type_area);
stopKeydownPropagation(edit);
