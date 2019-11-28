//Require all the required packages
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var nodemailer = require("nodemailer");
var unirest = require("unirest");
//Global variables
var foundData;
var findData;
var address;

//Connect to management DB using mongoose
mongoose.connect("mongodb://localhost/management", {useNewUrlParser: true, useUnifiedTopology: true});

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
mongoose.set('useFindAndModify', false);

//Nodemailer transporter function
var transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: false,//true
    port: 25,//465
    auth: {
        user: '',
        pass: ''
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

// GET route to render landing page
app.get('/', function(req, res){
    user.find({}, function(err, found){
        if(err)
        console.log(err);
        else{
        foundData = found;
        }
    });
    res.render("landing");
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
     user.find({}, function(err, doc){
       if(doc.length === 0 || doc[doc.length-1].checkout != undefined)
       {
         //Store value to database
        user.create(newUser, function(err, newlycreated){
          if(err)
          console.log(err);
          else{
            //Sending mail to host
             var mailOptions = {
                 from: foundData.email,
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
                   "authorization": ""
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
          res.redirect("/");
          } 
      });   
       }
       else
       {
         //Print on console if can't checkin
         console.log("Can't Checkin Again");
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
    user.find({email:find}, function(err, here){
      if(here[here.length-1].checkout === undefined)
      {
        // ADD checkout time to the last email found in DB
        user.findOneAndUpdate({email:find, checkin:here[here.length-1].checkin}, {checkout:time}, function(){
          console.log("Checkout Time added !!");
          address = req.body.address;
          // console.log(foundData);
          // res.redirect("/");

          //Send email to user to confirm checkout
          var mailOptions = {
            from: here[here.length-1].email,
            to: here[here.length-1].hemail,
            subject: 'CHECKOUT DETAILS',
            text: "NAME: " + here[here.length-1].name + "\n" + " PHONE NO: " +here[here.length-1].phone + "\n" + " CHECKIN-TIME: " + here[here.length-1].checkin + "\n" + " CHECKOUT-TIME " + time + "\n" + " HOST NAME: " + here[here.length-1].hname + "\n" + " ADDRESS: " + address
          };
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
      });

      res.redirect('/');
      }
      else
      {
        // Print on terminal if already checked out
        console.log("can't checkout");
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
      res.render("data", {data:found});
    }
  
  });
  
});

// function to find current-time and use during checkin and checkout
function timeNow()
{
    var today = new Date();
    var time = today.getDate() + "/" + today.getMonth() + "/" + today.getFullYear() + " @ " +  today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    return time;
}

// Server Start Listening
app.listen(3000, function(){
console.log("Server has Started");
});
