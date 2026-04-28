// Banco completo de hooks para guiones de Ezequiel Lamas.
// Fuente: reporte_sistema_scripting.md §8 (149 verbales) + §9 (24 visuales).
// Cada hook conserva su número original. Los hooks "PRIORITARIOS para Ezequiel"
// están marcados con ★ y deben ser preferidos cuando aplican.

export const HOOK_BANK = `
====================================================================
BANCO DE HOOKS VERBALES (149)
====================================================================
Categorizados por tipo de gancho. El campo hook_reference debe identificar
EL hook elegido (ej. "verbal #82" o "verbal #82 + visual #13").

--- A. NEGATIVOS / STOP ---
1.  Nunca [agrega algo que nunca deberían hacer relacionado con el video].
9.  Nunca [hagas esto]. Aquí está el porqué.  ★
10. Por qué nunca deberías ____.
15. Deja de (hacer) ____.
16. Deja de desplazarte si eres ____.
50. Deja de ___.
66. Por qué dejé de [hacer algo].  ★
138. Deja de cometer este error en (industria).
139. No intentes esto si no quieres (resultado altamente deseado).
140. Si quieres (resultado), evita esto como (algo malo).
142. No compres (producto), mejor compra esto (producto).

--- B. TARGETING (filtran audiencia explícita) ---
2.  No mires esto si no eres principiante en [nicho].
3.  Este video es solo para principiantes en [nicho].
5.  Si [haces/eres] ____, necesitas saber esto.  ★
6.  Si eres ____, necesitas/debes/tienes que ____.  ★
52. Si estás en tus 20s/30s/40s, ___.
53. Necesitas saber esto antes de tener 20/30/40 etc.
129. Si estás ___, puedes estar en problemas.

--- C. AUTORIDAD / EXPERIENCIA PERSONAL ---
8.  Siempre [haz esto]. Aquí está el porqué.
11. Por qué siempre deberías ____.
18. Cómo pasé de ___ a ___.  ★
33. Cómo yo [algo que haces o hiciste].
40. Cómo superé [obstáculo o desafío].
62. Cómo [algo] cambió mi vida.
81. Lo que aprendí de [experiencia].
109. Me tomó ____ años para darme cuenta ___.
110. Me acabo de dar cuenta que he estado haciendo mal _____ toda mi vida.
131. De todas las anteriores [acción pasada], la más difícil/mejor/interesante ha sido ____.
132. Cómo pasé de x a (resultado) en (tiempo).

--- D. CURIOSIDAD / MISTERIO ---
17. El secreto para [tema].
25. La perturbadora razón detrás de ___.
34. No quieren que sepas sobre ___.  ★
37. Secretos de [nicho o tema] de los que nadie más está hablando.
38. Secretos internos para [insertar resultado deseado].
41. El lado oscuro de [insertar tema].
43. La impactante verdad sobre [insertar tema].
46. La verdad detrás de [tema que puede ser controversial].  ★
71. La verdad incómoda sobre [tema].
74. Lo que nadie te dice sobre [tema].
91. La historia no contada de [tema].
94. La sorprendente verdad sobre [tema].

--- E. CONTRARIANS / DEBATE ---
13. [Tema] trata completamente sobre [palabra clave].  ★
35. [Insertar creencia popular] es en realidad un mito.
36. Por qué [creencia o tema] es en realidad una trampa.
57. El mito desmentido de [tema].
70. [Número] mitos sobre [tema] desmentidos.
76. El peor consejo que jamás hemos escuchado sobre [tema].
82. Por qué todos están equivocados sobre [tema].  ★
111. ____ no se trata de ___ vs. _____.
126. ___ es muy diferente a lo que pensabas.

--- F. NÚMEROS / LISTAS ---
45. ___ [cosas/herramientas/consejos en un nicho específico] que probablemente no conocías.
64. [Número] de formas de mejorar en [habilidad/nicho].
73. [Número] hábitos para transformar tu [algo].
77. [Número] razones por las que [algo] es imprescindible.
83. [Número] secretos para [lograr algo] rápidamente.
85. [Número] errores que debes evitar en [tema].
92. [Número] cosas que [grupo de personas] hace diferente.
93. Cómo dominar [tema] en [número] pasos.
96. [Número] formas en que [tema] te está frenando.
99. [Número] razones para amar [algo].
113. Estas son (número) ____ que no puedo vivir si no los tengo.
121. Pienso que estas son las (número) mejores formas para ___.
122. Si pudiera elegir los mejores ___ para (nicho), estas serían.
135. Las 5 razones por las que no (resultado altamente deseado).
137. Las 5 razones por las que deberías (acción).
141. 3 maneras/formas para (resultado) sin (problema común).
143. 5 tips para conseguir (resultado) mucho más rápido.

--- G. PREGUNTAS ---
26. ¿Por qué [tema que vas a explicar]?  ★
28. ¿Sabías que [dato sorprendente]?
31. ¿Quieres ___?
32. [Haz una pregunta sobre el tema del video].
136. ¿Por qué nadie está hablando acerca de estos tips de (industria)?

--- H. COMPARATIVOS / VS ---
4.  Si te gusta ____, ¡te encantará ____!
80. [Algo] vs. [Algo]: Lo que realmente necesitas saber.
107. No uses (Herramienta común), usa esto mejor (herramienta).
123. Esta es la razón por la cual es más fácil ____ que un/a ____.

--- I. PROMESAS / RESULTADOS RÁPIDOS ---
21. Cómo voy a ___.
42. Cómo [resultado deseado] en solo [insertar cantidad de tiempo] con este truco.
44. Cómo [insertar habilidad o actividad] sin gastar un centavo.
49. Maneras probadas de ___.
51. La forma más rápida de ___.
106. Te voy a enseñar cómo puedes generar $10K/mes y no te preocupes que esté saturado, la mayoría de la gente va a seguir scrolleando.
119. No hay ninguna razón por la que te debería tomar (tiempo) para alcanzar ___.

--- J. STEAL / HACK / CHEAT CODE ---
14. Roba esta estrategia de [tema].  ★
20. Usa este truco para ___.  ★
104. Este es el Cheatcode, de los cheatcodes, (nicho) van a estar molestos cuando te muestre esto.  ★
105. Aquí te va un hack de (Nicho), que la mayoría de personas no saben.  ★
108. Así es como puedes robar legalmente ___.
134. Este es el hack (industria) que me cambió la vida.

--- K. PRUEBA SOCIAL / REFERENCIAS ---
12. Prueba de que [método] funciona.
23. Le pedí a un/a ___ que me contara ___.
29. [Persona popular] dijo que ___.  ★
30. [Persona popular] hace/usa ___, aquí está por qué tú también deberías.
63. Lo que [persona influyente] no te dice sobre [tema].
90. Lo que [persona influyente] acierta sobre [tema].
145. Otros (tu título) te están mintiendo.
147. Estos (libros, podcasts, canales de YouTube, websites) cambiaron mi vida.
148. Esta es mi opción favorita para (resultado/temática).

--- L. SHOCK / EXTREMOS / MORBO ---
101. Si le debiera dinero al cartel y necesitara conseguir $1000, más rápido de lo que lo he hecho nunca.
102. Esto no te hará tan rico como Elon Musk pero ___.
103. Maneras poco éticas de _____ p2.
112. Si ____ no fuera algo normal, sería una _____ baneada.
118. ___ son tan buenos para ___ que de hecho están baneados.

--- M. SIMPLIFICACIÓN ---
22. [Simplemente di el título del video usando hasta 10 palabras].
59. [Algo] explicado en menos de [tiempo].
67. El cambio más pequeño para mejorar tu [tema].
69. Lo único que desearía haber sabido sobre [tema].

--- N. SEÑALES DE PROBLEMA / DIAGNÓSTICO ---
24. Señales de que tú ___.
39. Errores comunes que [nicho] comete.
65. El gran error que todos cometen con [tema].
68. Cómo evitar el mayor error en [nicho].
144. Si no puedes conseguir (resultado), es probablemente porque te estás olvidando de esto.

--- O. TENDENCIAS / TIMING ---
56. El futuro de [tema].
72. Cómo [tema] está revolucionando [nicho].
130. ___ está avanzando mucho más rápido de lo que la gente piensa.
146. Si no has escuchado acerca de las noticias sobre (industria), estás viviendo bajo una piedra.

--- P. APRENDIZAJE / GUÍAS ---
19. Cómo empezar en/con ___.
55. Cómo se hace/funciona [tema].
60. Lo que REALMENTE necesitas saber sobre [tema].
61. Los mejores consejos de [tema] para [año].
78. Cómo ser un experto en [tema] sin esfuerzo.
79. La guía definitiva para sobrevivir a [situación].
84. Cómo hacer [algo] como un profesional.
98. Lo que debes saber antes de empezar con [tema].

--- Q. CIENCIA / PSICOLOGÍA / TEORÍA ---
27. Hay una teoría de que [introduce la teoría y explícala o refútala].
54. La ciencia detrás de [tema].  ★
86. La psicología detrás de [tema].  ★

--- R. URGENCIA / ACCIÓN INMEDIATA ---
47. Esta única cosa/consejo cambiará tu vida.
48. Cómo arruinar tu ___.
75. Por qué [tema] es tu mayor ventaja.
87. [Algo] que debes empezar a hacer hoy mismo.
88. Por qué [algo] es más importante de lo que piensas.
89. Cómo [tema] puede ayudarte a [lograr algo].
117. Tú eres la única persona que te está impidiendo ____.

--- S. ANTES/DESPUÉS ---
58. Antes y después de [algo], lo que nadie te cuenta.
95. [Algo]: Lo que realmente significa para ti.

--- T. APALANCAMIENTO / FILOSÓFICOS ---
115. No apalancarte de ____ está poniendo en una desventaja abismal a ____.
116. Esta es la razón por la que ____.
124. Esta es probablemente ___.
125. People who start ___ always make this one mistake that ends up [negative outcome].
127. Creo que acabo de encontrar ____.
128. Dile adiós a ___.
133. No vas a creer (increíble claim).

--- U. OPINIÓN / DECLARACIÓN ---
7.  Cómo SIEMPRE/NUNCA [insertar tema].
97. Cómo [tema] cambió el mundo.
114. Esta ni siquiera es mi opinión.
120. Probablemente ya sabes sobre ____.
149. Apuesto a que no has escuchado acerca de (resultado/tema/problema).

====================================================================
BANCO DE HOOKS CREATIVOS / VISUALES (24)
====================================================================
Estos son FORMATOS de ejecución visual, NO copy. Se combinan con un hook verbal.
El campo visual_hook_format es un entero 1-24.

| # | Formato | Mecánica | Cuándo usar |
|---|---|---|---|
| 1 | Carita recortada sobre imagen | Foto de fondo + carita low-fi superpuesta | Hooks controversiales; sensación de effortless |
| 2 | Pantalla dividida analizando un video | Reaccionás a un clip de tu sector | Reacción a tendencia / refutar opinión |
| 3 | Situación hipotética + texto pantalla | "Imaginate que..." + texto que NO repite el audio (doble tiro) | Storytelling especulativo |
| 4 | Comienzo movido | Caminando, gesticulando, en acción | Romper estática inmediata |
| 5 | Entrevista random | Le preguntás a alguien en la calle | Validación social externa |
| 6 | Suspenso | Pausa, mirada, build de tensión | Revelaciones grandes |
| 7 | Lifestyle cinematic | Plano cinematográfico | Inspiracional / aspiracional contextualizado |
| 8 | Clip de otra persona relevante | Reposteás con tu comentario | Apoyarte en autoridad ajena |
| 9 | Actuación representando tu público | Actuar un dolor del avatar | Identificación inmediata |
| 10 | Querés X pero te pasa Y + 3 pasos | Estructura completa visible desde el hook | Tutoriales rápidos |
| 11 | "6 datos X sobre X" | Listicle puro | SEO + alta retención |
| 12 | "¿Qué es mejor?" | Pregunta directa que cuestiona | Debate + comentarios |
| 13 | "No es que X, es que Y" | Reframe de un debate del nicho | Contrarian con explicación |
| 14 | Acción contraintuitiva / WTF + explicación | Hacer algo raro/morboso y después explicar | Corte de patrón fuerte |
| 15 | Dar vuelta a una frase repetida | Tomar un cliché y refutarlo | Autoridad de pensamiento |
| 16 | "No hay que volverse loco, simplemente X" | Simplificación brutal | Anti-overthinking |
| 17 | "Dicen que + dato curioso + explicación" | Mito popular + tu take | Educacional viral |
| 18 | Explicación mientras hacés acción | Voice-over sobre B-roll de vos haciendo algo | Building in public puro |
| 19 | "Solo hay 5 mandamientos que un X jamás debe incumplir" | Reglas inquebrantables | Autoridad + listicle |
| 20 | "Hay un libro/película que dice X + moraleja" | Cita ajena + tu interpretación | Modelos mentales |
| 21 | (no usado) | — | — |
| 22 | "Si tenés una situación mala como X..." | Empatía con dolor + pivot a solución | Diagnóstico + alivio |
| 23 | "Antes X, ahora Y + explicación" | Transformación visible | Building in public con resultados |
| 24 | "Si te pasa X cuando Y, mirá estos 4 videos" | Carrusel curado de recursos | Autoridad + valor masivo gratis |

NOTA IMPORTANTE: el formato visual #13 ("No es que X, es que Y") es válido como FORMATO VISUAL aunque el patrón verbal "no es X es Y" esté prohibido como AI-tell. Cuando uses #13, ejecutá la mecánica visualmente (split screen / contraste) sin caer en la frase exacta como muletilla escrita.
`.trim();
