const express = require('express');
// loome marsruutimise miniäpi
const router = express.Router(); // suur R on oluline!
const pool = require('../src/databasepool').pool;

// kuna siin on kasutusel miniäpp router, siis kõik marsruudid on router'il mitte app'il
// kuna kõik siinsed marsruudid algavad osaga "/news", siis seda pole vaja kirjutada

router.get('/', (req,res)=>{
	res.render('news');
});

router.get('/add', (req,res)=>{
	res.render('addnews');
});

router.post('/add', (req, res) => {
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

router.get('/read', (req,res)=>{
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

router.get('/read/:id', (req,res)=>{
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

router.get('/read/:id/:lang', (req,res)=>{
	// res.render('readnews');
	console.log(req.params);
	console.log(req.query);
	res.send('Tahame uudist, mille id on: ' + req.params.id);
});

module.exports = router;