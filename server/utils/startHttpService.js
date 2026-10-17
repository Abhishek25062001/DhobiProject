// Bind first so an occupied port fails before database initialization or seeding.
export async function startHttpService(app, { port, initialize, cleanup = async () => {} }) {
  app.locals.initializing = true;
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(port, () => {
      instance.removeListener('error', reject);
      resolve(instance);
    });
    instance.once('error', reject);
  }).catch(error => {
    if (error.code === 'EADDRINUSE') {
      error.message = `API port ${port} is already in use. Stop the other process, or set matching PORT and VITE_API_URL values in server/.env and client/.env. The API will not switch ports automatically.`;
    }
    throw error;
  });

  try {
    await initialize();
    app.locals.initializing = false;
    return server;
  } catch (error) {
    await new Promise(resolve => server.close(resolve));
    await cleanup();
    throw error;
  }
}
