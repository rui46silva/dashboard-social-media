# Mesa

Painel único da agência: **redes sociais** (à la Metricool), **CRM e tarefas** (à la HubSpot/Jira) e **site** (dados do Google Analytics 4), com um **portal para os clientes**.

> Estado atual: **protótipo clicável com dados de exemplo.** Serve para validar o design e os fluxos antes de ligar as APIs reais.

## Como correr

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de produção
npm run typecheck
```

## O que já existe no protótipo

| Ecrã | Rota | O que faz |
|---|---|---|
| Início | `/` | Resumo do dia, publicações de hoje e amanhã, alertas (comentários negativos, aprovações pendentes), tarefas e pipeline |
| Clientes | `/clientes` | Lista de marcas com números de 30 dias; adicionar cliente e ligar contas |
| Cliente | `/clientes/[id]` | Separadores **Visão geral · Redes sociais · Site · Negócio**; filtros por período e por rede; melhores horas; melhores publicações |
| Calendário | `/calendario` | Vista de mês (arrastar para mudar o dia) e lista no telemóvel; compositor com pré-visualização, limites de caracteres e fluxo de aprovação |
| Inbox | `/inbox` | Comentários, mensagens e menções unificados; respostas rápidas, atribuir, resolver |
| Concorrentes | `/concorrentes` | Comparação de envolvimento, crescimento e ritmo de publicação |
| Relatórios | `/relatorios` | Construtor de relatórios com pré-visualização, exportação em PDF (impressão) e envio automático |
| Pipeline | `/crm/pipeline` | Kanban de negócios com arrastar e largar, valor ponderado e taxa de ganho |
| Contactos e empresas | `/crm` | CRM com pesquisa |
| Tarefas | `/tarefas` | Quadro e lista estilo Jira, filtro por pessoa |
| Equipa e papéis | `/equipa` | Pessoas, convites e matriz de permissões por papel |
| Portal do cliente | `/portal/[id]` | O que o cliente vê: números, aprovação de publicações, próximas publicações, relatórios |

**Papéis:** CEO (acesso total), RH, Dev, Gestor de conta, Designer e Cliente. Só **CEO, RH e Dev** podem convidar pessoas e mudar papéis. No protótipo, o seletor **«Ver como»** (barra lateral ou menu «Mais» no telemóvel) mostra como a app fica para cada papel.

## Decisões de design

- **Mobile-first.** Os estilos base são para o telemóvel e as `min-width` media queries acrescentam o layout de ecrã grande. No telemóvel há uma barra de navegação em baixo, o calendário passa a lista, as tabelas passam a cartões e a inbox alterna entre a lista e a conversa.
- **Editorial, estilo Asana/Jira.** Neutros quentes («papel e tinta»), serifa *Newsreader* para títulos e números, *Schibsted Grotesk* para a interface. Um único acento: o **marcador amarelo** (item ativo, «hoje», destaques no texto).
- **Claro e escuro.** O tema escuro tem valores próprios (não é uma inversão automática). Podes escolher Claro, Escuro ou Sistema.
- **Gráficos próprios em SVG**, sem bibliotecas de gráficos. A paleta categórica das redes foi validada para daltonismo nos dois modos, e cada gráfico tem legenda, rótulos diretos e tooltip.
- **Sem componentes de template.** CSS escrito à mão com tokens em `src/app/globals.css`.

## Estrutura

```
src/
  app/
    (app)/…          ecrãs internos (com barra lateral)
    portal/[id]/     portal do cliente (sem barra lateral)
    globals.css      tokens e todos os estilos
  components/
    shell.tsx        barra lateral, barra de topo, tab bar, ⌘K
    charts.tsx       LineChart, Sparkline, Bars, Heatmap
    ui.tsx           KPI, Delta, avatares, ícones de rede…
    session.tsx      papel ativo e tema
  lib/
    data.ts          dados de exemplo (a substituir pelo Supabase)
    format.ts        números, moeda e datas em pt-PT
```

## Próximos passos (produto real)

1. **Supabase:** autenticação, tabelas (clientes, contas ligadas, publicações, contactos, negócios, tarefas, papéis) e Row Level Security por agência e por cliente, já a pensar no multi-agência (SaaS).
2. **Integrações**, por ordem de risco:
   - **Meta (Instagram + Facebook):** Graph API. Exige uma app Meta com *App Review* e *Business Verification*, que é o passo mais demorado. Convém começar já.
   - **TikTok:** Display API + Content Posting API (a publicação direta exige auditoria da app).
   - **LinkedIn:** Community Management API (é preciso candidatar a app ao programa de parceiros).
   - **Google Analytics 4:** Data API com OAuth. É a mais simples.
3. **Agendador:** fila de publicações (cron ou Edge Functions) com repetição em caso de falha.
4. **Relatórios em PDF** gerados no servidor e enviados por email.
5. **Faturação** (Stripe) quando abrir a outras agências.
