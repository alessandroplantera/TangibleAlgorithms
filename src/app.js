const tableName = "button";
const id = 1;

const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaXRscmVzZndkdWlzamtnY3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1NjgwMDcsImV4cCI6MjAyNTE0NDAwN30.sxZGSE40uoGztRn6aY_1ZXnIXKXFZWyf1Z8Th9RwXwI";
const url = "https://ybitlresfwduisjkgczx.supabase.co";
const database = supabase.createClient(url, key);

// let bool = true;
// updateSupabase(bool);
async function updateSupabase(state) {
  // console.log("updateSupabase ", state);
  let res = await database
    .from(tableName)
    .update({
      state: state,
    })
    .eq("id", id);
}

// if (currentImageIndex_state === 0) {
//   console.log("supabase false");
//   updateSupabase(false);
// } else if (currentImageIndex_state === 1) {
//   console.log("supabase true");
//   updateSupabase(true);
// } else {
//   console.log("null");
//   updateSupabase(null);
// }
