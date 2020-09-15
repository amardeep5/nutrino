if(process.env.NODE_ENV!=='production '){
 require('dotenv').config();
}

const express = require('express');
const bodyParser  = require("body-parser")
const axios = require("axios")
const http=require("http")
const socketio=require("socket.io")
const formatMessage = require('./chatjs/messages');
const {userJoin,getCurrentUser,userLeave,getRoomUsers}= require("./chatjs/users")
const app=express();
const server = http.createServer(app)
const io = socketio(server)
const mongoose=require("mongoose")
const User = require("./models/user")
const Post = require("./models/post")
const Comment = require("./models/comment")
const Planner = require("./models/planner")
const Favourite = require("./models/favourite")
const flash = require("connect-flash")
const passport = require("passport")
const localStrategy = require('passport-local');
var expressSession =require("express-session")
const api_key=process.env.API_KEY
const secret=process.env.SECRET
const mongoPassword=process.env.MONGO_PASSWORD
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
const stripe=require("stripe")(process.env.SECRET_KEY)
var MongoStore = require('connect-mongo')(expressSession);
app.set("view engine","ejs");
app.use(flash())
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));
app.locals.moment = require('moment');

const botName = 'ChatBot';
mongoose.connect(`mongodb+srv://amardeep5:${mongoPassword}@nutrinocluster.cvdef.mongodb.net/nutrino?retryWrites=true&w=majority`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


//functions
const isLoggedIn=(req,res,next)=>{
  if(req.isAuthenticated()){
    return next()
  }
  req.flash("error","You Should Be Logged In ")
  res.redirect("/login")
}

//*******************************************************
//chat logic
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});
//*******************************************************

//*******************************************************
//passport

