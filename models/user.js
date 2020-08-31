var mongoose = require("mongoose");
var  passportLocalMongoose = require('passport-local-mongoose');

var UserSchema = new mongoose.Schema({
    username: {type:String,unique:true,required:true},
    email:{type:String,unique:true,required:true},
    password: String,
    meals: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Planner"
      }
   ],
    favourites:[
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Favourite"

      }
    ],
    cart: [
      {
         price:String,
         name:String
      }
   ],
    isNutritionist:{type:Boolean,default:false},
    resetPasswordToken:String,
    resetPasswordExpires:Date
});
UserSchema.plugin(passportLocalMongoose)
module.exports = mongoose.model("User", UserSchema);
