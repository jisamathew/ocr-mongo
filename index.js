const express = require('express');
const Tesseract = require('tesseract.js');
const mongoose = require('mongoose');
const Document = require('./models/Document');
const fs = require('fs');
const path = require('path');
const TesseractComponent = require('./TesseractComponent');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb+srv://jisa-anu-2024:jisaanu2024@cluster0.jfbx4.mongodb.net/sample_hscode?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Use the bodyParser middleware to parse incoming JSON and URL-encoded payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Route to handle root URL
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


const tesseractComponent = new TesseractComponent(/* pass necessary parameters */);

app.get('/', (req, res) => {
    res.send('Welcome to the OCR App');
});
app.post('/upload', async (req, res) => {
    if (!req.body.file) {
        return res.status(400).json({ success: false, message: 'File data is missing' });
    }
    const file = req.files.file;
  // Process the uploaded file using the TesseractComponent
  try {
    await tesseractComponent.processUploadedFile('uploads/' + file.name);
    res.status(200).send('File uploaded and processed successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing file');
  }
    // const { name, data } = req.body.file;

    // // Ensure the 'uploads' directory exists
    // const uploadDir = path.join(__dirname, 'uploads');
    // if (!fs.existsSync(uploadDir)) {
    //     fs.mkdirSync(uploadDir);
    // }

    // const filePath = path.join(uploadDir, name);

    // // Write the file data to disk
    // fs.writeFileSync(filePath, Buffer.from(data, 'base64'));

    // const job = Tesseract.recognize(
    //     filePath,
    //     'eng',
    //     { logger: m => console.log(m) }
    // );

    // job.progress(progress => {
    //     Document.updateOne({ name: req.body.file.name }, { progress }, err => {
    //         if (err) console.error('Error updating progress:', err);
    //     });
    // });

    // try {
    //     const { data: { text } } = await job;
    //     const document = new Document({
    //         name: req.body.file.name,
    //         text,
    //         progress: 100,
    //         status: 'Completed'
    //     });
    //     await document.save();
    //     res.json({ success: true, document });
    // } catch (error) {
    //     console.error('Error processing document:', error);
    //     res.status(500).json({ success: false, message: 'Error processing document' });
    // }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
