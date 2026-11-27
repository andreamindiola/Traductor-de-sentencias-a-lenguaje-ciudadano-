
import { useState } from "react";
import "./App.css";

function App() {
  const [sentencia, setSentencia] = useState("");
  const [resultado, setResultado] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function traducirSentencia() {
    if (!sentencia.trim()) {
      setError("Por favor, ingresa una sentencia.");
      return;
    }

    setCargando(true);
    setError("");
    setResultado("");

    try {
      const respuesta = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sentencia })
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No fue posible analizar la sentencia.");
      }

      setResultado(datos.resultado);

    } catch (err) {
      setError(err.message || "Error de conexión. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="contenedor">
      <h1>
        ⚖️ JuriEasy
        <br />
        Traductor de Sentencias
      </h1>

      <p>
        Del lenguaje jurídico complejo a explicaciones claras para todos.
      </p>

      <p>
        Comprende las decisiones judiciales colombianas
        mediante inteligencia artificial.
      </p>

      <div className="advertencia">
        Esta herramienta es un ejercicio académico que no constituye
        asesoría legal ni sustituye la consulta con un abogado.
      </div>

      <textarea
        placeholder="Pega aquí el texto de una sentencia judicial..."
        value={sentencia}
        onChange={(e) => setSentencia(e.target.value)}
        disabled={cargando}
      />

      <br />

      <button onClick={traducirSentencia} disabled={cargando}>
        {cargando ? "Analizando sentencia..." : "⚖️ Analizar sentencia"}
      </button>

      {cargando && (
        <p>La inteligencia artificial está analizando el documento. Espera un momento...</p>
      )}

      {error && (
        <div className="resultado">
          <h3>Atención</h3>
          <p>{error}</p>
        </div>
      )}

     {resultado && (
  <div className="resultado">
    <h2>📄 Resultado del análisis ciudadano</h2>
    <div
      className="respuesta-ia"
      dangerouslySetInnerHTML={{ __html: resultado }}
    />
  </div>
)}
    </div>
  );
}

export default App;