app.use(expressSession({
  secret :`${secret}`,
  resave : false,
  saveUninitialized: false,
  store: new MongoStore({ mongooseConnection: mongoose.connection })
}))
app.use(passport.initialize())
app.use(passport.session())
app.use((req,res,next)=>{
  res.locals.currentUser=req.user;
  res.locals.error=req.flash("error")
  res.locals.success=req.flash("success")
  next();
})
passport.use(new localStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

//******************************************************
//get routes
app.get("/",(req,res)=>{

  res.render("landing");
})
//******************************************************
//dishes routes
app.get("/dishes",(req,res)=>{
  res.render("dishes/dishes");
})

app.get("/dish/:id/recipe/", async (req,res)=>{
  const id = req.params.id

  let resp=await axios.get("https://api.spoonacular.com/recipes/"+id+"/ingredientWidget.json?apiKey="+api_key)
  let ingredients=resp.data.ingredients;
  let respo=await axios.get("https://api.spoonacular.com/recipes/"+id+"/analyzedInstructions?apiKey="+api_key)
  let recipes=respo.data[0].steps;

  res.render("dishes/displayrecipe",{recipes,ingredients,id})
})

let dishes
app.post("/dishes",async (req,res)=>{
  let {type,cuisine,diet,intolerance}=req.body
  cuisine=cuisine.toLowerCase();
  type=type.toLowerCase();
  diet=diet.toLowerCase();
  intolerance=intolerance.toLowerCase()
   if(intolerance==="none" && diet==="none"){
      let resp=await axios.get("https://api.spoonacular.com/recipes/complexSearch?apiKey="+api_key+"&type="+type+"&cuisine="+cuisine)//+"&number=9")
       dishes=resp.data.results
           res.redirect("/dishes/display")
      }
      else if(intolerance==="none"){
        let resp=await axios.get("https://api.spoonacular.com/recipes/complexSearch?apiKey="+api_key+"&type="+type+"&cuisine="+cuisine+"&diet="+diet+"&intolerances="+intolerance+"&number=9")
         dishes=resp.data.results
             res.redirect("/dishes/display")
      }
      else if(diet==="none"){
        let resp=await axios.get("https://api.spoonacular.com/recipes/complexSearch?apiKey="+api_key+"&type="+type+"&cuisine="+cuisine+"&intolerances="+intolerance+"&number=9")
         dishes=resp.data.results
             res.redirect("/dishes/display")
      }
      else{
        let resp=await axios.get("https://api.spoonacular.com/recipes/complexSearch?apiKey="+api_key+"&type="+type+"&cuisine="+cuisine+"&diet="+diet+"&intolerances="+intolerance+"&number=9")
         dishes=resp.data.results
          res.redirect("/dishes/display")
      }

})
app.get("/dishes/display",(req,res)=>{
   res.render("dishes/displaydish",{dishes})
})
app.get("/dish/:id/fav",async (req,res)=>{
   res.render("dishes/displaydish",{dishes})
})
app.post("/dish/:id/fav",async (req,res)=>{

  var resp=await axios.get(`https://api.spoonacular.com/recipes/${req.params.id}/summary?apiKey=${api_key}`)
  const favdish=resp.data
  var newFav= await new Favourite(favdish)
  newFav.save(function (err) {
    req.flash("error","Some Error Occured")
    if (err) return handleError(err);
    // saved!
  });

  req.user.favourites.push(newFav)
  req.user.save(function (err) {
    if (err) return handleError(err);    // saved!
  });
  req.flash("success","You have Liked the Dish")
  res.redirect(`/dish/${req.params.id}/fav`)

})


//******************************************************
//wine routes
app.get("/wines",(req,res)=>{
  res.render("wines/wines");
})

let wines,pairs;
app.post("/wines",async (req,res)=>{
  let{minPrice,maxRating,wine}=req.body

  let resp=await axios.get("https://api.spoonacular.com/food/wine/recommendation?apiKey="+api_key+"&number=9&minPrice="+minPrice+"&maxRating="+maxRating+"&wine="+wine)
   wines=resp.data.recommendedWines
  let respo=await axios.get("https://api.spoonacular.com/food/wine/dishes?apiKey="+api_key+"&wine="+wine)
   pairs=respo.data
  res.render("wines/displaywine",{wines,pairs})
})


app.post("/login",passport.authenticate("local",{successRedirect:"/",failureRedirect:"/login"}),(req,res)=>{

})

//******************************************************
//mealPlanner routes
app.get("/meal-planner",isLoggedIn,(req,res)=>{
  console.log(req.user)
  res.render("meals/meal");
})

app.post("/meal-planner",isLoggedIn, async (req,res)=>{
  let{diet,targetCalories,timeFrame}=req.body
  diet=diet.toLowerCase();
  const newPlan= new Planner({diet,targetCalories,timeFrame,author:{id:req.user._id,username:req.user.username}})
//console.log(newPlan)
    newPlan.save(function (err) {
    if (err){
      req.flash("error","Some Error Occured")
      console.log(err)
      return;
    }
    // saved!
    });
    req.user.meals.push(newPlan)
    req.user.save(function (err) {
      if (err) return handleError(err);
      // saved!
    });
    let resp=await axios.get("https://api.spoonacular.com/mealplanner/generate?apiKey="+api_key+"&targetCalories="+targetCalories+"&timeFrame="+timeFrame)
    let meals=resp.data
    console.log(meals);
    req.flash("success","Successfully Created Your Meal")
    res.render("meals/displayplanner",{meals})

})

//******************************************************
//explore nutri routes
app.get("/explore-nutritionist",(req,res)=>{
  res.render("explore");
})
//******************************************************
//become nutri routes
app.get("/become-nutritionist",isLoggedIn,(req,res)=>{
 if(req.user.isNutritionist){
     res.render("become");
 }else{
   req.flash("error","You must be registered as a Nutritionist")
   res.redirect("/");
 }
})

app.get("/my-account",  (req,res)=>{

  User.findById(req.user._id).populate("meals").populate("favourites").exec((err,result)=>{
    res.render("myAccount",{result})
  })


})

//******************************************************
//auth routes
app.get("/login",(req,res)=>{
  res.render("auth/login")
})

app.get("/logout",(req,res)=>{
  req.logout();
  req.flash("error","You Are Logged Out")
  res.redirect("/")
})

app.get("/signup",(req,res)=>{
  res.render("auth/signup")
})

app.post('/signup',  (req, res) => {
  var {username,email,password}=req.body
  const newUser = new User({username,email});
  User.register(newUser,req.body.password,(err,user)=>{
    if(err){
      console.log(err)
      req.flash("error","Some Error Occured")
      return res.render("auth/signup")
    }
    passport.authenticate("local")(req,res,()=>{
      req.flash("success","Successfully Signed Up")
      res.redirect("/")
    })
  })

});


app.get('/forgot', function(req, res) {
  res.render('forgot');
});

app.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'amardeep08112000@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'amardeep08112000@gmail.com',
        subject: 'Nutrino Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions. You can close this tab');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

app.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'amardeep08112000@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'amardeep08112000@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/');
  });
});




//******************************************************
//post routes

app.get("/create-post",isLoggedIn,(req,res)=>{
  res.render("posts/createPost")
})

