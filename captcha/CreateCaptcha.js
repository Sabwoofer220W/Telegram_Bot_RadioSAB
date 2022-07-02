const path = require("path"),
	fs = require("fs"),
	Captcha = require("captcha-generator-alphanumeric").default;

  let CreateCaptcha = function(){

let captcha = new Captcha();
captcha.PNGStream.pipe(fs.createWriteStream(path.join(__dirname, `cap.png`)));
let code = captcha.value;
return code;
  }
  //console.log(CreateCaptcha());
module.exports.CreateCaptcha = CreateCaptcha;
