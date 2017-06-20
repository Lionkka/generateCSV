const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    id:{
        type:String,
        trim: true,
        required: true,
        unique:true,
        index: true
    },
    firstName:{
        type: String,
        trim: true,
        required: true
    },
    lastName:{
        type:String,
        trim: true,
        required: true
    }
},
    {
        timestamps: true
    }
);
schema.index({ id: 1}, { unique: true });
module.exports =  mongoose.model('Author', schema);
