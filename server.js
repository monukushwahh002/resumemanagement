const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, "views")));

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
  file: {
    data: Buffer,
    contentType: String,
    fileName: String
  }
}, { timestamps: true });

const Resume = mongoose.model("Resume", resumeSchema);

// Routes to serve HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/leads", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "leads.html"));
});

// Resume upload setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// API to submit resume
app.post("/api/resumes", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, phone, role, experience, source } = req.body;
    if (!req.file) return res.status(400).json({ message: "Resume file required." });

    const newResume = new Resume({
      name,
      email,
      phone,
      role,
      experience,
      source,
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

// API to get resumes
app.get("/api/resumes", async (req, res) => {
  try {
    const resumes = await Resume.find({}, "name email phone role experience source _id createdAt");
    res.status(200).json(resumes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching resumes" });
  }
});

// Download resume
app.get("/api/resumes/:id/download", async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume || !resume.file) return res.status(404).send("Resume not found");

    res.set({
      "Content-Type": resume.file.contentType,
      "Content-Disposition": `attachment; filename="${resume.file.fileName}"`
    });

    res.send(resume.file.data);
  } catch (err) {
    res.status(500).send("Download error");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
