const express = require('express');
var cors = require('cors');
const db = require('./db');

var bodyParser = require("body-parser");
var jwt = require('jsonwebtoken');

var passport = require("passport");
var passportJWT = require("passport-jwt");

var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;

const database = db();

const app = express();

app.use(cors());

const port = 3000;

var jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = 'tasmanianDevil';

var strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
    console.log('payload received', jwt_payload);
    // usually this would be a database call:
    
    /*
    if (user) {
      next(null, {id: jwt_payload.id});
    } else {
      next(null, false);
    }
    */
    next(null, {id: jwt_payload.sub});
  });

passport.use(strategy);

app.use(passport.initialize());

app.use(bodyParser.urlencoded({
    extended: true
  }));
  
// parse application/json
app.use(bodyParser.json());


//sample
app.get('/todo/sample', (req,res) => {
    database.query(
        `SELECT * FROM items WHERE userId = 1`,
        (error, results) => {
            if(error){
                res.status(500).json({message: 'Error in fetching items'});
                return
            }

            res.json({todo: results});
        }
    )
});

app.get('/', (req, res) => {

    database.query('SELECT * FROM users', function(error, results, fields){
        
        console.log(error);
        console.log(results);
        console.log(fields);

        res.send('Hello World!')

    });

});

app.post('/login', (req, res) => {

    let username = req.body.username;
    let password = req.body.password;

    if(!username || !password){
        res.status(400).json({message: 'Missing parameters. "username" and "password" are required'});
        return
    }

    database.query(
        `SELECT * FROM users WHERE username= '${username}' and password = '${password}' LIMIT 1`,
        (error, results, fields) => {
            if(error){
                res.status(500).json({message: 'Server error'})
                return;
            }

            if(results.length == 0){
                res.status(404).json({message: 'No user found'});
                return
            }

            let user = results[0];

            var payload = {sub: user.id};
            var token = jwt.sign(
                payload, 
                jwtOptions.secretOrKey,
                {
                    expiresIn: '1 days',
                }
            );

            res.json({token: token});


        }
    )

});

app.use(passport.authenticate('jwt', {session: false}));

app.post('/todo', (req, res) => {

    let title = req.body.title;
    let isCompleted = req.body.isCompleted;

    if(!title || (typeof isCompleted === 'undefined')){
        res.status(400).json({message: 'Missing parameters. \'title\' and "isCompleted" are required'});
        return
    }

    if(typeof isCompleted !== "boolean"){
        res.status(400).json({message: '"isCompleted" should be boolean'});
        return
    }

    let user = req.user;

    database.query(
        `INSERT INTO items(title, isCompleted, userId) VALUES('${title}', ${isCompleted}, ${user.id})`,
        (error, results) => {
            if(error){
                res.status(500).json({message: 'Error inserting into database'});
                return
            }
            res.json({id: results.insertId});

        }
    )
});

app.get('/todo', (req, res) => {

    database.query(
        `SELECT * FROM items WHERE userId = ${req.user.id}`,
        (error, results) => {
            if(error){
                res.status(500).json({message: 'Error in fetching items'});
                return
            }

            res.json({todo: results});
        }
    )

});

app.get('/todo/:id', (req, res) => {

    let query = `SELECT * FROM items WHERE id=${req.params.id} AND userId=${req.user.id}`
    database.query(
        query,
        (error, results) => {
            if(error){
                console.error(error);
                res.status(400).json({message: 'Error in getting item'});
                return;
            }else if(results.length == 0){
                res.status(404).json({message: 'Todo item not found'});
                return;
            }
            res.json(results[0]);
        }
    )

});

app.put('/todo/:id', (req, res) => {

    let isCompleted = req.body.isCompleted;
    let title = req.body.title;

    if(!title || (typeof isCompleted === 'undefined')){
        res.status(400).json({message: 'Missing parameters. \'title\' and "isCompleted" are required'});
        return
    }

    let query = `UPDATE items SET isCompleted=${isCompleted}, title='${title}' WHERE id=${req.params.id} AND userId=${req.user.id}`;
    database.query(
        query,
        (error, results) => {
            if(error){
                console.log(query);
                console.log(error);
                res.status(400).json({message: 'Error in udpating item'});
                return 
            }else{
                
                //get the updated item
                database.query(
                    `SELECT * FROM items WHERE id=${req.params.id} LIMIT 1`,
                    (error, results)=> {
                        if(error){
                            res.status(500).json({message: 'Item updated but failed to fetch new items'});
                            return;
                        }else if(results.length < 0){
                            res.status(500).json({message: 'Unable to fetch updated item'});
                            return;
                        }
                        res.json(results[0]);
                    }    
                )

            }
        }
    )

})

app.delete('/todo/:id', (req, res) => {

    let id = req.params.id;
    let userId = req.user.id;

    if(!id || !userId){
        res.status(400).json({message: 'Required parameters missing'});
        return;
    }

    let query = `DELETE FROM items WHERE id=${id} AND userId=${userId}`;
    database.query(
        query,
        (error, results) => {
            if(error){
                console.error(error);
                res.status(400).json({message: 'Unable to delete item'});
                return;
            }

            if(results.affectedRows > 0){
                res.status(200).json({message: 'Successfully deleted item'});
                return;
            }else{
                res.status(400).json({message: 'Failed to delete item'});
                return;
            }
        }
    );
});




app.get('/secret', (req, res) => {
    console.log(req.user);
    res.json({message: "Success! You can not see this without a token"});
});

app.get("/secretDebug",
  function(req, res, next){
    console.log(req.get('Authorization'));
    next();
  }, function(req, res){
    res.json("debugging");
});


app.listen(port, () => console.log(`Example app listening on port ${port}!`));