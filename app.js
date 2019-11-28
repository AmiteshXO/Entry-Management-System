//Require all the required packages
var express = require("express");
var getJSON = require('get-json');
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var nodemailer = require("nodemailer");
var unirest = require("unirest");
const dotenv = require('dotenv');
dotenv.config();
//Global variables
var foundData, findData, address, type=-1,message="";

//Connect to management DB using mongoose
const uri = process.env.MONGODB;
// const uri = "mongodb://localhost/management";
mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true});
// console.log(process.env)

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
mongoose.set('useFindAndModify', false);

//Nodemailer transporter function
var transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: false,//true
    port: 25,//465
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.EMAIL_PASS
    }, tls: {
      rejectUnauthorized: false
    }
  });

// Database Schema
var userSchema = new mongoose.Schema({
    name:String,
    email:String,
    phone:Number,
    hname:String,
    hemail:String,
    hphone:Number,
    checkin:String,
    checkout:String
});

// Create Model of user Schema
var user = mongoose.model("user", userSchema);
console.log(timeNow());

// GET route to render landing page
app.get('/', function(req, res){
    user.find({}, function(err, found){
        if(err)
        console.log(err);
        else{
        foundData = found;
        }
    });
    var xx = type, xxx = message;
    type=-1;
    message = "";
    res.render("landing",{types:xx,messages:xxx});
});

// POST route to handle checkin form details
app.post("/", function(req, res){
     var name = req.body.name;
     var email = req.body.email;
     var phone = req.body.phone;
     var hname = req.body.hname;
     var hemail = req.body.hemail;
     var hphone = req.body.hphone;
     var time = timeNow();
     var newUser = {name:name, email:email, phone:phone, hname:hname, hemail:hemail, hphone:hphone, checkin:time};
     foundData = newUser;
     
     // Checking if user already present in database
     user.find({"email":email,"checkout":null}, function(err, doc){
       if(doc.length === 0)
       {
         //Store value to database
        user.create(newUser, function(err, newlycreated){
          if(err)
          console.log(err);
          else{
            //Sending mail to host
             var mailOptions = {
                 from: 'bluepenguin0110@gmail.com',
                 to: foundData.hemail,
                 subject: 'Visitor Details',
                 text: foundData.name + " is here to Visit you "+ "\n" + "Phone Number:- " + foundData.phone + "\n" +" E-mail:- " + foundData.email
               };
               
               transporter.sendMail(mailOptions, function(error, info){
                 if (error) {
                   console.log(error);
                 } else {
                   console.log('Email sent: ' + info.response);
                 }
               });
               // Send SMS to host
               var req = unirest("POST", "https://www.fast2sms.com/dev/bulk");
 
            req.headers({
                   "authorization": process.env.TEXT_API
              });
 
         req.form({
          "sender_id": "FSTSMS",
            "message": foundData.name + ' is here to Visit you.',
              "language": "english",
               "route": "p",
               "numbers": foundData.hphone
             });
 
        req.end(function (res) {
          if (res.error) throw new Error(res.error);
              console.log(res.body);
          });
          type=1;
          message="Checked-In successfully";
          console.log(type+message);
          res.redirect("/");
          }
      })
       }
       else if(doc.length==1)
       {
         //Print on console if can't checkin
         console.log("Can't Checkin Again");
         type=2;
         message="Cannot Checkin Again";
         res.redirect("/");
       }
       else{
          console.log("Database has multiple entries");
          type=2;
          message="Cannot Checkin Again";
          res.redirect("/");
       }
     });
    
});

//GET route to render checkin form
app.get("/new", function(req, res){
    res.render("new");
});

//GET route to render checkout page
app.get("/out", function(req, res){
    res.render("out");
});

// POST route to handle checkout form data
app.post("/out", function(req, res){

    var time = timeNow();
    var find = req.body.find;

    //find user data with entered email
    user.find({"email":find,"checkout":null}, function(err, here){
      if(here.length==1)
      {
        // ADD checkout time to the last email found in DB
        user.findOneAndUpdate({email:find, checkin:here[here.length-1].checkin}, {checkout:time}, function(){
          console.log("Checkout Time added !!");
          address = req.body.address;
          // console.log(foundData);
          // res.redirect("/");

          //Send email to user to confirm checkout
          var mailOptions = {
            from: 'bluepenguin0110@gmail.com',
            to: here[here.length-1].hemail,
            subject: 'CHECKOUT DETAILS',
            text: "NAME: " + here[here.length-1].name + "\n" + " PHONE NO: " +here[here.length-1].phone + "\n" + " CHECKIN-TIME: " + here[here.length-1].checkin + "\n" + " CHECKOUT-TIME " + time + "\n" + " HOST NAME: " + here[here.length-1].hname + "\n" + " ADDRESS: " + address
          };
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log(type,message);
              console.log('Email sent: ' + info.response);
            }
          });
      });
      type=1;
      message="Checked out Successfully";
      res.redirect('/');
      }
      else if(here.length==0)
      {
        // Print on terminal if already checked out
        console.log("can't checkout");
        type=2;
        message="User not Checked-In";
        res.redirect('/');
      }
      else{  
        console.log("Checkin is Corrupt");
        type=2;
        message="Check-In Left multiple entries";
        res.redirect('/');
      }
    });
    
   
});

// GET route to render data log Page
app.get("/data", function(req, res){
  user.find({}, function(err, found){
    if(found.length == 0)
    {
      console.log("No data in the data log");
      res.send("no data found");
    }
    else{
      res.render("data", {data:found.reverse()});
    }
  
  });
  
});

// function to find current-time and use during checkin and checkout
function timeNow()
{
    var today = new Date();
    getJSON('http://worldtimeapi.org/api/timezone/Asia/Kolkata.json', function(error, response){
      if(error){
        today=today;
      }
      else{
        today = response.datetime;
        // console.log(response);
      }
    });
    return String(today).substring(0,24);
}



// Server Start Listening
app.listen(process.env.PORT, process.env.IP, function(){
console.log("Server has Started");
});
