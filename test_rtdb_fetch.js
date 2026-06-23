async function test() {
  try {
    console.log("Fetching RTDB URL...");
    const res = await fetch("https://wobblecraft23-default-rtdb.firebaseio.com/queue.json");
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
test();
