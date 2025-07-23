const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB URI
const MONGO_URI = "mongodb+srv://resumemanagemnt:fairmonukumar@cluster0.2tpvq.mongodb.net/resumeDB?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB error", err));

// Serve static HTML files
app.use(express.static(path.join(__dirname, "views")));

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/leads", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "Leads.html"));
});

// Define storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Define schema and model
const resumeSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    role: String,
    experience: String,
    file: {
        data: Buffer,
        contentType: String,
        fileName: String
    }
});
const Resume = mongoose.model("Resume", resumeSchema);

// Upload route
app.post("/api/resumes", upload.single("resume"), async (req, res) => {
    try {
        const { name, email, phone, role, experience } = req.body;
        const newResume = new Resume({
            name,
            email,
            phone,
            role,
            experience,
            file: {
                data: req.file.buffer,
                contentType: req.file.mimetype,
                fileName: req.file.originalname
            }
        });
        await newResume.save();
        res.status(200).json({ message: "Resume submitted successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Fetch resumes
app.get("/api/resumes", async (req, res) => {
    try {
        const resumes = await Resume.find({}, "name email phone role experience _id");
        res.json(resumes);
    } catch (err) {
        res.status(500).json({ message: "Error retrieving data" });
    }
});

// Download resume
app.get("/api/resumes/:id/download", async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume || !resume.file) return res.status(404).send("Not found");

        res.set({
            "Content-Type": resume.file.contentType,
            "Content-Disposition": `attachment; filename="${resume.file.fileName}"`
        });
        res.send(resume.file.data);
    } catch (err) {
        res.status(500).send("Error downloading file");
    }
});

// Fallback: Handle unknown paths
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, "views", "404.html")); // Create 404.html if you want
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
