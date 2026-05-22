# Onde Passa o Jogo? — Versão Google Apps Script

Esta versão usa:

- Site estático em `site/`
- Google Sheets como painel administrativo
- Google Apps Script como robô de busca e endpoint JSON
- Brave Search API para buscar fontes na web

## Estrutura

```txt
apps-script/
├── Codigo.gs
└── appsscript.json

site/
├── index.html
├── style.css
├── script.js
└── dados.json

modelo-planilha/
├── Jogos.csv
├── Canais.csv
└── Transmissoes.csv
```

## Como instalar

1. Crie uma Google Sheets nova.
2. Vá em **Extensões > Apps Script**.
3. Cole o conteúdo de `apps-script/Codigo.gs`.
4. No editor do Apps Script, abra `appsscript.json` e substitua pelo conteúdo de `apps-script/appsscript.json`.
5. Salve o projeto.
6. Recarregue a planilha.
7. Use o menu **Onde Passa o Jogo > 1. Configurar planilha**.
8. Use **Onde Passa o Jogo > 2. Salvar chave Brave API**.
9. Use **Onde Passa o Jogo > 3. Atualizar transmissões agora**.

## Publicar como JSON

1. No Apps Script, clique em **Implantar > Nova implantação**.
2. Tipo: **App da Web**.
3. Executar como: **Eu**.
4. Quem tem acesso: **Qualquer pessoa**.
5. Copie a URL `/exec`.

Depois abra `site/script.js` e cole a URL aqui:

```js
const DATA_SOURCE_URL = "https://script.google.com/macros/s/SEU_ID/exec";
```

## Atualização automática

Na planilha, use:

**Onde Passa o Jogo > 4. Criar gatilho diário**

Isso cria uma rotina diária para rodar `atualizarTransmissoes()`.

## Observação importante

O bot detecta canais por palavras-chave e fontes encontradas. Ele deve ser tratado como pré-curadoria. Transmissões esportivas podem variar por praça, contrato, bloqueio regional e mudança de última hora.