app.get("/all-posts",isLoggedIn,async (req,res)=>{
  Post.find({}).sort({createdAt:-1}).exec((err,posts)=>{
    if(err){
      req.flash("error","Some Error Occured")
      console.log(err);
    }else{
      res.render("posts/allPosts",{posts})
    }

  })

})

app.get("/post/:id",isLoggedIn,async (req,res)=>{
//  var post= await Post.findById(req.params.id).populate("comments")
  Post.findById(req.params.id).populate("comments").exec((err,post)=>{
    if(err){
      req.flash("error","Some Error Occured")
      console.log(err)
    }else{
      res.render("posts/postExplore",{post})
    }
  })

})

app.get("/posts/:id/comments/new",isLoggedIn,async (req,res)=>{
  var post= await Post.findById(req.params.id)
  res.render("comments/newComment",{post})
})


app.get("/posts/:id/comments/:Cid/edit", isLoggedIn,async (req,res)=>{
  var comment = await Comment.findById(req.params.Cid)
  res.render("comments/edit",{comment,id:req.params.id})
})

app.post("/posts/:id/comments/:Cid/edit",isLoggedIn,async (req,res)=>{

    var comm=await Comment.findById(req.params.Cid)
    comm.text=req.body.comment
    comm.save(err=>{
      if (err){
        req.flash("error","Some Error Occured")
        console.log(err)
        return;}
    })
    req.flash("success","Successfully Edited the Comment")
     res.redirect("/post/" + req.params.id)
  });


app.post("/posts/:id/comments/:Cid",isLoggedIn, (req, res) => {
  //findByIdAndRemove
  Comment.findByIdAndRemove(req.params.Cid, err => {
    if (err) { console.log(err); }
    else {
        req.flash("success","Successfully Deleted the Comment")
        res.redirect("/post/" + req.params.id);
    }
  });
});

app.post("/create-post",isLoggedIn,(req,res)=>{
  var{url,title,description}=req.body
  // console.log(req.files);
  // var url = req.files.img.data
  const newPost = new Post({title,url,description,like:0,author:{id:req.user._id,username:req.user.username}})
  newPost.save(err=>{
    if (err){
      console.log(err)
      return;}
  })
    req.flash("success","Successfully Created the Post")
  res.redirect("/all-posts");

})

app.post("/post/:id",isLoggedIn,async (req,res)=>{
  res.redirect(`/post/${req.params.id}`)
})

app.post("/post/:id/like",isLoggedIn,async (req,res)=>{
  const post=await Post.findById(req.params.id)
  post.like=post.like+Number(1)
  post.save(err=>{
    if (err){
        req.flash("error","Some Error Occured")
      console.log(err)
      return;}
  })
  const fav = new Favourite({id:post.id,title:post.title,summary:post.description});
   fav.save((err)=>{
     if (err){
       console.log(err)
       return;}
   })

   req.user.favourites.push(fav)
   req.user.save(err=>{
     if (err){
       console.log(err)
       return;}
   })
     req.flash("success","You Liked the Post")
  res.redirect("/all-posts")
})

// comment route
app.post("/comments/post/:id",isLoggedIn,async (req,res)=>{
  var{comment}=req.body
  var newComm=new Comment({text:comment,author:{id:req.user._id,username:req.user.username}})
  newComm.save(err=>{
    if (err){
      console.log(err)
      return;}
  })
  var post= await Post.findById(req.params.id)
  post.comments.push(newComm)
  post.save()
    req.flash("success","Your Comment has been Added")
  res.redirect(`/post/${post._id}`);

})

app.get("/post/:id/edit",isLoggedIn,async (req,res)=>{
  const post = await Post.findById(req.params.id)
  res.render("posts/edit",{post})
})

app.post("/post/:id/edit",isLoggedIn,async (req,res)=>{
  var {url,title,description}=req.body
  const getpost=await Post.findById(req.params.id)
  getpost.title=title
  getpost.url=url
  getpost.description=description
  getpost.save(err=>{
    if(err){
      console.log(err);
      return
    }
  })
    req.flash("success","Successfully Edited the Post")
  res.redirect(`/post/${req.params.id}`)

})

app.post("/post/:id/delete",isLoggedIn, (req, res) => {
  //findByIdAndRemove
  Post.findByIdAndRemove(req.params.id, err => {
    if (err) { console.log(err); }
    else {
        req.flash("success","Successfully deleted the Post")
        res.redirect("/all-posts");
    }
  });
});


