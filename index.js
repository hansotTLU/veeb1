const express = require('express');
const fs = require("fs");
const app = express();
const timeInfo = require('./datetime_et');
const mysql = require('mysql2');
const dbInfo = require('../../vp23config.js');
const bodyparser = require('body-parser');
const dataBase = 'if23_hansoskar_tr';
// fotode laadimiseks
const multer = require('multer');
//seame multer jaoks vahevara, mis määrab üleslaadimise kataloogi
const upload = multer({dest: './public/gallery/orig/'});
const mime = require('mime'); // Pigem 'file-type', mitte 'mime'
const sharp = require('sharp');
const async = require('async');
// krüpteerimiseks
const bcrypt = require('bcrypt');
// sessioojaoks
const session = require('express-session');
app.use(session({secret: 'minuAbsoluutseltSalajaneVõti', saveUninitialized: true, resave: false}));

let mySession;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyparser.urlencoded({extended: false}));

//loon andmebaasiühenduse
const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.password,
	database: dbInfo.configData.database
});

app.get('/', (req,res)=>{
	// res.send('See töötab');
	// res.download('index.js'); // lingi avamisel saab kindla faili alla laadida
	res.render('index');
});

app.post('/', (req, res)=>{
	let notice = '';
	if(!req.body.emailInput || !req.body.passwordInput){
		console.log('Paha!');
	}
	else {
		console.log('Hea!')
		let sql = 'SELECT password FROM vpusers WHERE email = ?';
		conn.execute(sql, [req.body.emailInput], (err, result)=>{
			if(err) {
				notice = 'Tehnilise vea tõttu sisse logida ei saa!';
				console.log('ei saa andmebaasisit loetud');
			}
			else {
				console.log(result);
				if(result.length == 0){
					console.log('Tühi!');
					notice = 'Viga kasutajatunnuses või paroolis!';
				}
				else {
					//võrdleme parooli andmebaasist saaduga
					bcrypt.compare(req.body.passwordInput, result[0].password, (err, compresult)=>{
						if(err){
							throw err;
						}
						else {
							if(compresult){
								console.log('Sisse!');
								notice = 'Saad sisse logitud!';
								mySession = req.session;
								mySession.userName = req.body.emailInput;
							}
							else {
								console.log('Jääd välja!');
								notice = 'Ei saa sisse logitud!';
							}
						}
					});
				}
			}
		});
	}
	res.render('index', {notice: notice});
});

app.get('/logout', (req, res)=>{
	console.log(mySession.userName);
	console.log('Välja');
	req.session.destroy();
	mySession = null;
	res.redirect('/');
});

app.get('/signup', (req, res)=>{
	res.render('signup');
});

app.post('/signup', (req, res)=>{
	let notice = 'Ootel!';
	// console.log(req.body);
	// javascript AND ->   &&    OR ->   ||
	if(!req.body.firstNameInput || !req.body.lastNameInput || !req.body.genderInput || !req.body.birthInput || !req.body.emailInput || !req.body.passwordInput || req.body.passwordInput.length < 8 || req.body.passwordInput !== req.body.confirmPasswordInput){
		console.log('andmeid puudu või sobimatud!');
		notice = 'Andmeid puudu või sobimatud!';
		res.render('signup', {notice: notice});
	}
	else {
		console.log('OK!');
		notice = 'Ok!';
		//"soolame" ja krüpteerime parooli
		bcrypt.genSalt(10, (err, salt)=>{
			bcrypt.hash(req.body.passwordInput, salt, (err, pwdHash)=>{
				let sql = 'INSERT INTO vpusers (firstname, lastname, birthdate, gender, email, password) VALUES(?,?,?,?,?,?)';
				conn.execute(sql, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthInput, req.body.genderInput, req.body.emailInput, pwdHash], (err, result)=>{
					if(err){
						throw err;
						notice = 'Andmete salvestamine ebaõnnestus!';
						res.render('signup', {notice: notice});
					}
					else {
						notice = 'Kasutaja ' + req.body.emailInput + ' lisamine õnnestus!';
						res.render('signup', {notice: notice});
					}
				});
			});
		});		
	}
});


