var mongoose = require("mongoose");

var PlannerSchema = new mongoose.Schema({
    diet: String,
    targetCalories:String,
    timeFrame: String,
    createdAt: {type: Date, default: Date.now},
    author:{
      id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
      },
      username:String
    }
});
module.exports = mongoose.model("Planner", PlannerSchema);
