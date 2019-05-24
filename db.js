"use strict";
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'todo'
});

var connect = function(){
    connection.connect(function(error){
        if(error){
            console.error('error connecting: ' + error.stack);
            return;
        }
        console.log('connected as id ' + connection.threadId);
    });
    return connection;
};

module.exports = connect