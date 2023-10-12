const express = require('express');
const app = express();
const timeInfo = require('./datetime_et');
const fs = require("fs");

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req,res)=>{
	//res.send('See töötab');
	//res.download('index.js'); #(ligi avamisel saab kindla faili alla laadida)#
	res.render('index');
});

app.get('/timenow', (req,res)=>{
	const dateNow = timeInfo.dateETformatted();
	const timeNow = timeInfo.timeETformatted();
	//res.render('timenow');
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

app.listen(5121);