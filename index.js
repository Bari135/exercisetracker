const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser');


require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema;
const logSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String }
});
const userSchema = new Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: {type:[logSchema], default: []}
});

const User = mongoose.model('User', userSchema);
const Log = mongoose.model('Log', logSchema);

app.route('/api/users').post((req, res) => {
  const username = req.body.username;
  const newUser = new User({ username: username });
  newUser.save((err, data) => {
    if (err) return console.error(err);
    res.json({ username: data.username, _id: data._id });
  });
}).get((req, res) => {
  User.find({}, {username:1}, (err, data) => {
    if (err) return console.error(err);
    res.json(data);
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const description = req.body.description;
  const duration = parseInt(req.body.duration);
  const date = req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString();
  
  const newLog = new Log({ description: description, duration: duration, date: date });
  User.findById(userId, (err, user) => {
    if (err) return console.error(err);
    user.log.push(newLog);
    user.count++;
    user.save((err, data) => {
      if (err) return console.error(err);
      res.json({
        _id: data._id, 
        username: data.username,
        date: date, 
        duration: duration,
        description: description});
    });
  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  User.findById(userId, (err, user) => {
    if (err) return console.error(err);
    if (!user) return res.json({error: 'User not found'});
    
    let filteredLogs = user.log.map(log => ({
        description: log.description,
        duration: log.duration,
        date: new Date(log.date).toDateString()
      }));
    
    if (from) {
      const fromDate = new Date(from);
      filteredLogs = filteredLogs.filter(log => new Date(log.date) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      filteredLogs = filteredLogs.filter(log => new Date(log.date) <= toDate);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(0, limit);
    }

    res.json({_id: user._id, username: user.username, count: user.count, log: filteredLogs});
  });
});




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
