// Allow offline startup while native Firestore waits for server acknowledgement.
export async function waitForInitialSync(sync: Promise<unknown>, timeoutMs = 4000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      sync,
      new Promise<void>(resolve => { timer = setTimeout(resolve, timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
