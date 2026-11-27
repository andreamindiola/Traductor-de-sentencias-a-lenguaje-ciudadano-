
import { readFile } from "node:fs/promises";
import path from "node:path";

const DOCUMENTOS = [
  { archivo: "constitucion.txt", nombre: "Constitución Política de Colombia" },
  { archivo: "codigo-civil.txt", nombre: "Código Civil" },
  { archivo: "codigo-comercio.txt", nombre: "Código de Comercio" },
  { archivo: "codigo-penal.txt", nombre: "Código Penal" },
  {
    archivo: "codigo-sustantivo-trabajo.txt",
    nombre: "Código Sustantivo del Trabajo"
  },
  { archivo: "cpaca.txt", nombre: "Código de Procedimiento Administrativo y de lo Contencioso Administrativo (CPACA)" }
];

const STOPWORDS = new Set([
  "para", "como", "donde", "cuando", "desde", "hasta", "sobre",
  "entre", "este", "esta", "estos", "estas", "aquel", "aquella",
  "tiene", "tienen", "puede", "pueden", "debe", "deben",
  "porque", "pero", "sino", "tambien", "solo", "toda", "todo",
  "todos", "todas", "ser", "estar", "haber", "hacer", "decir",
  "cual", "cuales", "quien", "quienes", "que", "una", "uno",
  "unos", "unas", "los", "las", "del", "por", "con", "sin",
  "sus", "sus", "son", "fue", "sea", "hay", "muy", "mas",
  "menos", "cada", "otro", "otra", "otros", "otras",
  "sentencia", "juridica", "juridico", "colombia", "colombiano"
]);

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function obtenerTerminos(texto) {
  return normalizar(texto)
    .match(/[a-z0-9]{3,}/g) || [];
}

function identificarArticulo(texto) {
  const coincidencia = texto.match(
    /\b(?:ART[IÍ]CULO|ARTICULO|ART\.?)\s*(\d+[A-Z]?(?:\s*(?:BIS|TER|QUATER))?)/i
  );

  return coincidencia ? `Artículo ${coincidencia[1]}` : null;
}

function dividirDocumento(texto) {
  const limpio = texto.replace(/\r/g, "").trim();

  // Separar por encabezados de artículos cuando existan.
  const partes = limpio.split(
    /(?=(?:^|\n)\s*(?:ART[IÍ]CULO|ARTICULO|ART\.)\s*\d+)/gi
  );

  const fragmentos = [];

  for (const parte of partes) {
    const contenido = parte.trim();

    if (!contenido) continue;

    // Dividir fragmentos demasiado extensos.
    for (let i = 0; i < contenido.length; i += 3000) {
      const fragmento = contenido.slice(i, i + 3000).trim();

      if (fragmento.length > 80) {
        fragmentos.push(fragmento);
      }
    }
  }

  return fragmentos;
}

