export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('uncaughtException', (err: any) => {
      if (err?.code === 'ECONNRESET' || err?.message?.includes('aborted')) {
        // Ignore client disconnect / aborted connection errors
        return;
      }
      console.error('Uncaught Exception:', err);
    });
  }
}
