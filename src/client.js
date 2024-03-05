const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaXRscmVzZndkdWlzamtnY3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1NjgwMDcsImV4cCI6MjAyNTE0NDAwN30.sxZGSE40uoGztRn6aY_1ZXnIXKXFZWyf1Z8Th9RwXwI";
const url = "https://ybitlresfwduisjkgczx.supabase.co";
const database = supabase.createClient(url, key);

//dom elements
const state = document.getElementById("state");
const tableName = "button";

document.addEventListener("DOMContentLoaded", async () => {
  //subscribe to changes in the
  database
    .channel(tableName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: tableName },
      (payload) => {
        handleInserts(payload.new);
        console.log(payload.new);
      }
    )
    .subscribe();

  //select all data from touch
  let { data, error } = await database.from(tableName).select("*");
  handleInserts(data[0]);
});

function handleInserts(data) {
  state.innerHTML = data.state;;
}
