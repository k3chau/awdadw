const express = require('express');
const multer = require('multer');
const cors = require('cors');
const pdf = require('pdf-parse');
const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Configure OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Log the API key (first few characters) to verify it's loaded
console.log('API Key loaded:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : 'Not found');

app.use(cors());
app.use(express.json());

app.post('/generate-flashcards', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the PDF file
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdf(dataBuffer);
    
    // Extract text from PDF
    const text = pdfData.text;

    // Generate flashcards using GPT-4
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Create flashcards from the following text. Format each flashcard as a JSON object with 'question' and 'answer' fields. Generate at least 5 flashcards if there's enough content."
        },
        {
          role: "user",
          content: text
        }
      ],
    });

    // Parse the generated flashcards
    const flashcardsText = completion.data.choices[0].message.content;
    const flashcards = JSON.parse(flashcardsText);

    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);

    // Return the flashcards with a generated ID
    const response = {
      id: Date.now().toString(),
      flashcards: flashcards
    };

    res.json(response);
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Error processing file' });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 