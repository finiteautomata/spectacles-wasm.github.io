(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],{

/***/ "./index.js":
/*!******************!*\
  !*** ./index.js ***!
  \******************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var hf_tokenizers_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! hf-tokenizers-wasm */ \"./node_modules/hf-tokenizers-wasm/hf_tokenizers_wasm.js\");\n/* harmony import */ var _tensorflow_tfjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @tensorflow/tfjs */ \"./node_modules/@tensorflow/tfjs/dist/index.js\");\n/* harmony import */ var _tensorflow_tfjs_converter__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @tensorflow/tfjs-converter */ \"./node_modules/@tensorflow/tfjs-converter/dist/index.js\");\n\n// Import @tensorflow/tfjs or @tensorflow/tfjs-core\n\n\n\nclass Tokenizer {\n  constructor(json) {\n    this.tokenizer = new hf_tokenizers_wasm__WEBPACK_IMPORTED_MODULE_0__[\"TokenizerWasm\"](json);\n  }\n\n  static from_pretrained(name) {\n    return fetch(`https://huggingface.co/${name}/resolve/main/tokenizer.json`)\n      .then(response => response.text())\n      .then(json => new Tokenizer(json));\n  }\n\n  encode(text) {\n    return this.tokenizer.encode(text);\n  }\n}\n\nconst loadModel = async () => {\n    try{\n        const model = await Object(_tensorflow_tfjs_converter__WEBPACK_IMPORTED_MODULE_2__[\"loadGraphModel\"])(\"https://raw.githubusercontent.com/finiteautomata/ner-leg-no-lfs/main/model.json\");\n        return model;\n    }\n    catch(error){\n        console.log(\"There was an error loading the model!\")\n        console.log(error);\n        throw error;\n    }\n}\n\n/// TODO ESTO ESTA A MANO, ES LO QUE HAY\nconst maxLength = 512;\nconst PAD_IDX = 0;\nconst CLS_IDX = 101;\nconst SEP_IDX = 102;\n\nconst pad = (inputIds, attentionMask) => {\n    inputIds = [CLS_IDX, ...inputIds, SEP_IDX];\n    attentionMask = [0, ...attentionMask, 0];\n\n    if (inputIds.length > maxLength) {\n        inputIds = inputIds.slice(0, maxLength);\n        attentionMask = attentionMask.slice(0, maxLength);\n    }\n    else {\n        let dif = maxLength - inputIds.length;\n        let padding = Array(dif).fill(0);\n        inputIds = Array.from(inputIds).concat(padding);\n        attentionMask = Array.from(attentionMask).concat(padding);\n    }\n    return {inputIds, attentionMask};\n}\n\n\nconst predict = (model, encoding) => {\n\n    let {inputIds, attentionMask} = pad(encoding.input_ids, encoding.attention_mask);\n    inputIds = _tensorflow_tfjs__WEBPACK_IMPORTED_MODULE_1__[\"tensor\"](\n        inputIds, undefined, \"int32\"\n    );\n    attentionMask = _tensorflow_tfjs__WEBPACK_IMPORTED_MODULE_1__[\"tensor\"](\n        attentionMask, undefined, \"int32\"\n    );\n\n    let modelInput = {\n        \"input_ids\": inputIds.reshape([1, -1]),\n        \"attention_mask\": attentionMask.reshape([1, -1]),\n    }\n\n    return model.predict(modelInput).squeeze(0);\n}\n\nconst id2label = [\n    \"O\",\n    \"B-marker\",\n    \"I-marker\",\n    \"B-reference\",\n    \"I-reference\",\n    \"B-term\",\n    \"I-term\"\n];\n\n\nconst normalize = (line) => {\n    let ret = line.replaceAll(\"\\t\", \" \");\n    ret = ret.replaceAll(\"  \", \" \");\n    ret = ret.replaceAll(\"“\", \"\\\"\");\n    ret = ret.replaceAll(\"”\", \"\\\"\");\n    return ret;\n}\n\n\nconst loadContract = async (url) => {\n    let contractResponse = await fetch(url);\n    let contract = await contractResponse.text();\n\n    return contract;\n}\n\nconst tokensToWord = (tokens) => {\n    let word = \"\";\n    for (let i = 0; i < tokens.length; i++) {\n        if (i == 0) {\n            word = tokens[i];\n        } else {\n            word += tokens[i].slice(2);\n        }\n    }\n    return word;\n}\n\nconst decode = (prediction, tokenizedInput) => {\n    // Decode the prediction\n    // First, get the prediction for each token\n\n    let tokenPreds = prediction.argMax(1).arraySync();\n    let wordIds = [-1, ...tokenizedInput.word_ids];\n    let currentWordId = null;\n\n    let currentTokens = [];\n    let currentLabel = null;\n\n    let wordAndLabels = [];\n\n    for (let i = 1; (i < prediction.shape[0]) && (i < tokenizedInput.tokens.length); ++i) {\n        // This is because unaligned tokenization\n        let token = tokenizedInput.tokens[i-1];\n        let pred = tokenPreds[i];\n        let wordId = wordIds[i];\n\n        if (wordId !== currentWordId) {\n            // Starts new word\n            if (currentWordId !== null)\n                wordAndLabels.push([tokensToWord(currentTokens), currentLabel]);\n            currentWordId = wordId;\n            currentLabel = id2label[pred];\n            currentTokens = [token];\n        } else {\n            currentTokens.push(token);\n        }\n    }\n\n    if (currentWordId !== null)\n        wordAndLabels.push([tokensToWord(currentTokens), currentLabel]);\n\n    return wordAndLabels;\n}\n\nconst bioToSegments = (wordAndLabels) => {\n\n    let segments = [];\n    let currentWords = [];\n    let currentType = \"\";\n\n    for (let [word, label] of wordAndLabels) {\n        if (label === 'O'){\n            if (currentType == \"text\")\n                currentWords.push(word)\n            else {\n                if (currentWords.length > 0)\n                    segments.push({\n                        \"text\": currentWords.join(\" \"),\n                        \"type\": currentType\n                    })\n                currentWords = [word]\n                currentType = \"text\"\n            }\n        }\n        else if(label[0] === 'B') {\n            if (currentWords.length > 0)\n                segments.push({\n                    \"text\": currentWords.join(\" \"),\n                    \"type\": currentType\n                })\n            currentWords = [word]\n            currentType = label.slice(2)\n        }\n        else  {\n            if (currentType === label.slice(2))\n                currentWords.push(word);\n            else {\n                if (currentWords.length > 0)\n                    segments.push({\n                        \"text\": currentWords.join(\" \"),\n                        \"type\": currentType\n                    })\n                currentWords = [word]\n                currentType = label.slice(2)\n            }\n        }\n    }\n    if (currentWords.length > 0)\n        segments.push({\n            \"text\": currentWords.join(\" \"),\n            \"type\": currentType\n        })\n\n    return segments\n};\n\nasync function main() {\n\n    let tokenizer = await Tokenizer.from_pretrained(\"finiteautomata/ner-leg\");\n\n    console.log(\"Loading model...\");\n    let model = await loadModel();\n    console.log(\"done!\");\n    //let url = \"https://raw.githubusercontent.com/finiteautomata/wasm-spectacles/master/assets/contracts/flextronics.txt\";\n    let url = \"https://raw.githubusercontent.com/finiteautomata/wasm-spectacles/master/assets/contracts/0000009984-20-000109%3Aexh102form8-kamendment.txt\";\n    let contract = await loadContract(url);\n\n    let paragraphs = contract.split(\"\\n\").map(normalize).filter(line => line.length > 0);\n\n    console.log(\"Tokenizing\");\n    let encodedParagraphs = paragraphs.map(paragraph => tokenizer.encode(paragraph));\n    console.log(\"done!\");\n\n    document.tokenizer = tokenizer;\n    document.contract = contract;\n    document.paragraphs = paragraphs;\n    document.encodedParagraphs = encodedParagraphs;\n\n    console.log(\"Predicting\");\n    let textDiv = document.getElementById(\"app-text\");\n\n    for (let encoding of encodedParagraphs) {\n        let prediction = predict(model, encoding);\n        let decoded = decode(prediction, encoding);\n        let segments = bioToSegments(decoded);\n\n        let newP = document.createElement(\"p\");\n        newP.innerHTML = segments.map(segment => {\n            if (segment.type == \"text\")\n                return segment.text;\n            else\n                return `<span class=\"${segment.type}\">${segment.text}</span>`;\n        }).join(\" \");\n\n        textDiv.appendChild(newP);\n    }\n    console.log(\"done!\");\n}\n\nmain();\n\n//# sourceURL=webpack:///./index.js?");

/***/ }),

/***/ 0:
/*!****************************!*\
  !*** node-fetch (ignored) ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("/* (ignored) */\n\n//# sourceURL=webpack:///node-fetch_(ignored)?");

/***/ }),

/***/ 1:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("/* (ignored) */\n\n//# sourceURL=webpack:///util_(ignored)?");

/***/ }),

/***/ 2:
/*!************************!*\
  !*** crypto (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("/* (ignored) */\n\n//# sourceURL=webpack:///crypto_(ignored)?");

/***/ }),

/***/ 3:
/*!********************************!*\
  !*** string_decoder (ignored) ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("/* (ignored) */\n\n//# sourceURL=webpack:///string_decoder_(ignored)?");

/***/ }),

/***/ 4:
/*!********************************!*\
  !*** string_decoder (ignored) ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("/* (ignored) */\n\n//# sourceURL=webpack:///string_decoder_(ignored)?");

/***/ }),

/***/ 5:
/*!********************!*\
  !*** fs (ignored) ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("/* (ignored) */\n\n//# sourceURL=webpack:///fs_(ignored)?");

/***/ })

}]);