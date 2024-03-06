const tableName = "button";

const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZnJxemF2Y215dmxhdmRkcW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3MjEwMTcsImV4cCI6MjAyNTI5NzAxN30._JaMrMxwnZMgkkwsRJn8syjdBHyasHWGCkp0WgQL-14";
const url = "https://dbfrqzavcmyvlavddqny.supabase.co";
const database = supabase.createClient(url, key);

// let bool = true;
// updateSupabase(bool);
async function updateSupabase(variableName, newValue) {
  const { data, error } = await database
    .from(tableName) // Replace with your actual table name
    .update({
      state: newValue, // Assuming you are updating 'val' for safe_or_not or state for others
    })
    .eq("variable", variableName); // Matches rows where the 'variable' column equals 'variableName'
  console.log(
    "Update successful for variable:",
    variableName,
    "Response:",
    newValue
  );
}

// Example call to update 'state' for 'image_index'
// await updateSupabase('image_index', newStateValue);

// // Example call to update 'val' for 'safe_or_not'
// await updateSupabase('safe_or_not', newBooleanValue);

// // Example call to update 'state' for 'current_state'
// await updateSupabase('current_state', newStateValue);

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
