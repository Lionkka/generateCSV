const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    id: {
        type: String,
        trim: true,
        required: true,
        unique: true
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
});
module.exports = mongoose.model('Book', schema);
