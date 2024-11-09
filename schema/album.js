const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const albumSchema = new Schema({
    title: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }]
});

module.exports = mongoose.model('Album', albumSchema);
