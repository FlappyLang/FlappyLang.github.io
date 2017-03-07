/**
 * Created by mihaisandor on 12/2/17.
 */
'use strict';
const express = require('express'); // Express dependencies
const app = express(); // Call app express
const http = require('http').Server(app); // HTTP dependencies
const path = require('path'); // Path dependencies

app.use(express.static(path.join(__dirname, 'public/'))); // Static path 'public'
app.set('port', (process.env.PORT || 3000)); // Port HTTP Server

// Router '/' for Welcome page. (GET REQUEST)

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/Welcome.html'));
});

// Router '/documentation' for Documentation page. (GET REQUEST)

app.get('/documentation', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/Documentation.html'));
});

// Router '/getting-started' for Getting Started page. (GET REQUEST)

app.get('/getting-started', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/GettingStarted.html'));
});

// Router '/source-code' for Source Code page. (GET REQUEST)

app.get('/source-code', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/SourceCode.html'));
});

// Router '/contributing' for Contributing page. (GET REQUEST)

app.get('/contributing', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/Contributing.html'));
});

// Router '/about' for About page. (GET REQUEST)

app.get('/about', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/About.html'));
});

// Router '/flappylang-js' for Flappy-Lang page. (GET REQUEST)

app.get('/flappylang-js', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/FlappyJS.html'));
});

// Router '/compiler' for Compiler page. (GET REQUEST)

app.get('/compiler', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/Compiler.html'));
});

// Router '/documentation-language' for Documentation FlappyLang-JS (GET REQUEST)

app.get('/documentation-language', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/DocumentationLanguage.html'));
});

// Router '/core-language' for Core Language page. (GET REQUEST)

app.get('/core-language', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/CoreLanguage.html'));
});

// Router '/flappylang-js' for Flappy-Lang page. (GET REQUEST)

app.get('/flappylang-js', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/FlappyJS.html'));
});

// Router '/compiler' for Compiler page. (GET REQUEST)

app.get('/compiler', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/Compiler.html'));
});

// Router '/documentation-language' for Documentation FlappyLang-JS (GET REQUEST)

app.get('/documentation-language', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/DocumentationLanguage.html'));
});

// Router '/core-language' for Core Language page. (GET REQUEST)

app.get('/core-language', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/CoreLanguage.html'));
});

// Open HTTP server and port.

http.listen(app.get('port'), function () {
  console.log('Open port ' + app.get('port')); // Print in console port.
});
