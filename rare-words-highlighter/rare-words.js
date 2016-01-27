// "the" -> 0
var wordsMap = (function(words) {
	var result = new Map;
	for (var i = 0, length = words.length; i < length; i++) {
		var word = words[i];
		result.set(word, i);
	}
	return result;
})(words);


function redraw() {
	var input_text = document.getElementById("input_text");
	var tokens = stringToTokens(input_text.value);
	render(tokens);
}


function stringToTokens(input) {
	var wordsRegEx = /[a-z'’-]+/ig;
	var tokens = [];
	var result;
	var lastIndex = 0;

	while((result = wordsRegEx.exec(input)) !== null) {
		var index = result.index;
		var data = result[0];
		if (index > 0 && lastIndex !== index) {
			tokens.push({
				isWord: false,
				data: input.slice(lastIndex, index),
				index: lastIndex
			});
		}

		tokens.push({
			isWord: true,
			data: data,
			index: index
		});
		lastIndex = index + data.length;
	}

	return tokens;
}


function render(tokens) {
	var domFragment = document.createDocumentFragment();
	var dictSize = wordsMap.size;

	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];
		var span = document.createElement("span");
		span.classList.add("token");

		if (!token.isWord) {
			span.classList.add("not-word");
			span.textContent = token.data;
		} else {
			var word = normalizeWord(token.data);
			var score = wordsMap.get(word);

			if (typeof score === "number") {
				span.classList.add("common");
				span.title = word + "\nScore: " + score;
				styleCommonWord(span, score, dictSize);
			} else {
				span.classList.add("rare");
				span.title = word + "\nScore: >10,000";
			}
		}

		span.textContent = token.data;
		domFragment.appendChild(span);
	}

	var output = document.getElementById("output");
	output.textContent = "";
	output.appendChild(domFragment);
}


function styleCommonWord(element, score, dictSize) {
	var greyness = 100 - (0.3 + 0.7 * (score / dictSize)) * 100;
	element.style.color = "hsl(0, 0%, "+ greyness +"%)";
}


// "isn't" -> "is"
function normalizeWord(word) {
	word = word.toLowerCase().replace(/’/g, "'");

	var pairs = {
		//"it's": "it",
		"isn't": "is",
		"doesn't": "does",
		"don't": "do",
		"didn't": "did",
		"won't": "will",
		"i'm": "am",
		"we're": "we",
		"shouldn't": "should",
		"you've": "you",
		"cannot": "can",

		"you're": "you",
		"we're": "we",
		"they're": "they"
	};

	if (pairs.hasOwnProperty(word)) {
		return pairs[word];
	}

	// Didn't
	word = word.replace(/n't$/, "");

	// it's
	// you'd
	word = word.replace(/'[sdt]$/, "");

	// you've
	// you'll
	word = word.replace(/'(?:ve|ll)$/, "");

	return word;
}


var input_text = document.getElementById("input_text");

input_text.addEventListener("input", function(e) {
	redraw();
});

document.addEventListener("DOMContentLoaded", function(e) {
	redraw();
});


function submitTrainData() {
	var train_data = document.getElementById("train_data");
	var data = train_data.value;
	var tokens = stringToTokens(data);

	var size = wordsMap.size;

	for (var i = tokens.length - 1; i >= 0; i--) {
		var token = tokens[i];
		if (!token.isWord) {
			continue;
		}
		var word = normalizeWord(token.data);

		var currentScore = wordsMap.get(word) || 0;
		wordsMap.set(word, currentScore === 0 ? size : Math.max(1, currentScore - 1));
	}

	redraw();
	train_data.value = "";
}