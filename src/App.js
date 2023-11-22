import { useState } from "react";
import "./App.css";

function App() {
  const [value, setValue] = useState("");

  const clickHandler = async () => {
    console.log(value);
    try {
      const Res = await fetch("http://localhost:8000/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: value }),
      });
      const data = await Res.json();
      const fetchData = data[0]?.text?.value;
      console.log("data", data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="App">
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={clickHandler}>Submit</button>
    </div>
  );
}

export default App;
