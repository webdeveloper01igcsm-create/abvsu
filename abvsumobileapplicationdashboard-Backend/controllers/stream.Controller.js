const Stream = require('../models/Stream');

// Add Stream
exports.addStream = async (req, res) => {
  try {
    const stream = new Stream(req.body);
    await stream.save();
    res.status(201).json(stream);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get All Streams
exports.getAllStreams = async (req, res) => {
  try {
    const streams = await Stream.find();
    res.json(streams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Stream
exports.updateStream = async (req, res) => {
  try {
    const stream = await Stream.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    res.json(stream);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete Stream
exports.deleteStream = async (req, res) => {
  try {
    const stream = await Stream.findByIdAndDelete(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    res.json({ message: 'Stream deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};