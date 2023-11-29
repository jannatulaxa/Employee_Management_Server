// const { ObjectId } = require('mongodb');
const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5002;

//  <----------Middle ware --------->
app.use(
  cors({
    origin: ["http://localhost:5173"],

    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send([{ Massage: "UnAuthorize" }]);
  }

  jwt.verify(token, process.env.SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send([{ Massage: "UnAuthorize" }]);
    } else {
      req.user = decoded;
      next();
    }
  });
};

//  <-------------------------------MongoDB Server --------------------------->

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_U_NAME}:${process.env.DB_PASS}@cluster0.iatiqfv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // <--------------------- Collection in database -------------->

    const usersData = client.db("officeManagementDb").collection("usersInfo");
    // const AboutUserData = client.db("ForumDb").collection("aboutUser");
    // const postsData = client.db("ForumDb").collection("postsInfo");

    //<------------------Verify Admin----------------->

    const verifyAdmin = async (req, res, next) => {
      const email = req.user.sendingUser;
      const query = { email: email };
      const AdminCK = await usersData.findOne(query);
      try {
        if (AdminCK?.role !== "Admin") {
          res.status(403).send({ message: "Forbidden Access" });
        }
      } catch {
        console.log("sorry");
      }
      next();
    };
    //<------------------JWT For Protection----------------->

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET, { expiresIn: "1h" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production" ? true : false,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ Success: "Cookies Set Successfully" });
    });

    app.post("/logout", async (req, res) => {
      res.clearCookie("token", { maxAge: 0 }).send({ Cookie: "clear" });
    });

    //<------------------User Info Database----------------->

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const exeistUser = await usersData.findOne(query);

      if (exeistUser) {
        return res.send({
          massage: "User Already Exist",
          acknowledged: true,
          insertedId: null,
        });
      }
      const result = await usersData.insertOne(user);
      res.send(result);
    });
    app.get("/employ", async (req, res) => {
      const query = { role: "Employe" };
      const result = await usersData.find(query).toArray();
      res.send(result);
    });
    app.patch("/employVerified", async (req, res) => {
      const id = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          verified: "yes",
        },
      };
      const result = await usersData.updateOne(filter, updateDoc, options);
      res.send(result);
    });
    app.get("/users/admin", verifyToken, async (req, res) => {
      const email = req.query.email;
      const result = await usersData.findOne({ email });

      if (result) {
        res.send(result);
      } else {
        res
          .status(404)
          .send({ message: "User not found for the provided email." });
      }
    });

    // app.get("/users/manage", verifyToken, verifyAdmin, async (req, res) => {
    //   // console.log("7")
    //   const searchQuery = req.query.uName;
    //   const regex = new RegExp(searchQuery, "i");
    //   if (searchQuery === "all") {
    //     const result = await usersData.find().toArray();
    //     res.send(result);
    //   } else {
    //     const result = await usersData.find({ name: regex }).toArray();
    //     res.send(result);
    //   }
    // });
    // app.get("/users/admin/:email", verifyToken, async (req, res) => {
    //   // console.log("8")
    //   const email = req.params.email;
    //   if (email === req.user.sendingUser) {
    //     const query = { email: email };
    //     const result = await usersData.findOne(query);
    //     let admin = false;

    //     if (result.role === "Admin") {
    //       admin = true;

    //       res.send({ admin });
    //     }
    //   } else {
    //     res.status(403).send([{ Massage: "Forbidden Access", status: 403 }]);
    //   }
    // });
    // app.patch("/users/admin/:id", verifyToken,verifyAdmin, async (req, res) => {
    //     const id = req.params.id;
    //     const filter = { _id: new ObjectId(id) };
    //     const options = { upsert: true };
    //     const updateDoc = {
    //       $set: {
    //         role: "Admin",
    //       },
    //     };
    //     const result = await usersData.updateOne(filter, updateDoc, options);
    //     res.send(result);
    //   }
    // );
    // app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await usersData.deleteOne(query);
    //   res.send(result);
    // });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Management is Managing!");
});

app.listen(port, () => {
  console.log(`Management is Managing on port ${port}`);
});
