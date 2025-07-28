const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // for CSS/images

// Session
app.use(
  session({
    secret: "my-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 1000 // 1 hour in milliseconds
    }
  })
);

// MongoDB
mongoose.connect(
  "mongodb+srv://resumemanagemnt:fairmonukumar@cluster0.2tpvq.mongodb.net/resumeDB?retryWrites=true&w=majority&appName=Cluster0",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Resume Schema
const resumeSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  role: String,
  experience: String,
  source: String,
  submittedDate: String,
  action: { type: String, default: "Pending" },
  file: {
    data: Buffer,
    contentType: String,
    fileName: String
  }
});

const Resume = mongoose.model("Resume", resumeSchema);

// Auth middleware (for protected routes)
function authMiddleware(req, res, next) {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    res.redirect("/login");
  }
}

// Public Home Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Login Page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

// Handle login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "12345") {
    req.session.authenticated = true;
    res.redirect("/dashboard");
  } else {
    res.send("❌ Invalid credentials. <a href='/login'>Try again</a>");
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// Protected Dashboard
app.get("/dashboard", authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});

// Protected Leads
app.get("/leads", authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "leads.html"));
});



// app.get("/logout", (req, res) => {
//   req.session.destroy(() => {
//     res.redirect("/login");
//   });
// });
// Multer config for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Submit Resume
app.post("/api/resumes", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, phone, role, experience, source, submittedDate } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Resume file required." });
    }

    const newResume = new Resume({
      name,
      email,
      phone,
      role,
      experience,
      source,
      submittedDate,
      file: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        fileName: req.file.originalname
      }
    });

    await newResume.save();
    res.status(200).json({ message: "✅ Resume submitted!" });
  } catch (error) {
    console.error("❌ Error saving resume:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all resumes
app.get("/api/resumes", async (req, res) => {
  try {
    const resumes = await Resume.find({}, "name email phone role experience source action submittedDate _id");
    res.status(200).json(resumes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching resumes" });
  }
});

// Download resume
app.get("/api/resumes/:id/download", async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume || !resume.file) {
      return res.status(404).send("Resume not found");
    }

    res.set({
      "Content-Type": resume.file.contentType,
      "Content-Disposition": `attachment; filename="${resume.file.fileName}"`
    });

    res.send(resume.file.data);
  } catch (err) {
    res.status(500).send("Download error");
  }
});

// Update action
app.put("/api/resumes/:id/action", async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!["Pending", "Selected", "Rejected"].includes(action)) {
    return res.status(400).json({ message: "Invalid action value" });
  }

  try {
    const updatedResume = await Resume.findByIdAndUpdate(
      id,
      { action },
      { new: true }
    );

    if (!updatedResume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    res.status(200).json({ message: "Action updated", data: updatedResume });
  } catch (err) {
    console.error("❌ Error updating action:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Dashboard chart data
app.get("/api/chart-data", async (req, res) => {
  try {
    const result = await Resume.aggregate([
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 }
        }
      }
    ]);

    const actions = ["Selected", "Pending", "Rejected"];
    const data = actions.map(action => {
      const found = result.find(item => item._id === action);
      return found ? found.count : 0;
    });

    res.json({ labels: actions, data });
  } catch (error) {
    console.error("❌ Error fetching chart data:", error);
    res.status(500).json({ message: "Server error while fetching chart data" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
