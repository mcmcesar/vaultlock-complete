const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  user: { type: String, required: true },
  originalName: { type: String, required: true },
  storedName: { type: String, required: true },
  size: { type: Number, required: true },
  uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);
