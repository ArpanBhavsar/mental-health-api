// Suggested code may be subject to a license. Learn more: ~LicenseLog:677015903.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:1071513562.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:1532754585.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:2448952298.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:2101544715.
import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config();


const app = express();
app.use(express.json());
// Replace the placeholder with your actual connection string
const uri = process.env.MONGO_URI;
if(!uri) console.error("MONGO_URI not found in env files")
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectToDatabase() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    return client;
  } finally {
    
  }
}

connectToDatabase().then((connectedClient) => {
    app.post('/signup', async (req, res) => {
        const { name, email, password } = req.body;
        try {
            const usersCollection = connectedClient.db('mental_health_app').collection("users");
            const result = await usersCollection.insertOne({ name, email, password });
            res.status(201).json({ message: 'User created', userId: result.insertedId });
        } catch (error) {
            console.error("Error creating user:", error);
            res.status(500).json({ message: 'Error creating user' });
        }
    });
});

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});

const port = parseInt(process.env.PORT || '3000');
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});