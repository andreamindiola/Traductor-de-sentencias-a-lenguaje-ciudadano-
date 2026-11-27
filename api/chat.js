
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { sentencia } = req.body || {};

    if (!sentencia?.trim()) {
      return res.status(400).json({
        error: "Ingresa una sentencia para analizar."
      });
    
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "La clave de OpenRouter aún no está configurada."
      });
    }

    const respuesta = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: `Eres JuriEasy, asistente académico especializado en explicar sentencias colombianas en lenguaje ciudadano.

Explica la sentencia con esta estructura:

1. Contexto del caso.
2. Hechos principales.
3. Problema jurídico.
4. Decisión judicial.
5. Fundamentos jurídicos.
6. ¿A quién aplica?
7. Importancia o precedente.

REGLAS:
- Usa lenguaje claro y sencillo.
- No inventes normas, artículos ni sentencias.
- No inventes citas ni fuentes.
- Distingue lo que dice la sentencia de tus explicaciones.
- Si falta información, dilo expresamente.
- Si no puedes verificar una afirmación, adviértelo.
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
      return res.status(502).json({
        error: datos.error?.message || "Error al consultar la inteligencia artificial."
      });
    }

    const resultado = datos.choices?.[0]?.message?.content;

    if (!resultado) {
      return res.status(502).json({
        error: "La inteligencia artificial no devolvió una respuesta."
      });
    }

    return res.status(200).json({ resultado });

  } catch (error) {
    return res.status(500).json({
      error: "Error de conexión. Intenta nuevamente."
    });
  }
}

