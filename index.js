const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

// Mongoose
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schemas and Models
const ExerciseSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  description: String,
  duration: Number,
  date: Date,
});

const Exercise = mongoose.model("Exercise", ExerciseSchema);

//---

const UserSchema = new mongoose.Schema({
  username: String,
});
const User = mongoose.model("User", UserSchema);

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// GET Requests
app
  .get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
  })
  .get("/api/users", async (req, res) => {
    try {
      const users = await User.find({});
      if (!users) {
        res.send("Could not found!");
      } else {
        res.json(users);
      }
    } catch (err) {
      res.status(500).send("There was a mistake searching the users!");
    }
  })
  .get("/api/users/:_id/logs", async (req, res) => {
    const { from, to, limit } = req.query;
    const id = req.params._id;

    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).send("User is not found!");
      }

      const query = { user_id: user._id };
      if (from || to) {
        query.date = {};
        if (from) {
          query.date.$gte = new Date(from);
        }
        if (to) {
          query.date.$lte = new Date(to);
        }
      }

      const exercise = await Exercise.find(query)
        .limit(+limit || 500)
        .lean(); // Using 'lean()' for improved performance

      const log = exercise.map((e) => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString(),
      }));

      res.json({
        _id: user._id,
        username: user.username,
        count: exercise.lenght,
        log,
      });
    } catch (err) {
      res
        .status(500)
        .send("An error occurred while fetching the exercise log!");
    }
  });

// POST Requests
app
  .post("/api/users", async (req, res) => {
    try {
      const user = new User({
        username: req.body.username,
      });
      await user.save();
      res.json(user);
    } catch (err) {
      res.status(400).json({
        error: err.message,
      });
    }
  })
  .post("/api/users/:_id/exercises", async (req, res) => {
    const id = req.params._id;
    const { description, duration, date } = req.body;

    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).send("User is not found!");
      }

      const exercise = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date(),
      });
      await exercise.save();

      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      });
    } catch (err) {
      res.status(500).send("There was an error saving the exercise!");
    }
  });

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