app.get('/timenow', (req,res)=>{
	const dateNow = timeInfo.dateETformatted();
	const timeNow = timeInfo.timeETformatted();
	// res.render('timenow');
	res.render('timenow', {nowD: dateNow, nowT: timeNow});
});

app.get('/wisdom', (req,res)=>{
	let folkWisdom = [];
	fs.readFile('public/txt_files/vanasonad.txt', 'utf8', (err, data)=>{
		if(err){
			throw err;
		}
		else {
			folkWisdom = data.split(';');
			res.render('justlist', {h1: 'Vanasõnad', wisdom: folkWisdom});
		}
	});
});

app.get('/nimed', (req,res)=>{
	let nimed = [];
	fs.readFile('public/txt_files/log.txt', 'utf8', (err, data)=>{
		if(err){
			throw err;
		}
		else {
			nimed = data.split(';');
			const nimedArray = [];
			for (const nimi of nimed) {
				const parts = nimi.split(',');
				
				const originalDate = parts[2];
        
				const dateParts = originalDate.split('/');
				const date = new Date(`${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`);

				const formattedDate = `${date.getDate()}.${(date.getMonth() + 1)}.${date.getFullYear()}`;
				
				nimedArray.push({
					firstName: parts[0],
					lastName: parts[1],
					dateSaved: formattedDate
				});
			}
			res.render('nimed', {h1: 'Nimed', nimed: nimedArray});
		}
	});
});

app.get('/eestifilm', (req,res)=>{
	res.render('filmindex');
});

app.get('/eestifilm/filmiloend', (req,res)=>{
	let sql = 'SELECT title, production_year, duration FROM movie';
	let sqlResult = [];
	conn.query(sql, (err, result)=>{
		if (err){
			res.render('filmlist', {filmlist: result});
			// conn.end()
			throw err;
		}
		else {
			// console.log(result);
			res.render('filmlist', {filmlist: result});
			// conn.end();
		}
	});
});

app.get('/eestifilm/addfilmperson', (req,res)=>{
	res.render('addfilmperson');
});

app.post('/eestifilm/addfilmperson', (req,res)=>{
	// res.render('addfilmperson');
	// res.send(req.body);
	let notice = '';
	let sql = 'INSERT INTO person (first_name, last_name, birth_date) VALUES(?,?,?)';
	conn.query(sql, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthDateInput], (err, result)=>{
		if (err) {
			notice = 'Andmete salvestamine ebaõnnestus...';
			res.render('addfilmperson', {notice: notice});
			throw err;
		}
		else {
			notice = req.body.firstNameInput + ' ' + req.body.lastNameInput + ' salvestamine õnnestus!';
			res.render('addfilmperson', {notice: notice});
		}
	});
});

app.get('/eestifilm/lisaseos', (req,res)=>{
	// paneme async mooduli abil mitu asja korraga tööle
	// 1)loome tegevuste loendi
	const myQueries = [
		function(callback){
			conn.execute('SELECT id,title from movie', (err, result)=>{
				if (err) {
					return callback(err);
					
				} else {
					return callback(null, result);
				}
			});
		},
		function(callback){
			conn.execute('SELECT id,first_name,last_name from person', (err, result)=>{
				if(err) {
					return callback(err);
					
				} else {
					return callback(null, result);
				}
			});
		},
		function(callback){
			conn.execute('SELECT id,position_name from position', (err, result)=>{
				if(err) {
					return callback(err);
					
				} else {
					return callback(null, result);
				}
			});
		}
	];
	// 2)paneme need tegevused asünkroonselt paralleelselt tööle
	async.parallel(myQueries, (err, results)=>{
		if (err) {
			throw err;
		} else {
			console.log(results);
			// mis kõik teha, ka render osa vajalike tükkidega
			
			const movieList = results[0];
			const personList = results[1];
			const positionList = results[2];
			
			res.render('filmaddrelation', { personList: personList, movieList: movieList, positionList: positionList });
		}
	});
	
	// res.render('filmaddrelation');
});

