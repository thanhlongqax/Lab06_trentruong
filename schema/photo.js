const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const photoSchema = new Schema({
    albumId: { type: Schema.Types.ObjectId, ref: 'Album', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    url: { type: [String], required: true },
});

module.exports = mongoose.model('Photo', photoSchema);
