const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

require("dotenv").config();
const app = express();


const port = process.env.PORT || 5001;
const uri =
  "mongodb+srv://pioneer:RncaygBTR6ZZhrGS@cluster0.go1mcti.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
let userCollection;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


app.use(cors());
app.use(express.json());


app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Missing fields or username already exists
 *       500:
 *         description: Failed to register user
 */

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing fields!" });
  }

  try {
    await client.connect();

    const existingUser = await userCollection.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await userCollection.insertOne({
      username,
      password: hashedPassword,
    });
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Log in with username and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       401:
 *         description: Invalid password
 *       403:
 *         description: Username or password is missing
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to login
 */

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(403).json({ error: "username or password is missing" });
  }

  try {
    await client.connect();
    // Find the user by username
    const user = await userCollection.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Compare the hashed password
    if (await bcrypt.compare(password, user.password)) {
      // Generate JWT token
      const token = jwt.sign({ username }, process.env.JWT_SECRET);
      res.json({ username: user, username, token });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

/**
 * @swagger
 * /publicapi:
 *   get:
 *     summary: Get public API data
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter data by category
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit the number of results
 *     responses:
 *       200:
 *         description: Successfully retrieved public API data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Number of entries
 *                 entries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Entry'
 *       500:
 *         description: Internal server error
 */

app.get("/publicapi", async (req, res) => {
  try {
    const { category, limit } = req.query;
    console.log(req.query);
    let apiUrl = `https://api.publicapis.org/entries?category=${
      category ? category : ""
    }`;

    // const encodedCategory = category ? encodeURIComponent(category) : "";
    // console.log(encodedCategory);

    // Fetch data from the public API with query parameters
    const response = await axios.get(apiUrl);

    const entries = response.data.entries;

    // Apply limit to the entries array
    const limitedEntries =
      limit && entries.length > 0 ? entries.slice(0, limit) : entries;

    // Return the fetched data with limited entries
    res.json({ count: limitedEntries.length, entries: limitedEntries });
  } catch (error) {
    console.error("Error fetching data:", error.message);
    res.status(500).json({ error: "Failed to fetch data from the public API" });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.status(401).json({ error: "Invalid token" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: err.message });
    req.user = user;
    next();
  });
}

/**
 * @swagger
 * /protected:
 *   get:
 *     summary: Get protected data
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully accessed protected route
 *       401:
 *         description: Unauthorized - Missing or invalid token
 */

app.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "Protected route accessed successfully" });
});

app.get("/", (req, res) => {
  res.send("Welcome to Pioneer Lab!");
});

async function run() {
  try {
    await client.connect();
    userCollection = client.db("pioneer_lab").collection("users");

    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error connecting to the database:", error);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
