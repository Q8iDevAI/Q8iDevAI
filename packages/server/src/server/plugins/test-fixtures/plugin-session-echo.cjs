process.on("message", (message) => {
  if (message?.type !== "q8idevai_frame") return;
  process.send?.(message);
});