async function buscarEnCorpus(consulta) {
  const terminos = obtenerTerminos(consulta)
    .filter(termino => !STOPWORDS.has(termino));

  const frecuencias = {};

  for (const termino of terminos) {
    frecuencias[termino] = (frecuencias[termino] || 0) + 1;
  }

  const documentosRecuperados = [];

  for (const documento of DOCUMENTOS) {
    const ruta = path.join(
      process.cwd(),
      "corpus",
      documento.archivo
    );

    const contenido = await readFile(ruta, "utf8");
    const fragmentos = dividirDocumento(contenido);

    for (const fragmento of fragmentos) {
      const textoNormalizado = normalizar(fragmento);

      let puntuacion = 0;
      const coincidencias = [];

      for (const termino of Object.keys(frecuencias)) {
        if (textoNormalizado.includes(termino)) {
          puntuacion += Math.min(frecuencias[termino], 2);
          coincidencias.push(termino);
        }
      }

      if (puntuacion >= 2) {
        documentosRecuperados.push({
          nombre: documento.nombre,
          archivo: documento.archivo,
          articulo: identificarArticulo(fragmento),
          fragmento,
          puntuacion,
          coincidencias
        });
      }
    }
  }

  documentosRecuperados.sort(
    (a, b) => b.puntuacion - a.puntuacion
  );

  // Evitar enviar fragmentos repetidos del mismo contenido.
  return documentosRecuperados.slice(0, 6).map(
    (documento, indice) => ({
      id: `F${indice + 1}`,
      ...documento
    })
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido."
    });
  }

  try {
    const { sentencia } = req.body || {};

    if (
      typeof sentencia !== "string" ||
      !sentencia.trim()
    ) {
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

    // PRIMERA ETAPA: recuperar información del corpus.
    const fuentes = await buscarEnCorpus(sentencia);

    const contextoCorpus = fuentes.length
      ? fuentes.map(fuente => `
[FUENTE ${fuente.id}]
Documento: ${fuente.nombre}
Archivo: ${fuente.archivo}
Artículo identificado: ${fuente.articulo || "No identificado expresamente"}
Fragmento documental:
${fuente.fragmento}
`).join("\n\n")
      : "NO SE ENCONTRARON FRAGMENTOS RELEVANTES EN EL CORPUS. No afirmes que consultaste una norma ni inventes citas.";

    // SEGUNDA ETAPA: consultar OpenRouter con las fuentes recuperadas.
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

Tu tarea es explicar el documento proporcionado y utilizar las fuentes recuperadas del corpus jurídico.

REGLA PRINCIPAL DE VERACIDAD:
Las fuentes recuperadas son el único respaldo documental disponible en esta consulta. No inventes artículos, normas, sentencias, citas, fechas ni referencias.

REGLAS PARA CITAR:
- Identifica las fuentes con sus códigos [F1], [F2], etc.
- Coloca la referencia [F1] inmediatamente después de la afirmación jurídica respaldada por esa fuente.
- Solo atribuye a una fuente información que aparezca en su fragmento.
- No inventes números de artículos.
- Si el fragmento no permite identificar un artículo, cita únicamente el documento.
- Si no hay fuentes recuperadas, dilo expresamente.
- No presentes conocimientos generales del modelo como si provinieran del corpus.
- Diferencia los hechos narrados en la sentencia de las normas recuperadas.
- No afirmes que una norma fue consultada si no aparece en las fuentes.

FORMATO:
Responde exclusivamente en HTML sencillo.
Utiliza solamente: <h3>, <p>, <ul>, <li>, <strong>.

Organiza la explicación con estos apartados:

<h3>Contexto del caso</h3>
<h3>Hechos principales</h3>
<h3>Problema jurídico</h3>
<h3>Decisión judicial</h3>
<h3>Fundamentos jurídicos</h3>
<h3>Explicación en lenguaje ciudadano</h3>
<h3>Importancia de la decisión</h3>

Si falta información, explica qué dato no se puede establecer.
Si no hay respaldo documental, no inventes una explicación normativa.

ADVERTENCIA:
Esta herramienta es un ejercicio académico que no constituye asesoría legal ni sustituye la consulta con un abogado.`
            },
            {
              role: "user",
              content: `DOCUMENTO O CONSULTA DEL USUARIO:

${sentencia}

FUENTES RECUPERADAS DEL CORPUS:

${contextoCorpus}

Explica el contenido de manera fiel y utiliza las referencias [F1], [F2], etc., para respaldar las afirmaciones jurídicas.`
            }
          ]
        })
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error("Error OpenRouter:", datos);

      return res.status(502).json({
        error:
          datos.error?.message ||
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

    // Las fuentes se agregan desde el servidor, no desde la IA.
    const listaFuentes = fuentes.length
      ? fuentes.map(fuente => `
<li>
<strong>[${fuente.id}] ${fuente.nombre}</strong>.
${fuente.articulo || "Fragmento sin artículo identificado"}.
Archivo: ${fuente.archivo}.
</li>`).join("")
      : "<li>No se encontraron fuentes pertinentes en los seis documentos del corpus para esta consulta.</li>";

    const resultadoFinal = `
${resultado}
<h3>Fuentes consultadas en el corpus</h3>
<ul>${listaFuentes}</ul>
<p><strong>Alcance de las fuentes:</strong> las referencias corresponden a fragmentos recuperados de los documentos disponibles en el proyecto. Su presencia no demuestra por sí sola que sean suficientes para resolver todos los aspectos del caso.</p>
<p><strong>Advertencia:</strong> Esta herramienta es un ejercicio académico que no constituye asesoría legal ni sustituye la consulta con un abogado.</p>
`;

    return res.status(200).json({
      resultado: resultadoFinal,
      fuentes: fuentes.map(fuente => ({
        id: fuente.id,
        documento: fuente.nombre,
        archivo: fuente.archivo,
        articulo: fuente.articulo,
        coincidencias: fuente.coincidencias
      })),
      corpusConsultado: true
    });

  } catch (error) {
    console.error("Error en JuriEasy:", error);

    return res.status(500).json({
      error: "Error interno del servidor. Revisa los registros de Vercel."
    });
  }
}
