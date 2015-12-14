var myRootRef = new Firebase('https://ilecture.firebaseio.com/');

// PinCode 自動 focus
function moveOnMax(e, next){
    if( e.value.length === 1 ){
        document.getElementById(next).focus();
    }
}

// 取得 : Student 輸入的 Pincode
function getPincode(){
	var a = $('#pincode-1').val().trim() || null
	, b = $('#pincode-2').val().trim() || null
	, c = $('#pincode-3').val().trim() || null
	, d = $('#pincode-4').val().trim() || null;
	if( a === null || b === null || c === null || d === null ){
		alert('Pincode\'s format errir.');
	}else{ // 輸入格式正確
		checkPincode(a+b+c+d);
	}
}

// 檢查 : Student 輸入的 Pincode
function checkPincode(pincode){
	console.log(pincode);
	var roomsRef = myRootRef.child('rooms'), bodyId = document.getElementById('body');
	bodyId.className = bodyId.className.replace('', 'blur');
	roomsRef.once('value', function(data){
		console.log(data.val());
		var obj = data.val() || null;
		if( data.val() !== null ){
			var keysAry = Object.keys(obj);
			for( var i=0, aryLen=keysAry.length; i<aryLen; i++ ){
				console.log( keysAry[i]+' -> '+obj[keysAry[i]].code );
				if( obj[keysAry[i]].code === pincode ){ // 找到教室
					window.location.href = '../student/index.html?room_id='+keysAry[i]+'&code='+pincode;
					return 0;
				}
			}
			alert('The classroom is not found to fit in with Pincode.');
			bodyId.className = bodyId.className.replace('blur', '');
		}else{
			alert('Can not find any classroom.');
			bodyId.className = bodyId.className.replace('blur', '');
		}
	});
}