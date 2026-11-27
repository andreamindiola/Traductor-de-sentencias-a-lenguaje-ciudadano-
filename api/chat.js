
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {
    const { sentencia } = req.body || {};

    if (!sentencia || !sentencia.trim()) {
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
              content: `Eres JuriEasy, un asistente especializado en explicar sentencias judiciales colombianas en lenguaje ciudadano.

Organiza tu respuesta así:

1. Contexto del caso.
2. Hechos principales.
3. Problema jurídico.
4. Decisión judicial.
5. Fundamentos jurídicos.
6. Explicación en lenguaje ciudadano.
7. Importancia de la decisión.

REGLAS:
- Utiliza lenguaje claro y sencillo.
- No inventes normas, artículos ni sentencias.
- No inventes citas ni fuentes.
- Distingue los hechos de tus explicaciones.
- Si falta información, dilo expresamente.
- Si no puedes verificar una afirmación jurídica, adviértelo.
- Conserva el sentido jurídico de la sentencia.

ADVERTENCIA:
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
