const express = require('express');
const fs = require("fs");
const app = express();
// kui kõik andmebaasi tegevused on pool'i ümber tõstetud, siis mysql moodulit siia ei ole vaja.
const timeInfo = require('./datetime_et');
const mysql = require('mysql2');
const dbInfo = require('../../vp23config.js');
const bodyparser = require('body-parser');
// const dataBase = 'if23_hansoskar_tr';
const pool = require('./src/databasepool').pool;
// fotode laadimiseks
const multer = require('multer');
// seame multer jaoks vahevara, mis määrab üleslaadimise kataloogi
const upload = multer({dest: './public/gallery/orig/'});
const mime = require('mime'); // Pigem 'file-type', mitte 'mime'
const sharp = require('sharp');
const async = require('async');
// krüpteerimiseks
const bcrypt = require('bcrypt');
// sessioojaoks
const session = require('express-session');
app.use(bodyparser.urlencoded({extended: true}));

app.use(session({secret: 'minuAbsoluutseltSalajaneVõti', saveUninitialized: true, resave: false}));

let mySession;

app.set('view engine', 'ejs');
app.use(express.static('public'));


//kasutame marsruute
const newsRouter = require('./routes/news');
app.use('/news', newsRouter);


// kui kõik saab pool'i, siis seda ühenduse asja pole vaja
//loon andmebaasiühenduse
const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.password,
	database: dbInfo.configData.database
});

//route
app.get('/', (req, res)=>{
	//res.send('See töötab!');
	res.render('index');
});

app.post('/', (req, res)=>{
	let notice = '';
	if(!req.body.emailInput || !req.body.passwordInput){
		console.log('Paha!');
		res.render('index', {notice: notice});
	}
	else {
		console.log('Hea!')
		let sql = 'SELECT id,password FROM vpusers WHERE email = ?';
		pool.getConnection((err, conn)=>{
			if(err){
				throw err;
			}
			else {
				//andmebaasi osa
				conn.execute(sql, [req.body.emailInput], (err, result)=>{
					if(err) {
						notice = 'Tehnilise vea tõttu sisse logida ei saa!';
						console.log('ei saa andmebaasisit loetud');
						res.render('index', {notice: notice});
						conn.release();
					}
					else {
						console.log(result);
						if(result.length == 0){
							console.log('Tühi!');
							notice = 'Viga kasutajatunnuses või paroolis!';
							res.render('index', {notice: notice});
							conn.release();
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
										mySession.userId = result[0].id;
										res.render('index', {notice: notice});
										conn.release();
									}
									else {
										console.log('Jääd välja!');
										notice = 'Ei saa sisse logitud!';
										res.render('index', {notice: notice});
										conn.release();
									}
								}
							});
						}
					}
				});
				//andmebaasi osa lõppeb
			}
		});
	}
	//res.render('index', {notice: notice});
});

