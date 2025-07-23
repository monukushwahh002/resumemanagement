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

// MongoDB
const MONGO_URI = "mongodb+srv://resumemanagemnt:fairmonukumar@cluster0.2tpvq.mongodb.net/resumeDB?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Mongo connected"))
    .catch(err => console.error(err));

// File uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Schema
const ResumeSchema = new mongoose.Schema({
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
const Resume = mongoose.model("Resume", ResumeSchema);

// Serve static files
app.use(express.static(path.join(__dirname, "views")));

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/leads", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "leads.html"));
});

app.post("/api/resumes", upload.single("resume"), async (req, res) => {
    try {
        const { name, email, phone, role, experience } = req.body;
        const resume = new Resume({
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
        await resume.save();
        res.status(200).json({ message: "Resume uploaded" });
    } catch (err) {
        res.status(500).json({ message: "Upload failed" });
    }
});

app.get("/api/resumes", async (req, res) => {
    try {
        const resumes = await Resume.find({}, "name email phone role experience _id");
        res.json(resumes);
    } catch (err) {
        res.status(500).json({ message: "Error fetching resumes" });
    }
});

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

// Fallback: Any unknown route
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "404.html")); // Optional fallback page
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
