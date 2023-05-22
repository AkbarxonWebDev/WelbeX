const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

mongoose.connect("mongodb://127.0.0.1:27017/myapp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});
const User = mongoose.model("User", userSchema);

const blogSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  message: String,
  author: String,
});
const Blog = mongoose.model("Blog", blogSchema);

const createInitialPosts = async () => {
  try {
    const initialUsers = [
      {
        username: "john_doe",
        password: "password1",
        email: "john@example.com",
      },
      {
        username: "jane_smith",
        password: "password2",
        email: "jane@example.com",
      },
    ];

    await User.insertMany(initialUsers);
    const initialPosts = [
      {
        message: "First post",
        author: "John Doe",
      },
      {
        message: "Second post",
        author: "Jane Smith",
      },
    ];
    await Blog.insertMany(initialPosts);

    console.log("Initial records created successfully");
  } catch (error) {
    console.error("Error creating initial records:", error);
  }
};

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  createInitialPosts();
});

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
    });
    await user.save();
    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      res.status(404).json({ message: "User not found" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ userId: user._id }, "secret_key");
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/protected", (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, "secret_key");
    const userId = decoded.userId;
    res.status(200).json({ message: "Access granted" });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

app.post("/blogs", async (req, res) => {
  try {
    const { date, message } = req.body;
    const blog = new Blog({
      date,
      message,
      author: req.user.id,
    });

    await blog.save();
    res.status(200).json({ message: "Blog post created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/blogs", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const count = await Blog.countDocuments();

    const totalPages = Math.ceil(count / limit);

    const startIndex = (page - 1) * limit;

    const blogs = await Blog.find().skip(startIndex).limit(limit);

    res.status(200).json({
      totalPages,
      currentPage: page,
      blogs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/blogs/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const { message } = req.body;
    const post = await Blog.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to edit this post" });
    }

    const updatedPost = await Blog.findByIdAndUpdate(
      postId,
      { message },
      { new: true }
    );

    res.status(200).json({ message: "Post updated successfully", updatedPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/blogs/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Blog.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this post" });
    }

    const deletedPost = await Blog.findByIdAndDelete(postId);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
