import { useState } from "react";
import "./App.css";

function App() {

  const [sentencia, setSentencia] = useState("");
  const [resultado, setResultado] = useState(null);


  function traducirSentencia() {

    if(sentencia.trim() === ""){
      alert("Por favor ingrese una sentencia");
      return;
    }


    setResultado({

      decision:
      "La decisión judicial resolvió el conflicto presentado, determinando los derechos y obligaciones de las partes involucradas.",


      aplica:
      "La decisión aplica principalmente a las personas, entidades o situaciones que tengan relación con los hechos analizados por el juez.",


      precedente:
      "El fallo establece un criterio jurídico que puede servir como orientación para resolver futuros casos similares."

    });

  }


  return (

    <div className="contenedor">


      <h1>
        ⚖️ Traductor de Sentencias
        <br/>
        a Lenguaje Ciudadano
      </h1>


      <p>
        Herramienta que transforma decisiones judiciales
        complejas en explicaciones sencillas para ciudadanos.
      </p>


      <textarea

        placeholder="Pegue aquí el texto de una sentencia judicial..."

        value={sentencia}

        onChange={(e)=>setSentencia(e.target.value)}

      />


      <br/>


      <button onClick={traducirSentencia}>
        Analizar sentencia
      </button>



      {resultado && (

        <div className="resultado">


          <h2>
            📄 Resumen ciudadano
          </h2>


          <h3>
            ¿Qué decidió?
          </h3>

          <p>
            {resultado.decision}
          </p>



          <h3>
            ¿A quién aplica?
          </h3>

          <p>
            {resultado.aplica}
          </p>



          <h3>
            ¿Qué precedente deja?
          </h3>

          <p>
            {resultado.precedente}
          </p>


        </div>

      )}


    </div>

  );

}


export default App;