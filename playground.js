// var token = require('jsonwebtoken');
// var cron = require('node-cron');
//
//
// cron.schedule('1-5   * * * *',()=>{
//   console.log("hi");
// });

// console.log(token.sign({
//   exp: Math.floor(Date.now() / 1000) + (60 * 60),
//   data: 'foobar'
// }, 'secret'));

var fs = require('fs');
var nodemailer = require('nodemailer');

var transporter =  nodemailer.createTransport({
  service : 'gmail',
  auth:{
    user:'opopol.prince@gmail.com',
    pass:'99915pri'
  },
  tls: {
          rejectUnauthorized: false
      },
});

var mailOptions = {
  from: 'Prince Arora',
  to: 'iampuneetdudi@gmail.com',
  subject: 'Sending Email using Node.js',
  html: fs.readFileSync('./template.html')
};

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});