//******************************************************
//misc routes
app.get("/contact",(req,res)=>{
  res.render("contact")
})

app.post("/chat",isLoggedIn,(req,res)=>{

  res.render("chat",{trainer:req.body.trainer})
})
app.get("/buy/:id/:un",isLoggedIn,async (req,res)=>{
  const resp=await axios.get(`https://api.spoonacular.com/recipes/${req.params.id}/priceBreakdownWidget.json?apiKey=${api_key}`)
  res.render("buy",{price:resp.data.totalCost,un:req.params.un})
})

app.post("/buy/confirmation",isLoggedIn,(req,res)=>{
  var {username,email}=req.body;
  var smtpTransport = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'amardeep08112000@gmail.com',
      pass: process.env.GMAILPW
    }
  });
  var mailOptions = {
    to: req.user.email,
    from: 'amardeep08112000@gmail.com',
    subject: 'Nutrino Buy confirmation',
    text: 'Thank You for shopping with us'
  }
  smtpTransport.sendMail(mailOptions, function(err) {
    console.log('mail sent');
    req.flash('success', 'An confirmation e-mail has been sent to ' + req.user.email );
  });
  res.render("confirmation")
})

app.post("/cart/:id/:un",isLoggedIn,async (req,res)=>{
  const resp=await axios.get(`https://api.spoonacular.com/recipes/${req.params.id}/priceBreakdownWidget.json?apiKey=${api_key}`)
  req.user.cart.push({price:resp.data.totalCost,name:req.params.un})
  req.user.save()
    req.flash("success","Successfully Added to the cart")
  res.redirect(`/dish/${req.params.id}/recipe/`)
})

app.get("/cart",(req,res)=>{
  const items = req.user.cart;
  var total=0;
  if(items.length===0){
      req.flash("error","Cart is empty")
    res.redirect("/")
  }else{
    items.forEach(item=>{
      total+=Number(item.price)})
    res.render("cart",{items,total})
  }
})

app.post("/cart/buy",(req,res)=>{
    req.user.cart.splice(0,req.user.cart.length);
    req.user.save();
  res.render("confirmation")


})

app.post("/my-account/meal-plan/:id",isLoggedIn,async (req,res)=>{
  const plan = await Planner.findById(req.params.id)
  let resp=await axios.get("https://api.spoonacular.com/mealplanner/generate?apiKey="+api_key+"&diet="+plan.diet+"&targetCalories="+plan.targetCalories+"&timeFrame="+plan.timeFrame)
  let meals=resp.data
  res.render("meals/my_planner",{meals})
})

app.post("/my-account/:id/delete",isLoggedIn, (req, res) => {
  //findByIdAndRemove
  Planner.findByIdAndRemove(req.params.id, err => {
    if (err) { console.log(err); }
    else {
        req.flash("success","Successfully Deleted the Plan")
        res.redirect("/my-account");
    }
  });
});

app.post("/my-account/fav/:id/delete",isLoggedIn, (req, res) => {
  //findByIdAndRemove
  Favourite.findByIdAndRemove(req.params.id, err => {
    if (err) { console.log(err); }
    else {
        req.flash("success","Successfully Deleted ")
        res.redirect("/my-account");
    }
  });
});

app.post("/cart/item/:i/delete",isLoggedIn, (req, res) => {
  //findByIdAndRemove
  console.log(req.user.cart);
  req.user.cart.splice(Number(req.params.i), 1);
  req.user.save()
    req.flash("success","Successfully Deleted the Item")
  res.redirect("/cart")
});
//*************************************************
//grocery product

app.get("/grocery-product",(req,res)=>{
  const products=[];
  res.render("products/grocery",{products});
})

app.post("/grocery-product",async (req,res)=>{
  var name = req.body.name;
  const pro=await axios.get(`https://api.spoonacular.com/food/products/search?apiKey=${api_key}&query=${name}`)
  res.render("products/grocery",{products:pro.data.products})
})
app.get("/grocery-product/:id",async (req,res)=>{
  const info = await axios.get(`https://api.spoonacular.com/food/products/${req.params.id}?apiKey=${api_key}`)
  res.render("products/grocerydisplay",{info:info.data})
})

app.post("/cart/grocery/:id/:un",isLoggedIn,async (req,res)=>{
  req.user.cart.push({price:req.body.price,name:req.params.un})
  req.user.save()
    req.flash("success","Item added to Cart")
  res.redirect(`/grocery-product/${req.params.id}`)
})
//*************************************************

server.listen(3000,(req,res)=>{
  console.log("started the server");
})
