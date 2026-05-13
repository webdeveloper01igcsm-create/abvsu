const Session = require('../models/Session');

const addSession = async (req, res) => {
  try {
    const { session , isActive } = req.body;
    const year = parseInt(session.slice(0,4))
    const newSession = new Session({ session, isActive, year});
    await newSession.save();
    res.status(201).json(newSession);
  } catch (error) {
    if(error.code === 11000) {
      console.log(error);
  
      return res.status(409).json({success: false , message: `Duplicate Session ${error.keyValue.session || "unknown"}`})}
    res.status(400).json({ error: error.message });
  }
}

const getSession = async (req, res) => {
  const sessions = await Session.find();
  res.json(sessions);
}

const activeSession = async (req, res) => {
  const activeSession = await Session.findOne({ isActive: true });
  if (!activeSession) {
    return res.status(404).json({ message: 'No active session found' });
  }
  res.json(activeSession);
}

const updateSession = async (req, res) => {
  try {
    const session = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(session);
  } catch (error) {
    res.status(404).json({ error: 'Session not found' });
  }
}

const deleteSession = async (req, res) => {
  await Session.findByIdAndDelete(req.params.id);
  res.json({ message: 'Session deleted' });
}

module.exports = { addSession, activeSession, updateSession, deleteSession, getSession }