app.post('/eestifilm/lisaseos', (req, res) => {
	const myQueries2 = [
		function(callback){
			conn.execute('SELECT id,title from movie', (err, result)=>{
				if (err) {
					return callback(err);
					
				} else {
					return callback(null, result);
				}
			});
		},
		function(callback){
			conn.execute('SELECT id,first_name,last_name from person', (err, result)=>{
				if(err) {
					return callback(err);
					
				} else {
					return callback(null, result);
				}
			});
		},
		function(callback){
			conn.execute('SELECT id,position_name from position', (err, result)=>{
				if(err) {
					return callback(err);
					
				} else {
					return callback(null, result);
				}
			});
		}
	];
	
	async.parallel(myQueries2, (err, results)=>{
		let notice = '';
		let sql = 'INSERT INTO person_in_movie (person_id, movie_id, position_id, role) VALUES(?,?,?,?)';
		
		const movieList = results[0];
		const personList = results[1];
		const positionList = results[2];
		
		conn.query(sql, [req.body.filmPersonInput, req.body.filmInput, req.body.positionInput, req.body.roleInput], (err, result) => {
		  if (err) {
			notice = 'Filmi seose salvestamine ebaõnnestus...';
			console.error(err);
			res.render('filmaddrelation', { notice: notice, personList: personList, movieList: movieList, positionList: positionList });
		  } else {
			notice = 'Filmi seose salvestamine õnnestus!';
			res.render('filmaddrelation', { notice: notice, personList: personList, movieList: movieList, positionList: positionList });
		  }
		});
	});
});


app.get('/eestifilm/singlemovie', (req, res) => {
  const countQuery = 'SELECT COUNT(id) AS movieCount FROM movie';

  conn.query(countQuery, (err, countResult) => {
    if (err) {
      res.render('singlemovie', { movieTitle: '', movieYear: '', maxMovieId: movieCount });
	  throw err;
    } else {
      const movieCount = countResult[0].movieCount;
      res.render('singlemovie', { movieTitle: '', movieYear: '', maxMovieId: movieCount });
    }
  });
});

app.post('/eestifilm/singlemovie', (req, res) => {
  let sql = 'SELECT * FROM movie WHERE id = ?';
  let movieId = req.body.movieId;

  conn.query(sql, [movieId], (err, results) => {
    if (err) {
	  throw err;
    } else {
		const maxMovieId = req.body.maxMovieId;
      if (results.length > 0) {
        const movie = results[0];
        res.render('singlemovie', { movieTitle: movie.title, movieYear: movie.production_year, maxMovieId: req.body.maxMovieId });
      } else {
		notice2 = 'Filmi ei leitud';
		res.render('singlemovie', { notice2: notice2});
        // res.status(404).send('Filmi ei leitud');
      }
    }
  });
});


app.get('/news', (req,res)=>{
	res.render('news');
});

app.get('/news/add', (req,res)=>{
	res.render('addnews');
});

app.post('/news/add', (req, res) => {
    let notice = '';
    let sql = 'INSERT INTO vpnews (title, content, expire, userid, added) VALUES(?,?,?,1, CURDATE())';
    
    conn.query(sql, [req.body.titleInput, req.body.contentInput, req.body.expireInput], (err, result) => {
        if (err) {
            notice = 'Uudise salvestamine ebaõnnestus...';
            res.render('addnews', { notice: notice });
            throw err;
        } else {
            notice = 'Uudise salvestamine õnnestus!';
            res.render('addnews', { notice: notice });
        }
    });
});

