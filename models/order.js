var mongoose = require("mongoose");

var orderSchema = mongoose.Schema({
      name:String,
      email:String,
      address:String,
      state:String,
      city:String,
      zip:String,
      total:String,
      cart:Array,
      delivered:{type:Boolean,default:false},
      createdAt: {type: Date, default: Date.now},
});

module.exports = mongoose.model("Order", orderSchema);
