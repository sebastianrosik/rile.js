#!/usr/bin/env node
var HOST = 'localhost',
	PORT = 8080;

var express = require('express'),
	server  = express();

server.configure(function(){
	server.use(express.static(__dirname));
});

server.listen(PORT, HOST);

console.log('Static server running on http://' + HOST + ':' + PORT );