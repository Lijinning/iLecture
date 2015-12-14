/*** jquery.password.js ***/
$.extend({
	password: function( length ){
		var password = ''; 
		for( var i=0; i<length; i++ ){ 
			password += Math.floor(Math.random()*10); 
		}
		return password;
	}
});