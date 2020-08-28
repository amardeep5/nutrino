var mongoose = require("mongoose");
var  passportLocalMongoose = require('passport-local-mongoose');

var UserSchema = new mongoose.Schema({
    username: String,
    email:String,
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
    isNutritionist:{type:Boolean,default:false}
});
UserSchema.plugin(passportLocalMongoose)
module.exports = mongoose.model("User", UserSchema);
