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
| Início | `/` | As minhas tarefas (próximas, atrasadas, concluídas), aprovações de conteúdo, publicações de hoje e amanhã, alertas e renovações |
| Aprovações | `/conteudo` | Fluxo de aprovação de posts e Reels pelo cliente (ver abaixo) |
| Clientes | `/clientes` | Lista de marcas; **novo cliente** em 5 passos (cliente e contacto, contrato e serviços, equipa e redes, metas, marca e voz), que alimenta o CRM, a página do cliente e o portal |
| Cliente | `/clientes/[id]` | Separadores **Visão geral · Perfil · Redes sociais · Site · Negócio**; o Perfil mostra descrição, contrato, metas, equipa, contacto e guia de marca, com edição |
| Calendário | `/calendario` | Vista de mês (arrastar para mudar o dia) e lista no telemóvel; compositor com pré-visualização e limites de caracteres |
| Inbox | `/inbox` | Cada cliente tem um **responsável pela inbox**: cada pessoa só vê as conversas dos seus clientes (o CEO pode ver a equipa toda). Respostas rápidas, passar a outra pessoa, resolver |
| Concorrentes | `/concorrentes` | Comparação de envolvimento, crescimento e ritmo de publicação |
| Relatórios | `/relatorios` | Construtor de relatórios com pré-visualização, exportação em PDF (impressão) e envio automático |
| Pipeline | `/crm/pipeline` | Kanban de negócios com arrastar e largar, valor ponderado e taxa de ganho |
| Contactos e empresas | `/crm` | CRM com pesquisa |
| Tarefas | `/tarefas` | Estilo Asana: lista com secções, quadro e calendário; painel de detalhe com responsável, prazo, prioridade, descrição, subtarefas, comentários e gostos |
| Empresa | `/empresa` | **Só CEO.** Receita vs. custos, break-even interativo, cenários a 12 meses, rentabilidade por cliente, CAC/LTV e alertas de risco |
| Equipa e papéis | `/equipa` | Pessoas, convites e matriz de permissões por papel |
| Portal do cliente | `/portal/[id]` | Pré-visualização realista de cada post por rede (Instagram, Facebook, TikTok, LinkedIn) e do **feed do cliente** com os posts novos já encaixados. Pensado para o cliente: resultados em linguagem de negócio (contactos, reservas, valor gerado), aprovação de posts, melhores momentos, o que dizem da marca, objetivos e trabalho feito |

### Fluxo de aprovação de conteúdo

```
Em produção ──enviar──▶ Com o cliente (UAT) ──aprova──▶ Aprovado · confirmar ──agência confirma──▶ Agendado ──▶ Publicado
                              │
                              └──pede alterações──▶ volta a «Em produção» com o feedback
                                                     + tarefa automática para quem criou o post
```

O cliente aprova ou pede alterações no portal. No protótipo o estado fica guardado no browser (`localStorage`): aprova no portal e vês o resultado em `/conteudo` e `/tarefas`. O botão «Repor dados de demonstração» na barra lateral volta ao início.

**Papéis:** CEO (acesso total), RH, Dev, Gestor de conta, Designer e Cliente. Só **CEO, RH e Dev** podem convidar pessoas e mudar papéis. O papel **Cliente só acede ao portal da sua marca**: qualquer página da Mesa redireciona para lá. No protótipo, o seletor **«Ver como»** (barra lateral ou menu «Mais» no telemóvel) mostra como a app fica para cada papel.

## Decisões de design

- **Mobile-first.** Os estilos base são para o telemóvel e as `min-width` media queries acrescentam o layout de ecrã grande. No telemóvel há uma barra de navegação em baixo, o calendário passa a lista, as tabelas passam a cartões e a inbox alterna entre a lista e a conversa.
- **Ferramenta de trabalho, ao estilo do Asana.** Barra lateral escura, área de trabalho branca, uma só família tipográfica (*Hanken Grotesk*), azul para ações e coral para a marca e alertas. Os destaques no texto usam um fundo suave com texto escuro, para manter a legibilidade.
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
    store.tsx        posts e tarefas partilhados entre ecrãs (localStorage no protótipo)
    post-drawer.tsx  detalhe de publicação e ações do fluxo de aprovação
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
