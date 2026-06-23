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
     const myFavoritesCollections = db.collection('favorites')
     const planCollection = db.collection('plans')
     const subsCollection = db.collection('subscriptions')
  



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
 


// ================== get functions ======================

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

    // recipe by user id

   app.get('/api/recipe/authorId', verifyToken, async (req, res) => { 
  try {
   
    const authorId = req.query.authorId; 
    const query = {};

    if (authorId) {
      query.authorId = authorId;
    }

    const cursor = recipeCollection.find(query);
    const result = await cursor.toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// favorite recipe 
app.get('/app/myFavorites', verifyToken, verifyUser, async (req, res) => {
  const userId = req.query.userId;
  const query ={}
  if(req.query.userId) {
     query.userId = req.query.userId
  }
 
  const cursor = myFavoritesCollections.find(query)
  const result = await cursor.toArray()
  res.json(result)
} )

// plans
app.get('/api/plans', async (req, res) => {
  try {
    const query = {};
    if (req.query.planId) {
      query.planId = req.query.planId;
    }

    // find() ব্যবহার করে তোলপাড়া করে খোঁজা এবং array-তে নেওয়া
    const result = await planCollection.find(query).toArray();
    
    // যদি আপনি একটি মাত্র অবজেক্ট চান (অ্যারে না চান) এবং ডাটা পাওয়া যায়:
    // res.json(result[0] || null); 
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


    // =============== post functions ============================
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

    // favorite recipe posting
    app.post('/app/myFavorites', verifyToken, verifyUser, async (req, res) => {
  try {
    const data = req.body;
    const { _id, ...recipeData } = data; // আগের নিয়মে অরিজিনাল _id আলাদা করে নিলাম

    const recipeId = _id;
    const userId = recipeData.userId; // আপনার রিকোয়েস্টে যেভাবে userId পাঠাচ্ছেন (অথবা req.user.id থেকেও নিতে পারেন)

    // ১. চেক করুন এই ইউজার একই রেসিপি আগে ফেভারিট করেছে কি না
    const query = { userId: userId, recipeId: recipeId };
    const alreadyFavorited = await myFavoritesCollections.findOne(query);

    if (alreadyFavorited) {
      // যদি আগে থেকেই ডাটা থাকে, তবে এখানেই রেসপন্স পাঠিয়ে ফাংশন থামিয়ে দিন
      return res.status(400).json({ 
        success: false, 
        message: "You have already added this recipe to your favorites!" 
      });
    }

    // ২. যদি আগে ফেভারিট না করা থাকে, তবেই নতুন ডাটা তৈরি করুন
    const favorite = {
      ...recipeData,
      recipeId: recipeId,
      createdAt: new Date()
    };

    // ৩. ডেটাবেজে ইনসার্ট করুন
    const result = await myFavoritesCollections.insertOne(favorite);
    
    res.status(201).json({ 
      success: true, 
      message: "Added to favorites successfully", 
      data: result 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// subs post api
app.post('/api/subs', verifyToken, async (req, res) => {
  const data = req.body
  const subsInfo = {
    ...data, 
    createdAt: new Date()
  }
  const result = await subsCollection.insertOne(subsInfo);

  // update user data
    const filter = {email: data.customerEmail}

    const updateDocument = {
      $set: {
        plan: data.planId
      }
    }
    const updateResult = userCollection.updateOne(filter, updateDocument)



  res.json(updateResult)

})



    // ================ patch functions ============================
    // recipe update with id
    
    app.patch('/api/recipes', verifyToken, verifyUser, async (req, res) => {
      try{
         const id = req.body.id
      
      if (!id) {
            return res.status(400).json({ success: false, message: "ID not found" });
        }

        const updatedData = req.body
        if(!updatedData) {
           return res.status(400).json({ success: false, message: "Data not found" });
        }
        const query = {_id: new ObjectId(id)}
    // একটি খালি আপডেট অবজেক্ট তৈরি করা
        const updateFields = {};

        //  updatedData-এর প্রতিটি ফিল্ড চেক করে শুধু ভ্যালিড ফিল্ডগুলো নেওয়া
        for (const key in updatedData) {
            // আমরা id ফিল্ডটি আপডেট করতে চাই না, এবং খালি স্ট্রিং ("") বাদ দিতে চাই
            if (key !== 'id' && updatedData[key] !== "") {
                updateFields[key] = updatedData[key];
            }
        }

        // যদি এমন হয় যে ইউজার শুধু খালি ফিল্ডই পাঠিয়েছে 
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ success: false, message: "No valid fields to update" });
        }

        // ৩. মঙ্গোডিবিতে আপডেট করা
        const result = await recipeCollection.updateOne(query, { $set: updateFields });

        if (result.modifiedCount === 0) {
            return res.status(200).json({ success: true, message: "No changes made to the recipe" });
        }

        return res.status(200).json({ success: true, message: "Recipe updated successfully" });

    }
     catch (error){
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal server error" });
     }




    })

    // user profile update
     app.patch('/api/user', verifyToken, verifyUser, async (req, res) => {
      try{
         const id = req.body.id
      
      if (!id) {
            return res.status(400).json({ success: false, message: "ID not found" });
        }

        const updatedData = req.body
        if(!updatedData) {
           return res.status(400).json({ success: false, message: "Data not found" });
        }
        const query = {_id: new ObjectId(id)}
    // একটি খালি আপডেট অবজেক্ট তৈরি করা
        const updateFields = {};

        //  updatedData-এর প্রতিটি ফিল্ড চেক করে শুধু ভ্যালিড ফিল্ডগুলো নেওয়া
        for (const key in updatedData) {
            // আমরা id ফিল্ডটি আপডেট করতে চাই না, এবং খালি স্ট্রিং ("") বাদ দিতে চাই
            if (key !== 'id' && updatedData[key] !== "") {
                updateFields[key] = updatedData[key];
            }
        }

        // যদি এমন হয় যে ইউজার শুধু খালি ফিল্ডই পাঠিয়েছে 
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ success: false, message: "No valid fields to update" });
        }

        // ৩. মঙ্গোডিবিতে আপডেট করা
        const result = await userCollection.updateOne(query, { $set: updateFields });

        if (result.modifiedCount === 0) {
            return res.status(200).json({ success: true, message: "No changes made to the recipe" });
        }

        return res.status(200).json({ success: true, message: "Recipe updated successfully" });

    }
     catch (error){
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal server error" });
     }




    })


 // =============== delete functions =====================
app.delete('/api/recipes', verifyToken, verifyUser, async (req, res) => {
  try {
    const id = req.query.id; // ১. আগে আইডি রিসিভ করুন
    console.log(id, 'deleted recipe id'); // ২. তারপর লগ করুন

    // আইডি না থাকলে সার্ভার ক্র্যাশ করতে না দিয়ে আগেই রিটার্ন করুন
    if (!id || id === 'undefined') {
      return res.status(400).json({ success: false, message: "Valid ID is required" });
    }

    const query = { _id: new ObjectId(id) };
    const result = await recipeCollection.deleteOne(query);
    
    // সবসময় রেসপন্স হিসেবে json পাঠানো ভালো প্র্যাকটিস
    return res.json(result); 

  } catch (error) {
    console.error("Express Delete Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});








  



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