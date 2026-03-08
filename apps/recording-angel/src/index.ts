const PORT = Number(process.env.PORT) || 3001;

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    return new Response("Recording Angel API", { status: 200 });
  },
});

console.log(`Recording Angel API running on port ${server.port}`);
