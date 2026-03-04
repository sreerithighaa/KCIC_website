require("dotenv").config();

const fastify = require("fastify")({ logger: true });
const pool = require("./db/pool");
fastify.register(require("@fastify/view"), {
  engine: { ejs: require("ejs") },
  templates: "./views"
});

// Render index.ejs
fastify.get("/", async (request, reply) => {
    try{
 const result = await pool.query("SELECT * FROM posts");
  return reply.view("index", { posts: result.rows });
    }catch(error){
        console.error("Error fetching posts:", error);
    }
 
});

// Route to get posts from database
fastify.get("/posts", async (request, reply) => {
  const result = await pool.query("SELECT * FROM posts");
  return result.rows;
});

// Start server
fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server running at ${address}`);
});