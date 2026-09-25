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
| Cliente | `/clientes/[id]` | Separadores **Visão geral · Perfil · Ficheiros · Redes sociais · Site · Negócio**; a biblioteca de ficheiros guarda logótipos, fotos, vídeos e manual de marca, e as imagens associadas a um post aparecem nas pré-visualizações; o Perfil mostra descrição, contrato, metas, equipa, contacto e guia de marca, com edição |
| Calendário | `/calendario` | Vista de mês (arrastar para mudar o dia) e lista no telemóvel; compositor com pré-visualização e limites de caracteres |
| Inbox | `/inbox` | Cada cliente tem um **responsável pela inbox**: cada pessoa só vê as conversas dos seus clientes (o CEO pode ver a equipa toda). Respostas rápidas, passar a outra pessoa, resolver |
| Concorrentes | `/concorrentes` | Comparação de envolvimento, crescimento e ritmo de publicação |
| Relatórios | `/relatorios` | Construtor de relatórios com pré-visualização, exportação em PDF (impressão) e envio automático |
| Pipeline | `/crm/pipeline` | Kanban de negócios com arrastar e largar, valor ponderado e taxa de ganho |
| Contactos e empresas | `/crm` | CRM com pesquisa |
| Propostas | `/crm/propostas` | Proposta a partir da tabela de preços (mensal e pontual), link para o cliente, estado «vista», assinatura online em `/proposta/[id]`. Ao assinar: cliente criado, negócio ganho e tarefas de arranque planeadas |
| Operação | `/operacao` | **Horas** registadas vs. contratadas e € por hora real · **Carga da equipa** para os próximos 7 dias · **Tempo de resposta** da inbox (alvo: 4 h) · **Satisfação** (NPS) |
| Segurança e RGPD | `/seguranca` | Registo de atividade (exportável), 2FA por pessoa e obrigatório, sessões ativas, exportar/anonimizar dados de um cliente, pedidos de titulares e prazos de retenção |
| Aprovação rápida | `/aprovar/[id]` | Página que o cliente abre a partir do email/WhatsApp: vê o post como fica e aprova num toque |
| Tarefas | `/tarefas` | Cronómetro e registo de tempo por tarefa, estimativas. Estilo Asana: lista com secções, quadro e calendário; painel de detalhe com responsável, prazo, prioridade, descrição, subtarefas, comentários e gostos |
| Empresa | `/empresa` | **Só CEO.** Quatro separadores (`?tab=`): **Cockpit** — 8 metas do trimestre editáveis com semáforo e centro de alertas ("momentos focais") com regras configuráveis, responsável, estado, decisão registada e criação de tarefa; **Finanças** — caixa livre (banco − IVA − salários − fornecedores − IRC), faturas por receber com antiguidade, prazo médio de recebimento, lembretes e "marcar como paga", calendário fiscal e histórico; **Clientes** — pontuação de saúde 0–100 por cliente e rentabilidade; **Planeamento** — metas próprias com previsão (tendência linear dos últimos meses ou dos registos de progresso, prazo previsto e ritmo necessário), break-even e cenários a 12 meses. **Perfil fiscal** (Finanças): sociedade (Lda./Unipessoal) ou trabalhador independente (recibos verdes), IVA trimestral/mensal/isento — muda IVA, Segurança Social, retenção na fonte, IRS, calendário fiscal, caixa livre e custos fixos. Lógica em `src/lib/company.ts` e `src/lib/goals.ts` |
| Equipa e papéis | `/equipa` | Pessoas, convites e matriz de permissões por papel |
| Portal do cliente | `/portal/[id]` | Pré-visualização realista de cada post por rede (Instagram, Facebook, TikTok, LinkedIn) e do **feed do cliente** com os posts novos já encaixados. Pensado para o cliente: resultados em linguagem de negócio (contactos, reservas, valor gerado), aprovação de posts, melhores momentos, o que dizem da marca, objetivos e trabalho feito |

### Fluxo de aprovação de conteúdo

```
Em produção ──enviar──▶ Com o cliente (UAT) ──aprova──▶ Aprovado · confirmar ──agência confirma──▶ Agendado ──▶ Publicado
                              │
                              └──pede alterações──▶ volta a «Em produção» com o feedback
                                                     + tarefa automática para quem criou o post
```

Quando um post é enviado, o cliente recebe um email e/ou WhatsApp (conforme o perfil) com o link de aprovação rápida. O cliente aprova ou pede alterações no portal ou nesse link. No protótipo o estado fica guardado no browser (`localStorage`): aprova no portal e vês o resultado em `/conteudo` e `/tarefas`. O botão «Repor dados de demonstração» na barra lateral volta ao início.

**Papéis:** CEO (acesso total), RH, Dev, Gestor de conta, Designer e Cliente. Só **CEO, RH e Dev** podem convidar pessoas e mudar papéis. O papel **Cliente só acede ao portal da sua marca**: qualquer página da Mesa redireciona para lá. No protótipo, o seletor **«Ver como»** (barra lateral ou menu «Mais» no telemóvel) mostra como a app fica para cada papel.

## Decisões de design

- **Mobile-first.** Os estilos base são para o telemóvel e as `min-width` media queries acrescentam o layout de ecrã grande. No telemóvel há uma barra de navegação em baixo, o calendário passa a lista, as tabelas passam a cartões e a inbox alterna entre a lista e a conversa.
- **Vidro fosco sobre gradiente.** Fundo lilás/azul suave, cartões translúcidos com desfoque, cantos muito arredondados, botões pretos em forma de pílula e um acento índigo em gradiente (primeiro indicador de cada página). Tipografia *Plus Jakarta Sans*. A app vive dentro de uma moldura de vidro com uma coluna de ícones (menus que abrem ao lado, sem scroll). Micro-animações: botões, separadores com pílula deslizante, gráficos que se desenham, barras que crescem, números que contam.
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
