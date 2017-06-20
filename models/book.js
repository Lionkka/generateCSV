const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    id: {
        type: String,
        trim: true,
        required: true,
        unique: true,
        index: true
    },
    title: {
        type: String,
        trim: true,
        required: true
    },
    authors: [{
        type: Schema.Types.ObjectId,
        ref: 'Author'
    }]
},
    {
        timestamps: true
    });
schema.index({ id: 1}, { unique: true });
module.exports = mongoose.model('Book', schema);
