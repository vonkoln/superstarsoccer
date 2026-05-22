# Onde Passa o Jogo?

Site estático para informar onde jogos de futebol serão transmitidos.

## Arquivos

- `index.html`: estrutura da página.
- `style.css`: visual do site.
- `script.js`: filtros, busca, carregamento e interação.
- `dados.json`: base editável de jogos e transmissões.

## Como editar os jogos

Abra o arquivo `dados.json` e adicione novos objetos seguindo o mesmo modelo:

```json
{
  "id": 6,
  "date": "2026-05-26",
  "time": "20:30",
  "league": "Campeonato Exemplo",
  "home": "Time A",
  "away": "Time B",
  "stadium": "Estádio Exemplo",
  "status": "Próximos 7 dias",
  "region": "Brasil",
  "transmissions": [
    {
      "type": "TV",
      "name": "Canal Exemplo",
      "details": "Detalhes da transmissão."
    }
  ]
}
```

## Atenção importante

Como o site carrega `dados.json` com JavaScript, alguns navegadores bloqueiam esse carregamento quando você abre o `index.html` diretamente pelo duplo clique.

Use uma destas opções:

1. VS Code com extensão Live Server.
2. Netlify.
3. GitHub Pages.
4. Vercel.
5. Qualquer servidor local.

## Próximos passos recomendados

- Criar painel administrativo para cadastrar jogos.
- Integrar com Google Sheets, Firebase ou Supabase.
- Criar páginas por time.
- Criar páginas por campeonato.
- Adicionar favoritos e notificações.
- Adicionar campo de link oficial da transmissão.
