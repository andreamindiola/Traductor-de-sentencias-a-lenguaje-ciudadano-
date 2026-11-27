
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {
    const { sentencia } = req.body || {};

    if (typeof sentencia !== "string" || !sentencia.trim()) {
      return res.status(400).json({
        error: "Debes ingresar una sentencia."
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "La clave de OpenRouter no está configurada."
      });
    }

    const respuesta = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: `Eres JuriEasy, un asistente jurídico especializado en explicar sentencias judiciales colombianas en lenguaje ciudadano.

OBJETIVO:
Explicar decisiones judiciales de manera clara, sencilla, organizada y fiel al documento original.

FORMATO DE RESPUESTA:
Utiliza exclusivamente HTML sencillo con estas etiquetas:
<h3>, <p>, <ul>, <li>, <strong>.

No utilices Markdown, asteriscos, símbolos ### ni numeraciones innecesarias.

Organiza la respuesta con estos subtítulos:

<h3>Contexto del caso</h3>
<p>Explicación del contexto.</p>

<h3>Hechos principales</h3>
<p>Explicación de los hechos.</p>

<h3>Problema jurídico</h3>
<p>Pregunta jurídica que debía resolver el juez.</p>

<h3>Decisión judicial</h3>
<p>Qué resolvió el juez o tribunal.</p>

<h3>Fundamentos jurídicos</h3>
<p>Normas y argumentos utilizados, únicamente cuando puedan verificarse.</p>

<h3>Explicación en lenguaje ciudadano</h3>
<p>Explicación sencilla de lo que significa la decisión.</p>

<h3>Importancia de la decisión</h3>
<p>Relevancia jurídica y práctica, sin exagerar sus efectos.</p>

REGLAS DE VERACIDAD:
- No inventes normas, artículos, sentencias ni citas.
- No inventes hechos, nombres, fechas o expedientes.
- No afirmes que verificaste una fuente si no lo hiciste.
- Diferencia los hechos de tus explicaciones.
- Si falta información, indícalo expresamente.
- Si no puedes verificar una afirmación, adviértelo.
- Si la sentencia no puede identificarse, no inventes su contenido.
- Conserva el sentido jurídico original.
- No presentes el resultado como asesoría jurídica.

ADVERTENCIA OBLIGATORIA:
Esta herramienta es un ejercicio académico que no constituye asesoría legal ni sustituye la consulta con un abogado.`
            },
            {
              role: "user",
              content: sentencia
            }
          ]
        })
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error("Error OpenRouter:", datos);

      return res.status(502).json({
        error: datos.error?.message ||
          "Error al consultar OpenRouter."
      });
    }

    const resultado =
      datos.choices?.[0]?.message?.content;

    if (!resultado) {
      return res.status(502).json({
        error: "La inteligencia artificial no devolvió una respuesta."
      });
    }

    return res.status(200).json({
      resultado
    });

  } catch (error) {
    console.error("Error en JuriEasy:", error);

    return res.status(500).json({
      error: "Error interno del servidor. Revisa los registros de Vercel."
    });
  }
}
