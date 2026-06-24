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
     const purchasedRecipes = db.collection('purchasedRecipes')
     const featuredCollection = db.collection('featured')
     const reportCollection = db.collection('reports')
  



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

// user verification 
const verifyAdmin = async(req, res, next) => {
  const user = await req.user
  if(user.role !== 'admin'){
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
    
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

    // all subscriptions fetching
    app.get('/api/subscriptions', verifyToken, verifyAdmin, async (req, res) => {
    
   
      const cursor = subsCollection.find();
      const recipes = await cursor.toArray();
      res.json(recipes);
    }
)


// geting purchased recipe 
app.get('/api/purchased', verifyToken, verifyUser, async(req, res) => {
  const userEmail = req.query.email;
  const query = {}
  if(req.query.email){
    query.customerEmail = userEmail
  }
  const result = await purchasedRecipes.find(query).toArray()
  res.json(result)
  
})


// checking purchased recipe
app.get('/api/check-purchase', verifyToken, async (req, res) => {
  try {
    const { customerEmail, recipeId } = req.query;

    if (!recipeId) {
      return res.json({ canPurchase: true }); // রেসিপি আইডি না থাকলে (যেমন সাধারণ সাবস্ক্রিপশন) কিনতে পারবে
    }

    const query = { customerEmail, recipeId };
    const alreadyPurchased = await purchasedRecipes.findOne(query);

    if (alreadyPurchased) {
      return res.json({ 
        canPurchase: false, 
        message: "You have already purchased this recipe!" 
      });
    }

    return res.json({ canPurchase: true });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


// getting reports by admin
app.get('/api/reports', verifyToken, verifyAdmin, async (req, res) => {
  const cursor = reportCollection.find()
  const result = await cursor.toArray()
  res.json(result)
})


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

// admin recipe featuring toggle (Add / Remove)
app.post('/api/featuring', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const data = req.body;
    const recipeId = data._id; // রেসিপির মূল আইডি

    if (!recipeId) {
      return res.status(400).json({ success: false, message: "Recipe ID is required" });
    }

    // ১. চেক করুন এই রেসিপি আগে থেকেই ফিচারড করা হয়েছে কি না
    const query = { recipeId: recipeId };
    const alreadyFeatured = await featuredCollection.findOne(query);

    // ২. রেসিপি কালেকশন আপডেট করার ফিল্টার (ObjectId নিশ্চিত করার জন্য)
    const recipeFilter = { _id: new ObjectId(recipeId) };

    if (alreadyFeatured) {
      // ---- কন্ডিশন A: যদি আগে থেকেই ফিচারড থাকে, তবে রিমুভ করতে হবে ----
      
      // ১. ফিচারড কালেকশন থেকে ডিলিট করুন
      await featuredCollection.deleteOne(query);

      // ২. রেসিপি কালেকশনে isFeatured ফিল্ড false করে দিন
      await recipeCollection.updateOne(recipeFilter, {
        $set: { isFeatured: false }
      });

      return res.status(200).json({ 
        success: true, 
        message: "Removed from featured successfully",
        isFeatured: false
      });

    } else {
      // ---- কন্ডিশন B: যদি ফিচারড না করা থাকে, তবে নতুন করে যুক্ত করতে হবে ----
      
      // ডাটার মূল _id বাদ দিয়ে নতুন অবজেক্ট তৈরি
      const { _id, ...restOfData } = data; 
      const featured = {
        ...restOfData,
        recipeId: recipeId,
        createdAt: new Date()
      };

      // ১. ডেটাবেজে ইনসার্ট করুন
      const result = await featuredCollection.insertOne(featured);
      
      // ২. রেসিপি কালেকশনে isFeatured ফিল্ড true করে দিন
      await recipeCollection.updateOne(recipeFilter, {
        $set: { isFeatured: true }
      });

      return res.status(201).json({ 
        success: true, 
        message: "Added to featured successfully", 
        isFeatured: true,
        data: result 
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});



// subs post api
app.post('/api/subs', verifyToken, async (req, res) => {
  try {
    const data = req.body;
    const subsInfo = {
      ...data,
      createdAt: new Date()
    };

    const userEmail = subsInfo.customerEmail;
    const recipeId = subsInfo.recipeId;
    const sessionId = subsInfo.sessionId; // <--- সেশন আইডিটি আলাদা করে নেওয়া হলো

    // ==========================================
    // ১. যদি recipeId থাকে (নির্দিষ্ট কোনো রেসিপি কেনা হচ্ছে)
    // ==========================================
    if (recipeId) {
      // প্রথমে চেক করব এই সেশন আইডি দিয়ে ইতিমধ্যে কেনা হয়েছে কি না (রিফ্রেশ প্রোটেকশন)
      if (sessionId) {
        const sessionCheck = await purchasedRecipes.findOne({ sessionId: sessionId });
        if (sessionCheck) {
          return res.status(200).json({ // ডুপ্লিকেটের জন্য ২০০ (সাকসেস) পাঠানোই ভালো, কারণ পেমেন্ট অলরেডি ডান
            success: true,
            message: "This purchase has already been recorded!"
          });
        }
      }

  
      const query = { customerEmail: userEmail, recipeId: recipeId };
      const alreadyPurchased = await purchasedRecipes.findOne(query);

      if (alreadyPurchased) {
        return res.status(400).json({
          success: false,
          message: "You have already purchased this recipe!"
        });
      }

  
      const result = await purchasedRecipes.insertOne(subsInfo);

      return res.status(201).json({
        success: true,
        message: "Recipe purchased successfully",
        data: result
      });
    }

    // ==========================================
    // ২. যদি recipeId না থাকে (সাধারণ কোনো সাবস্ক্রিপশন বা প্ল্যান কেনা হচ্ছে)
    // ==========================================
    if (!recipeId) {
      // সেশন আইডি দিয়ে চেক করব এই সাবস্ক্রিপশন আগে সেভ হয়েছে কি না (রিফ্রেশ প্রোটেকশন)
      if (sessionId) {
        const sessionCheck = await subsCollection.findOne({ sessionId: sessionId });
        if (sessionCheck) {
          return res.status(200).json({
            success: true,
            message: "This subscription has already been recorded!"
          });
        }
      }

      // ডাটা না থাকলে নতুন করে ইনসার্ট হবে
      const result = await subsCollection.insertOne(subsInfo);

      // ইউজার ডাটা আপডেট (প্ল্যান আপডেট)
      const filter = { email: userEmail };
      const updateDocument = {
        $set: { plan: data.planId }
      };
      await userCollection.updateOne(filter, updateDocument);

      return res.status(201).json({
        success: true,
        message: "Subscription added successfully",
        data: result
      });
    }

  } catch (error) {
    console.error("Error in /api/subs:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});


// report posting
app.post('/api/reports', verifyToken, verifyUser, async(req, res) => {

  try {
const report = req.body
  if(!report){
    return  res.status(400).json({
          success: false,
          message: "Report Not Found"
        });
  }

  const userId = req.body.userId
  const recipeId = req.body.recipeId
  const  query = {userId : userId, recipeId: recipeId}
  const isReported = await reportCollection.findOne(query)
  if(isReported){
    return  res.status(400).json({
          success: false,
          message: "You already Reported"
        });
  }

  const result = reportCollection.insertOne(report)
  return  res.status(200).json({
          success: true,
          message: "Thank you for your report. We will review it.",
          data: result
        });
  } 
  catch (error) {
    // যেকোনো এরর হলে ক্যাচ ব্লকে চলে আসবে এবং সার্ভার ক্র্যাশ করবে না
    console.error("Error in /api/reports:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

  


    // ================ patch functions ============================
    // recipe update with id
    
    app.patch('/api/recipes', verifyToken, async (req, res) => {
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

// Admin user block
app.patch('/api/admin/user-status', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const id = req.body.id;
        const blockedInput = req.body.blocked;

        if (!id) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }
        
        if (blockedInput === undefined || blockedInput === null || blockedInput === "") {
            return res.status(400).json({ success: false, message: "Blocked value is required" });
        }

  // স্ট্রিং-কে বুলিয়ানে কনভার্ট করা
        const isBlocked = blockedInput === "true" || blockedInput === true;

        const query = { _id: new ObjectId(id) };
        
        // ২ নম্বর সমস্যার সমাধান: মঙ্গোডিবির $set আগে থেকে ফিল্ড না থাকলেও নতুন করে তৈরি করে দেবে
        const result = await userCollection.updateOne(query, { $set: { blocked: isBlocked } });

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (result.modifiedCount === 0) {
            return res.status(200).json({ success: true, message: "No changes made to user status" });
        }

        const statusMessage = isBlocked ? "User blocked successfully" : "User unblocked successfully";
        return res.status(200).json({ success: true, message: statusMessage });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});


 // =============== delete functions =====================


// delete recipe form user and admin
 app.delete('/api/recipes', verifyToken, async (req, res) => {
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

// favorite recipe delete from user
 app.delete('/api/favorite', verifyToken, verifyUser, async (req, res) => {
  try {
    const id = req.query.id; // ১. আগে আইডি রিসিভ করুন
    console.log(id, 'deleted recipe id'); // ২. তারপর লগ করুন

    // আইডি না থাকলে সার্ভার ক্র্যাশ করতে না দিয়ে আগেই রিটার্ন করুন
    if (!id || id === 'undefined') {
      return res.status(400).json({ success: false, message: "Valid ID is required" });
    }

    const query = { _id: new ObjectId(id) };
    const result = await myFavoritesCollections.deleteOne(query);
    
    // সবসময় রেসপন্স হিসেবে json পাঠানো ভালো প্র্যাকটিস
    return res.json(result); 

  } catch (error) {
    console.error("Express Delete Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// report recipe remove
app.delete('/api/report', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // ১. রিকোয়েস্টের বডি থেকে আইডি দুটি নেওয়া হচ্ছে
    const { recipeId, _id } = req.body;

    if (!recipeId || !_id) {
      return res.status(400).json({ message: "recipeId and report id are required" });
    }

    // ২. রেসিপি কালেকশন থেকে ডিলিট করা
    const recipeResult = await recipeCollection.deleteOne({
      _id: new ObjectId(recipeId)
    });

    // ৩. রিপোর্ট কালেকশন থেকে ডিলিট করা
    const reportResult = await reportCollection.deleteOne({
      _id: new ObjectId(_id)
    });

    // ৪. রেসপন্স পাঠানো
    if (recipeResult.deletedCount === 0 && reportResult.deletedCount === 0) {
      return res.status(404).json({ message: "No recipe or report found to delete" });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Recipe and report deleted successfully" 
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

// report remove

// report recipe remove
app.delete('/api/reportRemove', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // ১. রিকোয়েস্টের বডি থেকে আইডি দুটি নেওয়া হচ্ছে
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({ message: " report id are required" });
    }

   
  

    // ৩. রিপোর্ট কালেকশন থেকে ডিলিট করা
    const reportResult = await reportCollection.deleteOne({
      _id: new ObjectId(_id)
    });

    // ৪. রেসপন্স পাঠানো
    if ( reportResult.deletedCount === 0) {
      return res.status(404).json({ message: "No report found to delete" });
    }

    return res.status(200).json({ 
      success: true, 
      message: "report deleted successfully" 
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});









  








  } catch(err) {
    console.error(err);
    
  }
}

 

run().catch(console.dir);

app.listen(port, () => {
  console.log(`recipe hub server is running in ${port}`)
})