app.get('/news/read', (req,res)=>{
	// res.render('readnews');
	let notice = '';
    let timeNow = new Date();
    let formattedDate = timeNow.getFullYear() + '-' + (timeNow.getMonth() + 1).toString().padStart(2, '0') + '-' + timeNow.getDate().toString().padStart(2, '0');
	let sql = 'SELECT * FROM `vpnews` WHERE expire > ? AND deleted IS NULL ORDER BY id DESC';
	
	conn.query(sql, [formattedDate], (err, result) => {
        if (err) {
            notice = 'Uudiste lugemine ebaõnnestus...';
            res.render('readnews', { notice: notice });
            throw err;
        } else {
            const newsList = result;
            res.render('readnews', { newsList: newsList });
        }
    });
});

app.get('/news/read/:id', (req,res)=>{
	// res.render('readnews');
	// res.send('Tahame uudist, mille id on: ' + req.params.id);
	
	let notice = '';
    let newsId = req.params.id;
    let sql = 'SELECT * FROM `vpnews` WHERE id = ? AND deleted IS NULL';
    
    conn.query(sql, [newsId], (err, result) => {
        if (err) {
            notice = 'Uudise lugemine ebaõnnestus...';
            res.render('readonenews', { notice: notice });
            throw err;
        } else {
            const oneNews = result[0];
            res.render('readonenews', { oneNews: oneNews });
        }
    });
});

app.get('/news/read/:id/:lang', (req,res)=>{
	// res.render('readnews');
	console.log(req.params);
	console.log(req.query);
	res.send('Tahame uudist, mille id on: ' + req.params.id);
	
});


app.get('/photoupload', checkLogin, (req, res)=> {
	res.render('photoupload');
});

app.post('/photoupload', upload.single('photoInput'), (req, res)=>{
	let notice = '';
	console.log(req.file);
	console.log(req.body);
	const fileName = 'vp_' + Date.now() + '.jpg';
	// fs.rename(req.file.path, './public/gallery/orig/' + req.file.originalname, (err)=>{
	fs.rename(req.file.path, './public/gallery/orig/' + fileName, (err)=>{
		console.log('Faili laadimise viga: ' + err);
	});
	// loome kaks väiksema mõõduga pildi varianti
	sharp('./public/gallery/orig/' + fileName).resize(100,100).jpeg({quality : 90}).toFile('./public/gallery/thumbs/' + fileName);
	sharp('./public/gallery/orig/' + fileName).resize(800,600).jpeg({quality : 90}).toFile('./public/gallery/normal/' + fileName);
	
	// foto andmed andmetabelisse
	let sql = 'INSERT INTO vpgallery (filename, originalname, alttext, privacy, userid) VALUES(?,?,?,?,?)';
	const userid = 1;
	conn.query(sql, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, userid], (err, result)=>{
		if(err) {
			throw err;
			notice = 'Foto andmete salvestamine ebaõnnestus!';
			res.render('photoupload', {notice: notice});
		} else {
			notice = 'Foto ' + req.file.originalname + ' laeti edukalt üles!';
			res.render('photoupload', {notice: notice});
		}
	});
});

app.get('/photogallery', (req, res)=> {
	let photoList = [];
	let sql = 'SELECT id,filename,alttext FROM vpgallery WHERE privacy > 1 AND deleted IS NULL ORDER BY id DESC';
	conn.execute(sql, (err,result)=>{
		if (err){
			throw err;
			res.render('photogallery', {photoList : photoList});
		}
		else {
			photoList = result;
			console.log(result);
			res.render('photogallery', {photoList : photoList});
		}
	});
});

// funktsioon, mis kontrollib sisselogimist. on vahevara (middleware)
function checkLogin(req, res, next){
	console.log('Kontrollime, kas on sisse logitud');
	if(mySession != null){
		if(mySession.userName){
			console.log('Ongi sees');
			next();
		} else {
			console.log('Polnud sisse loginud');
			res.redirect('/');
		}
	} else {
		console.log('Polnud sisse loginud');
		res.redirect('/');
	}
}

app.listen(5121);