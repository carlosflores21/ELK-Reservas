const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  guest: { type: String, default: "None" },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  isBooked: { type: Boolean, default: false },
});

module.exports = mongoose.model('Room', RoomSchema);
