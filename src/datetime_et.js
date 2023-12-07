const monthNamesET = ["jaanuar", "veebruar", "mÃ¤rts", "aprill", "mai", "juuni", "juuli", "august", "september", "oktoober", "november", "detsember"];
const monthNamesEN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const dateETformatted = function(){
	let timeNow = new Date();
	return timeNow.getDate() + ". " + monthNamesET[timeNow.getMonth()] + " " + timeNow.getFullYear();
}

const timeETformatted = function(){
	let timeNow = new Date();
	return timeNow.getHours() + ":" + timeNow.getMinutes() + ":" + timeNow.getSeconds();
}

const dateENformatted = function(){
	let timeNow = new Date();
	return monthNamesEN[timeNow.getMonth()] + " " + timeNow.getDate() + " " + timeNow.getFullYear();
}

const timeENformatted = function(){
	let timeNow = new Date();
	return timeNow.getHours() + ":" + timeNow.getMinutes() + ":" + timeNow.getSeconds();
}

/**const dateGREENYformatted = function(){
	let timeNow = new Date();
	return timeNow.getFullYear() + "-" + monthNamesET[timeNow.getMonth()] + "-" + timeNow.getDate();
}**/

const timeOfDayET = function(){
	let partOfDay = "suvaline hetk";
	let hourNow = new Date().getHours();
	if (hourNow >= 6 && hourNow < 12){
		partOfDay = "hommik";
	}
	if (hourNow > 14 && hourNow < 18){
		partOfDay = "pärastlõuna";
	}
	if(hourNow >= 18){
		partOfDay = "õhtu";
	}
	return partOfDay;
}


//ekspordin kõik asjad
module.exports = {dateETformatted: dateETformatted, timeETformatted: timeETformatted, timeOfDayET: timeOfDayET, monthsET: monthNamesET, dateENformatted: dateENformatted, timeENformatted: timeENformatted, monthsEN: monthNamesEN};