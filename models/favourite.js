var mongoose = require("mongoose");

var favouriteSchema = mongoose.Schema({
    id:String,
    title: String,
    summary:String,
    createdAt: { type: Date, default: Date.now },

});

module.exports = mongoose.model("Favourite", favouriteSchema);
