// Password function is used to generate room pincode (length is 4 now).
// But we want to reserve the number 9000 to 9999 of room.
// So the prototype replaceAt is used do this work.

String.prototype.replaceAt=function(index, character) {
    return character + this.substr(index+1);
}
$.extend({
	password: function( length ){
		var password = ''; 
		for( var i=0; i<length; i++ ){ 
			password += Math.floor(Math.random()*10); 
		}
		while ( '9' == password[0] ) {
			password = password.replaceAt(0, Math.floor(Math.random()*10));
		}
		return password;
	}
});
