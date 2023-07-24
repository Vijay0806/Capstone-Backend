// Import required dependencies
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import bodyParser from "body-parser";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json()); 

const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const ROLE_ID = {
  ADMIN: "0",
  NORMAL_USER: "1",
};

let db;

async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log("MongoDB is connected ☆☆☆");
    db = client.db("newairbnb");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

connectToMongoDB();

// export const createUser = async (data) => {
//   try {
//     // Create a deep copy of the data using JSON methods to remove circular references
//     const dataCopy = JSON.parse(JSON.stringify(data));
//     const response = await db.collection("users").insertOne(dataCopy);
//     return response.ops[0];
//   } catch (err) {
//     console.error("Error creating user:", err);
//     throw err;
//   }
// };


export const getUserByName = async (username, email) => {
  return await db.collection("users").findOne({ $and: [{ username: username }, { email: email }] });
};

export const generateHashPassword = async (password) => {
  const NO_ROUND = 10;
  const salt = await bcrypt.genSalt(NO_ROUND);
  const hashpassword = await bcrypt.hash(password, salt);
  console.log(salt);
  console.log(hashpassword);
  return hashpassword;
};

export async function createUser(data) {
    return await db.collection('users').insertOne(data);
  }
  
app.post("/signup", async (request, response) => {
    const { username, email, password } = request.body;
  
    try {
      const userFromDB = await getUserByName(username, email);
      if (userFromDB) {
        response.send({ message: "Username already exists" });
      } else if (password.length < 5) {
        response.send({ message: "Password must be at least 8 characters" });
      } else {
        const hashPassword = await generateHashPassword(password);
        const result = await createUser({
          username: username,
          email: email,
          password: hashPassword,
          roleId: 1, // Set the default roleId here
        });
        response.send(result);
      }
    } catch (error) {
      console.error("Error creating user:", error);
      response.status(500).send({ message: "Error creating user" });
    }
  });

app.post("/login", async (request, response) => {
  const { username, email, password } = request.body;

  try {
    const userFromDB = await getUserByName(username, email);

    if (!userFromDB) {
      response.status(401).send({ message: "Invalid data" });
    } else {
      const storedDBPassword = userFromDB.password;
      const isPasswordCheck = await bcrypt.compare(password, storedDBPassword);

      if (isPasswordCheck) {
        const token = jwt.sign({ id: userFromDB._id }, process.env.SECRET_KEY);
        console.log(token);
        response.send({ message: "Successful login", token: token, roleId: userFromDB.roleId });
      } else {
        response.status(401).send({ message: "Invalid data" });
      }
    }
  } catch (err) {
    console.error(err);
    response.status(500).send({ message: "Internal server error" });
  }
});

export const createProduct = async (req, res, next) => {
  try {
    const insertedResponse = await db.collection("products").insertOne(req.body);
    res.send(insertedResponse);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const productData = await db.collection("products").find().toArray();
    res.send(productData);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const updatedData = await db.collection("products").findOneAndUpdate(
      { _id: ObjectId(req.params.productId) },
      { $set: { ...req.body.product } },
      { returnOriginal: true }
    );
    res.send(updatedData);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const deletedData = await db.collection("products").remove({ _id: ObjectId(req.params.productId) });
    res.send(deletedData);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    res.status(400).json({ message: "Invalid JSON in request body." });
  } else {
    next();
  }
});



// Create a new router instance
const router = Router();

// Assuming you already have your MongoDB connection in the variable "db"

// Endpoint to create a new product
router.post('/products', createProduct);

// Endpoint to get all products
router.get('/products', getProduct);

// Endpoint to update a product
router.put('/products/:productId', updateProduct);

// Endpoint to delete a product
router.delete('/products/:productId', deleteProduct);

// Export the router
export default router;
app.use('/api', router);

app.use('/', (req, res)=>{
  res.send('☆☆☆☆Airbnb-Clone-Backend 🤩 ☆☆☆☆')
})

app.listen(PORT, () => console.log(`The Server is running at Port ☆☆☆ : ${PORT} `));
