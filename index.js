const express = require('express')
const app = express()
const port = process.env.PORT || 8000
const cors = require('cors');
require('dotenv').config()

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_CONNECTION;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


app.use(cors())
app.use(express.json())




async function run() {
  try {
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");

    const db = client.db('recipe-hub-server')
    const recipeCollection = db.collection('recipe-collection')
    const sessionCollection = db.collection('session')
     const userCollection = db.collection('user')
  



    // verification related 
    const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'Unauthorized access'})
  }
  const token = authHeader.split(' ')[1]
   if(!token){
    return res.status(401).send({message: 'Unauthorized access'})
  }

  const query = {token: token}
  const session = await sessionCollection.findOne(query)

  if(!session) {
      return res.status(403).send({message: 'forbidden'})
  }
  const userQuery = {_id : session.userId}
  const user = await userCollection.findOne(userQuery)
  req.user = user
next()
}

// user verification 
const verifyUser = async(req, res, next) => {
  const user = await req.user
  if(user.role !== 'user'){
    return res.status(403).send({message: 'forbidden'})
  }

  next()
}



    app.get('/', (req, res) => {
      res.send('recipe hub server is running')
    })
 



    // all recipe fetching
    app.get('/api/recipes', async (req, res) => {
    
     



     
      const cursor = recipeCollection.find();
      const recipes = await cursor.toArray();
      res.json(recipes);
    }
)

// recipe by id fetching
 app.get('/api/recipes/:id', verifyToken, verifyUser, async (req, res) => {
      const id = req.params.id;
      console.log(id, 'id')
      
      const query = {_id: new ObjectId(id)} // ডাটায় যদি ম্যানুয়াল আইডি সেট করা থাকে তাহলে এভাবে। আর যদি ম্যানুয়ালি আইডি না থাকে তাহলে এভাবে - new ObjectId(id)

      const result = await recipeCollection.findOne(query);
      console.log(result, 'recipe')
      res.json(result)
    })

// recipe posting 
    app.post('/api/recipes', verifyToken, verifyUser, async (req, res) => {
      const recipe = req.body;
      const newRecipe = {
        ...recipe,
        createdAt: new Date()
      }
      console.log("Received:", recipe);
      const result = await recipeCollection.insertOne(newRecipe);
      res.json({ insertedId: result.insertedId.toString() })
    })





  



  // // job details data fetching
  // app.get('/api/jobs/:id', async (req, res) => {
  //   const id = req.params.id;
  //   const query = {_id : new ObjectId(id)}
  //   const result = await jobCollection.findOne(query)
  //   res.json(result)
    
  // })

 




  } catch(err) {
    console.error(err);
    
  }
}

 

run().catch(console.dir);

app.listen(port, () => {
  console.log(`recipe hub server is running in ${port}`)
})