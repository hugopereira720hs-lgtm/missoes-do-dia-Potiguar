<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Missões do Dia – Potiguar Creativa</title>
    <!-- Carrega Tailwind CSS e aplica estilos básicos -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #0d0d0d; /* Fundo Escuro */
            color: #e5e5e5; /* Texto Claro */
        }
        /* Estilização da barra de rolagem para o modo escuro */
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-thumb {
            background-color: #ffd54f50;
            border-radius: 10px;
        }
        ::-webkit-scrollbar-track {
            background: #1c1c1c;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <!-- O script principal do seu aplicativo, onde o React é carregado -->
    <!-- O Cloudflare/Vite agora procurará pelo arquivo renomeado 'main.jsx' -->
    <script type="module" src="/main.jsx"></script>
</body>
</html>