app.get('/logout', (req, res)=>{
	console.log(mySession.userName);
	console.log('Välja!');
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
				pool.getConnection((err, conn)=>{
					if(err){
						throw err;
					} else {
						// algab andmebaasi osa
						conn.execute(sql, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthInput, req.body.genderInput, req.body.emailInput, pwdHash], (err, result)=>{
							if(err){
								throw err;
								notice = 'Andmete salvestamine ebaõnnestus!';
								res.render('signup', {notice: notice});
								conn.release();
							}
							else {
								notice = 'Kasutaja ' + req.body.emailInput + ' lisamine õnnestus!';
								res.render('signup', {notice: notice});
								conn.release();
							}
						});
						// lõppeb andmebaasi osa
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
	pool.getConnection((err, conn)=>{
		if(err){
			throw err;
		} else {
			// algas andmebaasi osa
			conn.query(sql, (err, result)=>{
				if (err){
					res.render('filmlist', {filmlist: result});
					conn.release();
					// conn.end()
					throw err;
				}
				else {
					// console.log(result);
					res.render('filmlist', {filmlist: result});
					conn.release();
					// conn.end();
				}
			});
			// lõppes andmebaasi osa
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
	pool.getConnection((err, conn)=>{
		if(err){
			throw err;
		} else {
			// algas andmebaasi osa
			conn.query(sql, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthDateInput], (err, result)=>{
				if (err) {
					notice = 'Andmete salvestamine ebaõnnestus...';
					res.render('addfilmperson', {notice: notice});
					conn.release();
					throw err;
				}
				else {
					notice = req.body.firstNameInput + ' ' + req.body.lastNameInput + ' salvestamine õnnestus!';
					res.render('addfilmperson', {notice: notice});
					conn.release();
				}
			});
			// lõppes andmebaasi osa
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
		pool.getConnection((err, conn)=>{
			if(err){
				throw err;
			} else {
				// algas andmebaasi osa
				conn.query(sql, [req.body.filmPersonInput, req.body.filmInput, req.body.positionInput, req.body.roleInput], (err, result) => {
					if (err) {
						notice = 'Filmi seose salvestamine ebaõnnestus...';
						console.error(err);
						res.render('filmaddrelation', { notice: notice, personList: personList, movieList: movieList, positionList: positionList });
						conn.release();
					} else {
						notice = 'Filmi seose salvestamine õnnestus!';
						res.render('filmaddrelation', { notice: notice, personList: personList, movieList: movieList, positionList: positionList });
						conn.release();
					}
				});
				// lõppes andmebaasi osa
			}
		});
	});
});


app.get('/eestifilm/singlemovie', (req, res) => {
  const countQuery = 'SELECT COUNT(id) AS movieCount FROM movie';
	pool.getConnection((err, conn)=>{
		if(err){
			throw err;
		} else {
			// algas andmebaasi osa
			conn.query(countQuery, (err, countResult) => {
				if (err) {
					res.render('singlemovie', { movieTitle: '', movieYear: '', maxMovieId: movieCount });
					conn.release();
					throw err;
				} else {
					const movieCount = countResult[0].movieCount;
					res.render('singlemovie', { movieTitle: '', movieYear: '', maxMovieId: movieCount });
					conn.release();
				}
			});
			// lõppes andmebaasi osa
		}
	});
});

app.post('/eestifilm/singlemovie', (req, res) => {
	let sql = 'SELECT * FROM movie WHERE id = ?';
	let movieId = req.body.movieId;
	pool.getConnection((err, conn)=>{
		if(err){
			throw err;
		} else {
			// algas andmebaasi osa
			conn.query(sql, [movieId], (err, results) => {
				if (err) {
				  throw err;
				} else {
					const maxMovieId = req.body.maxMovieId;
					if (results.length > 0) {
						const movie = results[0];
						res.render('singlemovie', { movieTitle: movie.title, movieYear: movie.production_year, maxMovieId:req.body.maxMovieId });
						conn.release();
					} else {
						notice2 = 'Filmi ei leitud';
						res.render('singlemovie', { notice2: notice2});
						conn.release();
						// res.status(404).send('Filmi ei leitud');
					}
				}
			});
			// lõppes andmebaasi osa
		}
	});
});


/* app.get('/news', (req,res)=>{
	res.render('news');
});

app.get('/news/add', (req,res)=>{
	res.render('addnews');
});

app.post('/news/add', (req, res) => {
    let notice = '';
    let sql = 'INSERT INTO vpnews (title, content, expire, userid, added) VALUES(?,?,?,1, CURDATE())';
    pool.getConnection((err, conn)=>{
		if(err){
			throw err;
		} else {
			// algas andmebaasi osa
			conn.query(sql, [req.body.titleInput, req.body.contentInput, req.body.expireInput], (err, result) => {
				if (err) {
					notice = 'Uudise salvestamine ebaõnnestus...';
					res.render('addnews', { notice: notice });
					conn.release();
					throw err;
				} else {
					notice = 'Uudise salvestamine õnnestus!';
					res.render('addnews', { notice: notice });
					conn.release();
				}
			});
			// lõppes andmebaasi osa
		}
	});	
});

app.get('/news/read', (req,res)=>{
	// res.render('readnews');
	let notice = '';
    let timeNow = new Date();
    let formattedDate = timeNow.getFullYear() + '-' + (timeNow.getMonth() + 1).toString().padStart(2, '0') + '-' + timeNow.getDate().toString().padStart(2, '0');
	let sql = 'SELECT * FROM `vpnews` WHERE expire > ? AND deleted IS NULL ORDER BY id DESC';
	pool.getConnection((err, conn)=>{
		if(err){
			throw err;
		} else {
			// algas andmebaasi osa
			conn.query(sql, [formattedDate], (err, result) => {
				if (err) {
					notice = 'Uudiste lugemine ebaõnnestus...';
					res.render('readnews', { notice: notice });
					conn.release();
					throw err;
				} else {
					const newsList = result;
					res.render('readnews', { newsList: newsList });
					conn.release();
				}
			});
			// lõppes andmebaasi osa
		}
	});
});

app.get('/news/read/:id', (req,res)=>{
	// res.render('readnews');
	// res.send('Tahame uudist, mille id on: ' + req.params.id);
	
	let notice = '';
    let newsId = req.params.id;
    let sql = 'SELECT * FROM `vpnews` WHERE id = ? AND deleted IS NULL';
    pool.getConnection((err, conn)=>{
		if(err){
			throw err;
		} else {
			// algas andmebaasi osa
			conn.query(sql, [newsId], (err, result) => {
				if (err) {
					notice = 'Uudise lugemine ebaõnnestus...';
					res.render('readonenews', { notice: notice });
					conn.release();
					throw err;
				} else {
					const oneNews = result[0];
					res.render('readonenews', { oneNews: oneNews });
					conn.release();
				}
			});
			// lõppes andmebaasi osa
		}
	});
});

app.get('/news/read/:id/:lang', (req,res)=>{
	// res.render('readnews');
	console.log(req.params);
	console.log(req.query);
	res.send('Tahame uudist, mille id on: ' + req.params.id);
}); */


app.get('/photoupload', checkLogin, (req, res)=> {
	console.log('Sisseloginuid kasutaja: ' + mySession.userId);
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
	// const userid = 1;
	pool.getConnection((err, conn)=>{
		if(err){
			throw err;
		} else {
			// algas andmebaasi osa
			conn.query(sql, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, req.session.userId], (err, result)=>{
				if(err) {
					throw err;
					notice = 'Foto andmete salvestamine ebaõnnestus!';
					res.render('photoupload', {notice: notice});
					conn.release();
				} else {
					notice = 'Foto ' + req.file.originalname + ' laeti edukalt üles!';
					res.render('photoupload', {notice: notice});
					conn.release();
				}
			});
			// lõppes andmebaasi osa
		}
	});
});

app.get('/photogallery', (req, res)=> {
	let photoList = [];
	let privacy = 3;
	if(req.session.userId){
		privacy = 2;
	}
	let sql = 'SELECT id,filename,alttext FROM vpgallery WHERE privacy >= ? AND deleted IS NULL ORDER BY id DESC';
	//teeme andmebaasiühenduse pool'i kaudu
	pool.getConnection((err, conn)=>{
		if(err){
			throw err;
		}
		else {
			//andmebaasi osa
			conn.execute(sql, [privacy], (err,result)=>{
				if (err){
					throw err;
					res.render('photogallery', {photoList : photoList});
					conn.release();
				}
				else {
					photoList = result;
					//console.log(result);
					res.render('photogallery', {photoList : photoList});
					conn.release();
				}
			});
			//andmebaasi osa
		}//getConnection else lõppeb
	});//pool.getConnection lõppeb
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