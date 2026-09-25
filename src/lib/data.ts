/**
 * Mock data for the prototype. Everything here is deterministic (seeded) so the
 * server and browser render the same thing. When the real integrations land,
 * each export below becomes a query against Supabase.
 */

/** Frozen "now" for the demo, built from local fields so it is timezone-safe. */
export const NOW = new Date(2026, 8, 24, 10, 30);

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const daysAgo = (n: number, h = 9, m = 0) => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - n, h, m);
  return d;
};
const daysFromNow = (n: number, h = 9, m = 0) => daysAgo(-n, h, m);

/* ------------------------------------------------------------------ Networks */

export type NetworkId = "facebook" | "instagram" | "tiktok" | "linkedin";

/** Order matches the validated categorical slots (--series-1..4). */
export const NETWORKS: { id: NetworkId; name: string; short: string; slot: number }[] = [
  { id: "facebook", name: "Facebook", short: "FB", slot: 1 },
  { id: "instagram", name: "Instagram", short: "IG", slot: 2 },
  { id: "tiktok", name: "TikTok", short: "TT", slot: 3 },
  { id: "linkedin", name: "LinkedIn", short: "IN", slot: 4 },
];
export const network = (id: NetworkId) => NETWORKS.find((n) => n.id === id)!;

/* ------------------------------------------------------------------- Clients */

export type Client = {
  id: string;
  name: string;
  sector: string;
  since: string;
  manager: string; // user id
  networks: NetworkId[];
  site: string;
  hue: number; // used only for the small avatar tile
};

export const CLIENTS: Client[] = [
  {
    id: "casa-lume",
    name: "Casa Lume",
    sector: "Iluminação e decoração",
    since: "mar 2024",
    manager: "u-ana",
    networks: ["instagram", "facebook", "linkedin"],
    site: "casalume.pt",
    hue: 38,
  },
  {
    id: "orvalho",
    name: "Padaria Orvalho",
    sector: "Restauração",
    since: "jan 2025",
    manager: "u-tiago",
    networks: ["instagram", "facebook", "tiktok"],
    site: "orvalho.pt",
    hue: 15,
  },
  {
    id: "kinetik",
    name: "Kinetik Fitness",
    sector: "Desporto e bem-estar",
    since: "set 2023",
    manager: "u-ana",
    networks: ["instagram", "tiktok", "facebook", "linkedin"],
    site: "kinetik.fit",
    hue: 200,
  },
  {
    id: "atlantico",
    name: "Atlântico Surf School",
    sector: "Turismo e lazer",
    since: "jun 2025",
    manager: "u-tiago",
    networks: ["instagram", "tiktok"],
    site: "atlanticosurf.pt",
    hue: 170,
  },
];
export const client = (id: string) => CLIENTS.find((c) => c.id === id);

/* --------------------------------------------------------- Social analytics */

export type SocialStats = {
  network: NetworkId;
  followers: number;
  followersDelta: number; // over the period
  reach: number;
  impressions: number;
  engagementRate: number; // %
  engagementDelta: number; // pp vs previous period
  posts: number;
  clicks: number;
  /** Daily reach for the last 30 days, oldest first. */
  reachSeries: number[];
  /** Daily follower totals for the last 30 days. */
  followerSeries: number[];
};

const BASE: Record<string, Partial<Record<NetworkId, [number, number]>>> = {
  // [followers, typical daily reach]
  "casa-lume": { instagram: [18400, 5200], facebook: [9100, 1900], linkedin: [2300, 640] },
  orvalho: { instagram: [12650, 4100], facebook: [7400, 2200], tiktok: [21300, 11800] },
  kinetik: { instagram: [31200, 9800], tiktok: [48900, 26500], facebook: [11800, 2600], linkedin: [3900, 900] },
  atlantico: { instagram: [8700, 3300], tiktok: [15200, 9100] },
};

function buildStats(c: Client, idx: number): SocialStats[] {
  return c.networks.map((net, j) => {
    const r = seeded(97 * (idx + 1) + 13 * (j + 1));
    const [followers, reach] = BASE[c.id][net]!;
    const reachSeries = Array.from({ length: 30 }, (_, d) => {
      const weekly = 1 + 0.18 * Math.sin((d / 7) * Math.PI * 2 + j);
      const spike = r() > 0.9 ? 1.8 + r() : 1;
      return Math.round(reach * weekly * spike * (0.8 + r() * 0.4) * (0.9 + d / 150));
    });
    const growth = Math.round(followers * (0.008 + r() * 0.035));
    const followerSeries = Array.from({ length: 30 }, (_, d) =>
      Math.round(followers - growth + (growth * d) / 29 + (r() - 0.5) * growth * 0.08),
    );
    followerSeries[29] = followers;
    const sumReach = reachSeries.reduce((a, b) => a + b, 0);
    return {
      network: net,
      followers,
      followersDelta: growth,
      reach: sumReach,
      impressions: Math.round(sumReach * (1.4 + r() * 0.5)),
      engagementRate: Math.round((net === "tiktok" ? 5.5 : net === "linkedin" ? 3.1 : 2.4 + r() * 2) * 10 + r() * 12) / 10,
      engagementDelta: Math.round((r() - 0.4) * 16) / 10,
      posts: Math.round(8 + r() * 14),
      clicks: Math.round(sumReach * (0.006 + r() * 0.01)),
      reachSeries,
      followerSeries,
    };
  });
}

export const SOCIAL: Record<string, SocialStats[]> = Object.fromEntries(
  CLIENTS.map((c, i) => [c.id, buildStats(c, i)]),
);

/** Best time to post: 7 days × 8 slots (06h..23h in steps), values 0..1. */
export function bestTimes(clientId: string): number[][] {
  const r = seeded(clientId.length * 31 + 7);
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 8 }, (_, s) => {
      const evening = s >= 5 && s <= 6 ? 0.45 : 0;
      const lunch = s === 3 ? 0.25 : 0;
      const weekend = d >= 5 ? 0.12 : 0;
      return Math.min(1, 0.12 + evening + lunch + weekend + r() * 0.35);
    }),
  );
}
export const TIME_SLOTS = ["06h", "09h", "11h", "13h", "16h", "19h", "21h", "23h"];

export type TopPost = {
  id: string;
  network: NetworkId;
  kind: string;
  caption: string;
  date: Date;
  reach: number;
  engagement: number;
  saves: number;
};

export function topPosts(clientId: string): TopPost[] {
  const c = client(clientId)!;
  const r = seeded(clientId.charCodeAt(0) * 17);
  const captions: Record<string, string[]> = {
    "casa-lume": [
      "Três maneiras de iluminar uma sala pequena sem perder aconchego",
      "Nova coleção Maré — vidro soprado à mão em Marinha Grande",
      "Antes e depois: o escritório da Joana em Campo de Ourique",
      "Luz quente ou luz fria? Um guia rápido para cada divisão",
    ],
    orvalho: [
      "O pão de centeio de sábado já tem fila às 7h30",
      "Bastidores: a massa-mãe que alimentamos há 11 anos",
      "Pastel de nata com casca de laranja — só esta semana",
      "Como guardar o pão para durar a semana inteira",
    ],
    kinetik: [
      "Treino de 12 minutos para quem só tem o intervalo de almoço",
      "A Marta perdeu o medo do agachamento. Esta é a história dela",
      "Mobilidade da anca: 4 exercícios antes de correr",
      "Aulas de grupo de outubro — horários novos",
    ],
    atlantico: [
      "Primeira onda em pé: a reação do Duarte, 9 anos",
      "Como ler o mar antes de entrar na água",
      "Pacote de fim de época: 5 aulas + fato incluído",
      "Nascer do sol na Ericeira com o grupo de terça",
    ],
  };
  const kinds = ["Reel", "Carrossel", "Imagem", "Vídeo"];
  return captions[clientId].map((caption, i) => {
    const net = c.networks[i % c.networks.length];
    const reach = Math.round(4000 + r() * 38000);
    return {
      id: `${clientId}-top-${i}`,
      network: net,
      kind: net === "tiktok" ? "Vídeo" : kinds[i % kinds.length],
      caption,
      date: daysAgo(3 + i * 5, 18),
      reach,
      engagement: Math.round(reach * (0.03 + r() * 0.06)),
      saves: Math.round(reach * (0.004 + r() * 0.01)),
    };
  }).sort((a, b) => b.reach - a.reach);
}

/* ------------------------------------------------------ Website (from GA4) */

export type SiteStats = {
  sessions: number;
  sessionsDelta: number;
  users: number;
  engagedRate: number;
  avgDuration: number; // seconds
  conversions: number;
  conversionsDelta: number;
  sessionSeries: number[];
  sources: { label: string; value: number }[];
  pages: { path: string; views: number; avg: number }[];
};

export const SITE: Record<string, SiteStats> = Object.fromEntries(
  CLIENTS.map((c, i) => {
    const r = seeded(401 + i * 59);
    const daily = [620, 380, 1150, 290][i];
    const sessionSeries = Array.from({ length: 30 }, (_, d) =>
      Math.round(daily * (1 + 0.22 * Math.sin((d / 7) * Math.PI * 2 + 1)) * (0.85 + r() * 0.3)),
    );
    const sessions = sessionSeries.reduce((a, b) => a + b, 0);
    const socialShare = [0.24, 0.31, 0.19, 0.38][i];
    const sources = [
      { label: "Pesquisa orgânica", value: 0.36 },
      { label: "Redes sociais", value: socialShare },
      { label: "Direto", value: 0.18 },
      { label: "Referências", value: 0.07 },
      { label: "Pago", value: 0.03 },
    ];
    // Direct absorbs whatever is left so the shares always add up to 100%.
    sources[2].value = 1 - sources.reduce((a, s, k) => (k === 2 ? a : a + s.value), 0);
    const pagesBy: Record<string, string[]> = {
      "casa-lume": ["/", "/colecoes/mare", "/loja/candeeiros-de-teto", "/blog/iluminar-sala-pequena", "/contactos"],
      orvalho: ["/", "/encomendas", "/menu", "/lojas", "/sobre-nos"],
      kinetik: ["/", "/aulas", "/precos", "/experimenta-gratis", "/blog/mobilidade-anca"],
      atlantico: ["/", "/aulas", "/reservar", "/ericeira", "/faq"],
    };
    return [
      c.id,
      {
        sessions,
        sessionsDelta: Math.round((r() * 30 - 6) * 10) / 10,
        users: Math.round(sessions * 0.74),
        engagedRate: Math.round((52 + r() * 18) * 10) / 10,
        avgDuration: Math.round(70 + r() * 110),
        conversions: Math.round(sessions * (0.011 + r() * 0.02)),
        conversionsDelta: Math.round((r() * 40 - 10) * 10) / 10,
        sessionSeries,
        sources: sources.map((s) => ({ label: s.label, value: Math.round(sessions * s.value) })),
        pages: pagesBy[c.id].map((path, k) => ({
          path,
          views: Math.round(sessions * (0.42 - k * 0.07) * (0.9 + r() * 0.2)),
          avg: Math.round(40 + r() * 140),
        })),
      },
    ];
  }),
);

/* ------------------------------------------------------------------- Posts */

/**
 * Content approval flow:
 *   todo → uat (cliente revê) → confirmar (cliente aprovou, agência confirma) → agendado → publicado
 *   uat → cliente pede alterações → volta a todo, com o feedback agarrado ao post.
 */
export type PostStatus = "todo" | "uat" | "confirmar" | "agendado" | "publicado";
export const POST_FLOW: PostStatus[] = ["todo", "uat", "confirmar", "agendado"];
export const POST_STATUS: Record<PostStatus, string> = {
  todo: "Em produção",
  uat: "Com o cliente",
  confirmar: "Aprovado · confirmar",
  agendado: "Agendado",
  publicado: "Publicado",
};
export const POST_STATUS_HINT: Record<PostStatus, string> = {
  todo: "A equipa está a criar ou a corrigir",
  uat: "À espera da aprovação do cliente (UAT)",
  confirmar: "O cliente aprovou — falta a agência confirmar tudo",
  agendado: "Confirmado e agendado para publicar",
  publicado: "Já está no ar",
};

export type PostComment = { by: string; name: string; text: string; date: Date; kind: "feedback" | "nota" | "sistema" };

export type Post = {
  id: string;
  clientId: string;
  networks: NetworkId[];
  date: Date;
  kind: "Reel" | "Carrossel" | "Imagem" | "Vídeo" | "Story" | "Artigo";
  caption: string;
  status: PostStatus;
  author: string;
  /** Rounds of client changes requested so far. */
  rounds: number;
  comments: PostComment[];
};

const POST_SEEDS: [string, NetworkId[], number, number, Post["kind"], string, PostStatus?][] = [
  ["casa-lume", ["instagram", "facebook"], -9, 18, "Carrossel", "Luz quente ou luz fria? Um guia rápido para cada divisão"],
  ["kinetik", ["tiktok", "instagram"], -7, 7, "Reel", "Treino de 12 minutos para o intervalo de almoço"],
  ["orvalho", ["instagram"], -6, 8, "Imagem", "O centeio de sábado saiu do forno"],
  ["atlantico", ["instagram", "tiktok"], -5, 19, "Reel", "Primeira onda em pé do Duarte"],
  ["casa-lume", ["linkedin"], -4, 10, "Artigo", "Como a luz influencia a produtividade num escritório"],
  ["kinetik", ["facebook"], -3, 12, "Imagem", "Aulas de grupo de outubro — horários novos"],
  ["orvalho", ["tiktok"], -2, 17, "Vídeo", "Bastidores da massa-mãe"],
  ["kinetik", ["instagram"], -1, 18, "Carrossel", "Mobilidade da anca: 4 exercícios"],
  ["casa-lume", ["instagram", "facebook"], 0, 13, "Reel", "Nova coleção Maré — do forno ao teto", "agendado"],
  ["atlantico", ["instagram"], 0, 19, "Story", "Vagas para a aula de amanhã às 8h", "agendado"],
  ["orvalho", ["instagram", "facebook"], 1, 8, "Carrossel", "Pastel de nata com casca de laranja", "confirmar"],
  ["kinetik", ["tiktok"], 1, 19, "Vídeo", "Desafio de pranchas da semana", "agendado"],
  ["casa-lume", ["instagram"], 2, 18, "Imagem", "Antes e depois: escritório em Campo de Ourique", "uat"],
  ["atlantico", ["tiktok", "instagram"], 3, 18, "Reel", "Como ler o mar antes de entrar", "uat"],
  ["kinetik", ["linkedin"], 3, 9, "Artigo", "Bem-estar no trabalho: programa para empresas", "agendado"],
  ["orvalho", ["instagram"], 5, 8, "Imagem", "Sábado de centeio", "todo"],
  ["casa-lume", ["facebook"], 6, 12, "Imagem", "Workshop: iluminar a sala em 3 passos", "uat"],
  ["kinetik", ["instagram", "facebook"], 7, 18, "Carrossel", "Plano de treino para outubro", "uat"],
  ["atlantico", ["instagram"], 8, 19, "Carrossel", "Pacote de fim de época", "todo"],
  ["orvalho", ["tiktok"], 9, 17, "Vídeo", "Um dia na padaria, das 4h às 13h", "uat"],
  ["casa-lume", ["instagram", "linkedin"], 10, 11, "Carrossel", "Projeto: hotel boutique no Porto", "todo"],
  ["kinetik", ["tiktok", "instagram"], 12, 7, "Reel", "Treino de 12 minutos — parte 2", "todo"],
  ["orvalho", ["instagram", "facebook"], 14, 8, "Imagem", "Castanhas e pão de deus: chegou o outono", "todo"],
  ["atlantico", ["tiktok"], 15, 19, "Vídeo", "Últimas ondas de setembro", "todo"],
];

const CLIENT_CONTACT: Record<string, [string, string]> = {
  "casa-lume": ["c1", "Sofia Mendes"],
  orvalho: ["c2", "Filipa Costa"],
  kinetik: ["c3", "Marco Teixeira"],
  atlantico: ["c4", "Nuno Ferraz"],
};

/** Client feedback that sent posts back to production. */
const REJECTIONS: Record<number, string> = {
  15: "A foto do centeio está escura demais. Podem usar a da fornada das 7h, com a luz da janela?",
  21: "Gostamos muito! Só trocar a música — esta já foi usada pelo Pulse Gym na semana passada.",
};

export const POSTS: Post[] = POST_SEEDS.map(([clientId, networks, offset, hour, kind, caption, status], i) => {
  const [contactId, contactName] = CLIENT_CONTACT[clientId];
  const comments: PostComment[] = [];
  if (REJECTIONS[i]) {
    comments.push({ by: contactId, name: contactName, text: REJECTIONS[i], date: daysAgo(1, 16, 40), kind: "feedback" });
  }
  if (status === "confirmar") {
    comments.push({ by: contactId, name: contactName, text: "Aprovado! Está ótimo.", date: daysAgo(0, 9, 12), kind: "feedback" });
  }
  return {
    id: `p${i + 1}`,
    clientId,
    networks,
    date: daysFromNow(offset, hour, i % 2 ? 30 : 0),
    kind,
    caption,
    status: status ?? "publicado",
    author: ["u-ines", "u-tiago", "u-ana"][i % 3],
    rounds: REJECTIONS[i] ? 1 : 0,
    comments,
  };
});

/* ------------------------------------------------------------------- Inbox */

export type InboxItem = {
  id: string;
  clientId: string;
  network: NetworkId;
  kind: "comentário" | "mensagem" | "menção";
  author: string;
  handle: string;
  text: string;
  context?: string;
  date: Date;
  unread: boolean;
  sentiment: "positivo" | "neutro" | "negativo";
  thread?: { from: "them" | "us"; text: string; date: Date }[];
};

export const INBOX: InboxItem[] = [
  {
    id: "m1", clientId: "orvalho", network: "instagram", kind: "mensagem",
    author: "Marta Quintela", handle: "@martaquintela",
    text: "Olá! Fazem encomendas de bolo de aniversário para sábado? Seriam 20 pessoas.",
    date: daysAgo(0, 9, 48), unread: true, sentiment: "neutro",
    thread: [{ from: "them", text: "Olá! Fazem encomendas de bolo de aniversário para sábado? Seriam 20 pessoas.", date: daysAgo(0, 9, 48) }],
  },
  {
    id: "m2", clientId: "kinetik", network: "tiktok", kind: "comentário",
    author: "joao.pfit", handle: "@joao.pfit",
    text: "Fiz o treino de 12 min hoje e as pernas estão a tremer 😅 venha a parte 2",
    context: "Treino de 12 minutos para o intervalo de almoço",
    date: daysAgo(0, 9, 12), unread: true, sentiment: "positivo",
  },
  {
    id: "m3", clientId: "casa-lume", network: "facebook", kind: "comentário",
    author: "Rui Andrade", handle: "Rui Andrade",
    text: "Encomendei há 3 semanas e ainda não recebi nada. Ninguém responde ao email.",
    context: "Luz quente ou luz fria? Um guia rápido para cada divisão",
    date: daysAgo(0, 8, 30), unread: true, sentiment: "negativo",
  },
  {
    id: "m4", clientId: "atlantico", network: "instagram", kind: "mensagem",
    author: "Sophie Laurent", handle: "@sophie.lrnt",
    text: "Hi! Do you have lessons in English next week? We are 2 adults, beginners.",
    date: daysAgo(0, 7, 55), unread: true, sentiment: "neutro",
    thread: [{ from: "them", text: "Hi! Do you have lessons in English next week? We are 2 adults, beginners.", date: daysAgo(0, 7, 55) }],
  },
  {
    id: "m5", clientId: "kinetik", network: "linkedin", kind: "menção",
    author: "Helena Brás", handle: "Helena Brás · RH na Nordia",
    text: "O programa de bem-estar da @Kinetik Fitness mudou a forma como a nossa equipa encara as pausas.",
    date: daysAgo(1, 16, 20), unread: false, sentiment: "positivo",
  },
  {
    id: "m6", clientId: "orvalho", network: "instagram", kind: "comentário",
    author: "tiago.come.bem", handle: "@tiago.come.bem",
    text: "Melhor centeio de Lisboa, sem discussão.",
    context: "O centeio de sábado saiu do forno",
    date: daysAgo(1, 12, 5), unread: false, sentiment: "positivo",
  },
  {
    id: "m7", clientId: "casa-lume", network: "instagram", kind: "mensagem",
    author: "Atelier Fonte", handle: "@atelierfonte",
    text: "Somos um gabinete de arquitetura e gostávamos de falar sobre uma parceria para um projeto de hotel.",
    date: daysAgo(1, 10, 40), unread: false, sentiment: "positivo",
    thread: [
      { from: "them", text: "Somos um gabinete de arquitetura e gostávamos de falar sobre uma parceria para um projeto de hotel.", date: daysAgo(1, 10, 40) },
      { from: "us", text: "Olá! Que bom. Podem enviar-nos um email para projetos@casalume.pt com os detalhes?", date: daysAgo(1, 11, 2) },
    ],
  },
  {
    id: "m8", clientId: "atlantico", network: "tiktok", kind: "comentário",
    author: "surf.rita", handle: "@surf.rita",
    text: "Qual é o preço das aulas para crianças?",
    context: "Primeira onda em pé do Duarte",
    date: daysAgo(2, 19, 10), unread: false, sentiment: "neutro",
  },
];

/* ------------------------------------------------------------- Competitors */

export type Competitor = {
  name: string;
  handle: string;
  followers: number;
  growth: number; // % over 30d
  engagement: number; // %
  postsPerWeek: number;
  topPost: string;
  isClient?: boolean;
};

export const COMPETITORS: Record<string, Competitor[]> = {
  "casa-lume": [
    { name: "Casa Lume", handle: "@casalume", followers: 18400, growth: 3.1, engagement: 3.8, postsPerWeek: 4.5, topPost: "Nova coleção Maré", isClient: true },
    { name: "Lumina Store", handle: "@luminastore.pt", followers: 26100, growth: 1.2, engagement: 2.1, postsPerWeek: 6, topPost: "Saldos de verão −40%" },
    { name: "Oficina da Luz", handle: "@oficinadaluz", followers: 9800, growth: 4.6, engagement: 5.2, postsPerWeek: 3, topPost: "Candeeiro em cortiça feito à mão" },
    { name: "Norte Design", handle: "@nortedesign", followers: 14300, growth: 0.4, engagement: 1.7, postsPerWeek: 2.5, topPost: "Showroom renovado" },
  ],
  orvalho: [
    { name: "Padaria Orvalho", handle: "@padariaorvalho", followers: 12650, growth: 2.4, engagement: 4.3, postsPerWeek: 5, topPost: "Centeio de sábado", isClient: true },
    { name: "Forno do Bairro", handle: "@fornodobairro", followers: 19800, growth: 0.9, engagement: 2.6, postsPerWeek: 7, topPost: "Croissant de pistáchio" },
    { name: "Massa Madre", handle: "@massamadre.lx", followers: 8400, growth: 5.8, engagement: 6.1, postsPerWeek: 3, topPost: "Aula aberta de fermentação" },
  ],
  kinetik: [
    { name: "Kinetik Fitness", handle: "@kinetik.fit", followers: 31200, growth: 2.9, engagement: 4.9, postsPerWeek: 6, topPost: "Treino de 12 minutos", isClient: true },
    { name: "Pulse Gym", handle: "@pulsegym.pt", followers: 54300, growth: 1.1, engagement: 1.9, postsPerWeek: 9, topPost: "Inscrição a 1 €" },
    { name: "Estúdio Core", handle: "@estudiocore", followers: 12100, growth: 3.7, engagement: 5.6, postsPerWeek: 4, topPost: "Pilates ao ar livre" },
  ],
  atlantico: [
    { name: "Atlântico Surf School", handle: "@atlanticosurf", followers: 8700, growth: 6.2, engagement: 6.8, postsPerWeek: 5, topPost: "Primeira onda do Duarte", isClient: true },
    { name: "Ericeira Waves", handle: "@ericeirawaves", followers: 22400, growth: 1.8, engagement: 3.2, postsPerWeek: 6, topPost: "Swell de setembro" },
    { name: "Salt Surf Camp", handle: "@saltsurfcamp", followers: 17600, growth: 2.2, engagement: 2.7, postsPerWeek: 4, topPost: "Camp de outono" },
  ],
};

/* ---------------------------------------------------------------- Reports */

export type Report = {
  id: string;
  clientId: string;
  title: string;
  period: string;
  status: "enviado" | "agendado" | "rascunho";
  when: Date;
  recipients: string[];
};

export const REPORTS: Report[] = [
  { id: "r1", clientId: "kinetik", title: "Relatório mensal", period: "agosto 2026", status: "enviado", when: daysAgo(23, 9), recipients: ["marco@kinetik.fit"] },
  { id: "r2", clientId: "casa-lume", title: "Relatório mensal", period: "agosto 2026", status: "enviado", when: daysAgo(22, 9), recipients: ["sofia@casalume.pt", "geral@casalume.pt"] },
  { id: "r3", clientId: "orvalho", title: "Campanha de verão", period: "jun – ago 2026", status: "enviado", when: daysAgo(10, 15), recipients: ["filipa@orvalho.pt"] },
  { id: "r4", clientId: "atlantico", title: "Relatório mensal", period: "setembro 2026", status: "agendado", when: daysFromNow(7, 9), recipients: ["nuno@atlanticosurf.pt"] },
  { id: "r5", clientId: "kinetik", title: "Relatório mensal", period: "setembro 2026", status: "agendado", when: daysFromNow(7, 9), recipients: ["marco@kinetik.fit"] },
  { id: "r6", clientId: "casa-lume", title: "Lançamento coleção Maré", period: "set 2026", status: "rascunho", when: daysAgo(1, 17), recipients: [] },
];

/* -------------------------------------------------------------------- CRM */

export type Company = {
  id: string;
  name: string;
  sector: string;
  city: string;
  status: "cliente" | "prospeto" | "antigo";
  owner: string;
  clientId?: string;
  mrr?: number;
};

export const COMPANIES: Company[] = [
  { id: "co1", name: "Casa Lume", sector: "Decoração", city: "Lisboa", status: "cliente", owner: "u-ana", clientId: "casa-lume", mrr: 1450 },
  { id: "co2", name: "Padaria Orvalho", sector: "Restauração", city: "Lisboa", status: "cliente", owner: "u-tiago", clientId: "orvalho", mrr: 900 },
  { id: "co3", name: "Kinetik Fitness", sector: "Desporto", city: "Porto", status: "cliente", owner: "u-ana", clientId: "kinetik", mrr: 2100 },
  { id: "co4", name: "Atlântico Surf School", sector: "Turismo", city: "Ericeira", status: "cliente", owner: "u-tiago", clientId: "atlantico", mrr: 750 },
  { id: "co5", name: "Vinhos Serra Alta", sector: "Vinhos", city: "Viseu", status: "prospeto", owner: "u-rui" },
  { id: "co6", name: "Clínica Dentária Sorriso", sector: "Saúde", city: "Braga", status: "prospeto", owner: "u-ana" },
  { id: "co7", name: "Nordia Software", sector: "Tecnologia", city: "Lisboa", status: "prospeto", owner: "u-rui" },
  { id: "co8", name: "Hotel Rio Mondego", sector: "Hotelaria", city: "Coimbra", status: "prospeto", owner: "u-tiago" },
  { id: "co9", name: "Ótica Visão Clara", sector: "Retalho", city: "Setúbal", status: "antigo", owner: "u-ana" },
];
export const company = (id: string) => COMPANIES.find((c) => c.id === id)!;

export type Contact = {
  id: string;
  name: string;
  role: string;
  companyId: string;
  email: string;
  phone: string;
  lastTouch: Date;
  source: string;
};

export const CONTACTS: Contact[] = [
  { id: "c1", name: "Sofia Mendes", role: "Diretora de marketing", companyId: "co1", email: "sofia@casalume.pt", phone: "+351 912 345 118", lastTouch: daysAgo(1), source: "Recomendação" },
  { id: "c2", name: "Filipa Costa", role: "Sócia-gerente", companyId: "co2", email: "filipa@orvalho.pt", phone: "+351 913 882 040", lastTouch: daysAgo(4), source: "Instagram" },
  { id: "c3", name: "Marco Teixeira", role: "CEO", companyId: "co3", email: "marco@kinetik.fit", phone: "+351 936 101 772", lastTouch: daysAgo(2), source: "Evento" },
  { id: "c4", name: "Nuno Ferraz", role: "Fundador", companyId: "co4", email: "nuno@atlanticosurf.pt", phone: "+351 918 554 309", lastTouch: daysAgo(6), source: "Site" },
  { id: "c5", name: "Carolina Pinto", role: "Enóloga e sócia", companyId: "co5", email: "carolina@serraalta.pt", phone: "+351 962 330 118", lastTouch: daysAgo(0, 9), source: "LinkedIn" },
  { id: "c6", name: "Dr. Henrique Lobo", role: "Diretor clínico", companyId: "co6", email: "henrique@sorriso.pt", phone: "+351 253 400 912", lastTouch: daysAgo(8), source: "Site" },
  { id: "c7", name: "Helena Brás", role: "Diretora de RH", companyId: "co7", email: "helena@nordia.io", phone: "+351 915 204 663", lastTouch: daysAgo(3), source: "LinkedIn" },
  { id: "c8", name: "Paulo Rebelo", role: "Diretor-geral", companyId: "co8", email: "paulo@riomondego.pt", phone: "+351 239 118 004", lastTouch: daysAgo(12), source: "Recomendação" },
  { id: "c9", name: "Joana Serrão", role: "Gerente", companyId: "co9", email: "joana@visaoclara.pt", phone: "+351 265 771 250", lastTouch: daysAgo(94), source: "Site" },
];

export const STAGES = ["Lead", "Qualificado", "Proposta", "Negociação", "Ganho", "Perdido"] as const;
export type Stage = (typeof STAGES)[number];

export type Deal = {
  id: string;
  title: string;
  companyId: string;
  contactId: string;
  value: number; // monthly retainer € or one-off
  recurring: boolean;
  stage: Stage;
  owner: string;
  updated: Date;
  next?: string;
};

export const DEALS: Deal[] = [
  { id: "d1", title: "Gestão de redes + vindima", companyId: "co5", contactId: "c5", value: 1200, recurring: true, stage: "Proposta", owner: "u-rui", updated: daysAgo(0, 9), next: "Reunião sex 15h" },
  { id: "d2", title: "Lançamento clínica nova", companyId: "co6", contactId: "c6", value: 4800, recurring: false, stage: "Qualificado", owner: "u-ana", updated: daysAgo(3), next: "Enviar portefólio saúde" },
  { id: "d3", title: "Employer branding LinkedIn", companyId: "co7", contactId: "c7", value: 1600, recurring: true, stage: "Negociação", owner: "u-rui", updated: daysAgo(1), next: "Rever âmbito com jurídico" },
  { id: "d4", title: "Redes sociais + reservas", companyId: "co8", contactId: "c8", value: 1100, recurring: true, stage: "Lead", owner: "u-tiago", updated: daysAgo(5) },
  { id: "d5", title: "Upsell: TikTok Kinetik", companyId: "co3", contactId: "c3", value: 650, recurring: true, stage: "Proposta", owner: "u-ana", updated: daysAgo(2), next: "Aguardar resposta" },
  { id: "d6", title: "Sessão fotográfica outono", companyId: "co2", contactId: "c2", value: 900, recurring: false, stage: "Ganho", owner: "u-tiago", updated: daysAgo(6) },
  { id: "d7", title: "Reativação Visão Clara", companyId: "co9", contactId: "c9", value: 700, recurring: true, stage: "Perdido", owner: "u-ana", updated: daysAgo(20) },
  { id: "d8", title: "Vídeo institucional", companyId: "co4", contactId: "c4", value: 2400, recurring: false, stage: "Lead", owner: "u-tiago", updated: daysAgo(4) },
  { id: "d9", title: "Catálogo Maré — campanha", companyId: "co1", contactId: "c1", value: 3200, recurring: false, stage: "Ganho", owner: "u-ana", updated: daysAgo(9) },
];

/* ------------------------------------------------------------------ Tasks */

export type TaskSection = "backlog" | "curso" | "revisao";
export const TASK_SECTIONS: { id: TaskSection; name: string }[] = [
  { id: "backlog", name: "Por fazer" },
  { id: "curso", name: "Em curso" },
  { id: "revisao", name: "Em revisão" },
];
export type Priority = "alta" | "média" | "baixa";

export type Subtask = { id: string; title: string; done: boolean };
export type TaskComment = { by: string; text: string; date: Date };

export type Task = {
  id: string;
  title: string;
  clientId?: string;
  assignee: string;
  due: Date | null;
  section: TaskSection;
  done: boolean;
  priority: Priority;
  description: string;
  subtasks: Subtask[];
  comments: TaskComment[];
  likes: string[];
  collaborators: string[];
  tags: string[];
  createdBy: string;
};

const st = (id: string, title: string, done = false): Subtask => ({ id, title, done });

export const TASKS: Task[] = [
  {
    id: "t1", title: "Responder à reclamação de entrega (Facebook)", clientId: "casa-lume", assignee: "u-ana", due: daysAgo(0, 12),
    section: "backlog", done: false, priority: "alta", tags: ["inbox"], createdBy: "u-rui", likes: [], collaborators: ["u-rui"],
    description: "O Rui Andrade comentou no carrossel «Luz quente ou luz fria?» que a encomenda está atrasada 3 semanas. Confirmar com a Sofia o estado da encomenda antes de responder em público.",
    subtasks: [st("t1a", "Pedir número da encomenda por mensagem privada", true), st("t1b", "Confirmar estado com a Sofia (Casa Lume)"), st("t1c", "Responder no comentário")],
    comments: [{ by: "u-rui", text: "Prioridade máxima — está a ganhar gostos.", date: daysAgo(0, 8, 50) }],
  },
  {
    id: "t2", title: "Aprovar internamente o carrossel do pastel de nata", clientId: "orvalho", assignee: "u-tiago", due: daysAgo(0, 17),
    section: "revisao", done: false, priority: "média", tags: ["conteúdo"], createdBy: "u-tiago", likes: ["u-ines"], collaborators: ["u-ines"],
    description: "A Filipa já aprovou. Rever legenda, hashtags e agendar para amanhã às 8h.",
    subtasks: [st("t2a", "Rever legenda", true), st("t2b", "Confirmar horário"), st("t2c", "Agendar")],
    comments: [],
  },
  {
    id: "t3", title: "Editar Reel da coleção Maré", clientId: "casa-lume", assignee: "u-ines", due: daysAgo(0, 12),
    section: "curso", done: false, priority: "alta", tags: ["vídeo"], createdBy: "u-ana", likes: [], collaborators: ["u-ana"],
    description: "Cortes a partir das filmagens de terça. Máximo 20 segundos, música do banco aprovado.",
    subtasks: [st("t3a", "Seleção de planos", true), st("t3b", "Montagem", true), st("t3c", "Cor e legendas")],
    comments: [{ by: "u-ana", text: "A Sofia pediu para mostrar o candeeiro grande logo no início.", date: daysAgo(1, 15) }],
  },
  {
    id: "t4", title: "Proposta Vinhos Serra Alta", assignee: "u-rui", due: daysFromNow(1, 18),
    section: "curso", done: false, priority: "alta", tags: ["comercial"], createdBy: "u-rui", likes: [], collaborators: [],
    description: "Gestão de Instagram + Facebook e campanha de vindimas. Avença alvo: 1200 €/mês.",
    subtasks: [st("t4a", "Diagnóstico das redes atuais", true), st("t4b", "Plano de conteúdos (3 meses)"), st("t4c", "Orçamento"), st("t4d", "Enviar à Carolina")],
    comments: [],
  },
  {
    id: "t5", title: "Relatório mensal de setembro", clientId: "kinetik", assignee: "u-ana", due: daysFromNow(6, 18),
    section: "backlog", done: false, priority: "média", tags: ["relatório"], createdBy: "u-ana", likes: [], collaborators: [],
    description: "", subtasks: [], comments: [],
  },
  {
    id: "t6", title: "Guião do vídeo institucional", clientId: "atlantico", assignee: "u-ines", due: daysFromNow(3, 18),
    section: "backlog", done: false, priority: "baixa", tags: ["vídeo"], createdBy: "u-tiago", likes: [], collaborators: ["u-tiago"],
    description: "60–90 segundos. Tom: família, segurança, mar.", subtasks: [st("t6a", "Entrevista ao Nuno"), st("t6b", "Estrutura"), st("t6c", "Guião final")], comments: [],
  },
  {
    id: "t7", title: "Ligar API do TikTok (sandbox)", assignee: "u-pedro", due: daysFromNow(2, 18),
    section: "curso", done: false, priority: "média", tags: ["dev"], createdBy: "u-pedro", likes: ["u-rui"], collaborators: [],
    description: "Criar app no TikTok for Developers, pedir scopes de leitura e testar com a conta da Kinetik.",
    subtasks: [st("t7a", "Criar app", true), st("t7b", "OAuth em sandbox"), st("t7c", "Ler métricas de vídeo")], comments: [],
  },
  {
    id: "t8", title: "Calendário editorial de outubro", clientId: "kinetik", assignee: "u-tiago", due: daysFromNow(4, 18),
    section: "backlog", done: false, priority: "média", tags: ["planeamento"], createdBy: "u-ana", likes: [], collaborators: ["u-ana", "u-ines"],
    description: "", subtasks: [], comments: [],
  },
  {
    id: "t9", title: "Corrigir foto do «Sábado de centeio» (feedback do cliente)", clientId: "orvalho", assignee: "u-ines", due: daysFromNow(1, 12),
    section: "backlog", done: false, priority: "alta", tags: ["conteúdo", "alterações"], createdBy: "u-tiago", likes: [], collaborators: ["u-tiago"],
    description: "A Filipa pediu a foto da fornada das 7h, com luz da janela. Voltar a submeter para aprovação.",
    subtasks: [], comments: [],
  },
  {
    id: "t10", title: "Sessão fotográfica de outono", clientId: "orvalho", assignee: "u-ines", due: daysFromNow(8, 9),
    section: "backlog", done: false, priority: "média", tags: ["design"], createdBy: "u-tiago", likes: [], collaborators: [],
    description: "", subtasks: [], comments: [],
  },
  {
    id: "t11", title: "Onboarding: acesso ao GA4 da Orvalho", clientId: "orvalho", assignee: "u-pedro", due: daysAgo(2, 18),
    section: "revisao", done: true, priority: "baixa", tags: ["dev"], createdBy: "u-tiago", likes: [], collaborators: [], description: "", subtasks: [], comments: [],
  },
  {
    id: "t12", title: "Fotografias de produto — lote 3", clientId: "casa-lume", assignee: "u-ines", due: daysAgo(3, 18),
    section: "revisao", done: true, priority: "média", tags: ["design"], createdBy: "u-ana", likes: ["u-ana", "u-rui"], collaborators: [], description: "", subtasks: [], comments: [],
  },
  {
    id: "t13", title: "Rever preços da tabela de serviços 2027", assignee: "u-rui", due: daysFromNow(10, 18),
    section: "backlog", done: false, priority: "média", tags: ["gestão"], createdBy: "u-rui", likes: [], collaborators: ["u-sara"],
    description: "Ver margem por cliente no painel Empresa antes de decidir.", subtasks: [], comments: [],
  },
];

/* ------------------------------------------------------------ Team & roles */

export type RoleId = "ceo" | "rh" | "dev" | "gestor" | "designer" | "cliente";

export type Permission =
  | "ver_dashboard"
  | "publicar"
  | "aprovar"
  | "inbox"
  | "relatorios"
  | "crm"
  | "tarefas"
  | "gerir_clientes"
  | "gerir_utilizadores"
  | "integracoes"
  | "faturacao"
  | "empresa";

export const PERMISSIONS: { id: Permission; label: string; hint: string }[] = [
  { id: "ver_dashboard", label: "Ver métricas", hint: "Painéis de redes, site e negócio" },
  { id: "publicar", label: "Criar e agendar publicações", hint: "Calendário editorial" },
  { id: "aprovar", label: "Aprovar publicações", hint: "Passar de «em aprovação» a «agendado»" },
  { id: "inbox", label: "Responder na inbox", hint: "Comentários e mensagens" },
  { id: "relatorios", label: "Relatórios", hint: "Criar, exportar e enviar" },
  { id: "crm", label: "CRM", hint: "Contactos, empresas e negócios" },
  { id: "tarefas", label: "Tarefas", hint: "Criar e atribuir" },
  { id: "gerir_clientes", label: "Gerir clientes", hint: "Adicionar clientes e ligar contas" },
  { id: "gerir_utilizadores", label: "Gerir utilizadores e papéis", hint: "Convidar pessoas, atribuir papéis" },
  { id: "integracoes", label: "Integrações e API", hint: "Chaves, webhooks, ligações" },
  { id: "faturacao", label: "Faturação", hint: "Plano e pagamentos" },
  { id: "empresa", label: "Gestão da empresa", hint: "Finanças, break-even, cenários e riscos" },
];

export type Role = { id: RoleId; name: string; description: string; system: boolean; permissions: Permission[] };

const ALL = PERMISSIONS.map((p) => p.id);

export const ROLES: Role[] = [
  { id: "ceo", name: "CEO", description: "Acesso total à agência.", system: true, permissions: ALL },
  {
    id: "rh", name: "RH", description: "Gere a equipa e os acessos.", system: true,
    permissions: ["ver_dashboard", "tarefas", "gerir_utilizadores"],
  },
  {
    id: "dev", name: "Dev", description: "Integrações, dados e manutenção.", system: true,
    permissions: ["ver_dashboard", "tarefas", "gerir_clientes", "gerir_utilizadores", "integracoes"],
  },
  {
    id: "gestor", name: "Gestor de conta", description: "Dono da relação com o cliente.", system: false,
    permissions: ["ver_dashboard", "publicar", "aprovar", "inbox", "relatorios", "crm", "tarefas", "gerir_clientes"],
  },
  {
    id: "designer", name: "Designer", description: "Cria conteúdo para o calendário.", system: false,
    permissions: ["ver_dashboard", "publicar", "tarefas"],
  },
  {
    id: "cliente", name: "Cliente", description: "Vê o portal da sua marca e aprova conteúdo.", system: true,
    permissions: ["ver_dashboard", "aprovar"],
  },
];
export const role = (id: RoleId) => ROLES.find((r) => r.id === id)!;
export const can = (r: RoleId, p: Permission) => role(r).permissions.includes(p);

export type User = {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  title: string;
  clients: string[]; // client ids they work on ("*" = all)
  status: "ativo" | "convidado";
  lastSeen: Date;
};

export const USERS: User[] = [
  { id: "u-rui", name: "Rui Silva", email: "rui@agencia.pt", role: "ceo", title: "Fundador", clients: ["*"], status: "ativo", lastSeen: daysAgo(0, 10, 28) },
  { id: "u-ana", name: "Ana Rocha", email: "ana@agencia.pt", role: "gestor", title: "Gestora de conta", clients: ["casa-lume", "kinetik"], status: "ativo", lastSeen: daysAgo(0, 10, 5) },
  { id: "u-tiago", name: "Tiago Neves", email: "tiago@agencia.pt", role: "gestor", title: "Gestor de conta", clients: ["orvalho", "atlantico"], status: "ativo", lastSeen: daysAgo(0, 9, 40) },
  { id: "u-ines", name: "Inês Carvalho", email: "ines@agencia.pt", role: "designer", title: "Designer e vídeo", clients: ["*"], status: "ativo", lastSeen: daysAgo(0, 8, 55) },
  { id: "u-pedro", name: "Pedro Almeida", email: "pedro@agencia.pt", role: "dev", title: "Programador", clients: ["*"], status: "ativo", lastSeen: daysAgo(1, 18) },
  { id: "u-sara", name: "Sara Lopes", email: "sara@agencia.pt", role: "rh", title: "Pessoas e operações", clients: [], status: "ativo", lastSeen: daysAgo(2, 12) },
  { id: "u-marco", name: "Marco Teixeira", email: "marco@kinetik.fit", role: "cliente", title: "CEO · Kinetik", clients: ["kinetik"], status: "ativo", lastSeen: daysAgo(3, 21) },
  { id: "u-filipa", name: "Filipa Costa", email: "filipa@orvalho.pt", role: "cliente", title: "Sócia · Orvalho", clients: ["orvalho"], status: "convidado", lastSeen: daysAgo(30) },
];
export const user = (id: string) => USERS.find((u) => u.id === id)!;

/* ------------------------------------------------------ Company (CEO only) */

/** Last 12 months, oldest first. Values in €. */
export const FIN_MONTHS = Array.from({ length: 12 }, (_, i) => new Date(NOW.getFullYear(), NOW.getMonth() - 11 + i, 1));

export const FINANCE = {
  cash: 18400,
  recurring: [3200, 3200, 3950, 3950, 4200, 4200, 4850, 4850, 5200, 5200, 5200, 5200],
  projects: [0, 1800, 0, 2400, 0, 0, 1500, 0, 900, 0, 2400, 4100],
  /** Fixed monthly costs today. */
  fixed: [
    { label: "Salários e encargos", value: 3900 },
    { label: "Espaço (cowork)", value: 350 },
    { label: "Software e licenças", value: 280 },
    { label: "Marketing da agência", value: 200 },
    { label: "Transportes e equipamento", value: 180 },
    { label: "Contabilidade", value: 150 },
    { label: "Seguros", value: 60 },
  ],
  /** Fixed cost history (the team grew in March). */
  fixedHistory: [3950, 3950, 3950, 3990, 4010, 5020, 5060, 5080, 5090, 5110, 5120, 5120],
  /** Freelancers, ads for clients, stock — as share of revenue. */
  variableRate: 0.12,
  /** Internal fully-loaded cost of one team hour. */
  hourCost: 22,
  newClientsLast12: 3,
  churnedLast12: 1,
  salesSpendLast12: 4800, // marketing + founder time spent selling
};

export type ClientEconomics = {
  clientId: string;
  fee: number;
  hours: number; // per month, from timesheets
  contractEnd: Date;
};

export const CLIENT_ECONOMICS: ClientEconomics[] = [
  { clientId: "casa-lume", fee: 1450, hours: 38, contractEnd: daysFromNow(160) },
  { clientId: "orvalho", fee: 900, hours: 34, contractEnd: daysFromNow(62) },
  { clientId: "kinetik", fee: 2100, hours: 52, contractEnd: daysFromNow(240) },
  { clientId: "atlantico", fee: 750, hours: 31, contractEnd: daysFromNow(45) },
];

/* ------------------------------------------------- Client portal: outcomes */

export type ClientResults = {
  headline: string;
  outcomes: { label: string; value: number; hint: string }[];
  estValue: number; // € of business attributed (estimate)
  goals: { label: string; current: number; target: number; unit?: string }[];
  love: { author: string; network: NetworkId; text: string }[];
  work: { label: string; value: number }[];
};

export const RESULTS: Record<string, ClientResults> = {
  "casa-lume": {
    headline: "A coleção Maré foi vista por mais pessoas do que qualquer lançamento anterior.",
    outcomes: [
      { label: "Pedidos de orçamento", value: 23, hint: "por mensagem e formulário" },
      { label: "Visitas à loja online", value: 4180, hint: "vindas das redes" },
      { label: "Contactos de arquitetos", value: 4, hint: "potenciais parcerias" },
    ],
    estValue: 9400,
    goals: [
      { label: "Seguidores no Instagram", current: 18400, target: 20000 },
      { label: "Pedidos de orçamento no trimestre", current: 58, target: 60 },
    ],
    love: [
      { author: "@marta.casa", network: "instagram", text: "Comprei o candeeiro Maré e a sala mudou completamente. Obrigada!" },
      { author: "Atelier Fonte", network: "instagram", text: "Gostávamos de falar sobre uma parceria para um projeto de hotel." },
    ],
    work: [
      { label: "publicações", value: 16 }, { label: "Reels", value: 4 }, { label: "mensagens respondidas", value: 61 }, { label: "sessões fotográficas", value: 1 },
    ],
  },
  orvalho: {
    headline: "Os sábados de centeio esgotam — e metade dos clientes novos diz que vos viu no Instagram.",
    outcomes: [
      { label: "Encomendas por mensagem", value: 47, hint: "bolos e pão para eventos" },
      { label: "Pedidos de direções", value: 312, hint: "Google Maps a partir das redes" },
      { label: "Clientes novos (inquérito)", value: 38, hint: "disseram «vi no Instagram»" },
    ],
    estValue: 3850,
    goals: [
      { label: "Seguidores no TikTok", current: 21300, target: 25000 },
      { label: "Encomendas online por mês", current: 47, target: 60 },
    ],
    love: [
      { author: "@tiago.come.bem", network: "instagram", text: "Melhor centeio de Lisboa, sem discussão." },
      { author: "@ana.lx", network: "tiktok", text: "Vim de propósito de Almada por causa deste vídeo 😍" },
    ],
    work: [
      { label: "publicações", value: 19 }, { label: "vídeos TikTok", value: 6 }, { label: "mensagens respondidas", value: 88 }, { label: "sessões fotográficas", value: 1 },
    ],
  },
  kinetik: {
    headline: "O treino de 12 minutos tornou-se o vídeo mais visto de sempre da Kinetik.",
    outcomes: [
      { label: "Aulas experimentais marcadas", value: 64, hint: "a partir das redes e do site" },
      { label: "Novos sócios", value: 19, hint: "vieram de uma aula experimental" },
      { label: "Empresas interessadas", value: 3, hint: "programa de bem-estar (LinkedIn)" },
    ],
    estValue: 14200,
    goals: [
      { label: "Novos sócios no trimestre", current: 51, target: 60 },
      { label: "Seguidores no TikTok", current: 48900, target: 50000 },
    ],
    love: [
      { author: "@joao.pfit", network: "tiktok", text: "Fiz o treino de 12 min hoje e as pernas estão a tremer 😅 venha a parte 2" },
      { author: "Helena Brás · Nordia", network: "linkedin", text: "O programa de bem-estar da Kinetik mudou a forma como a nossa equipa encara as pausas." },
    ],
    work: [
      { label: "publicações", value: 24 }, { label: "Reels e TikToks", value: 9 }, { label: "mensagens respondidas", value: 102 }, { label: "artigos LinkedIn", value: 2 },
    ],
  },
  atlantico: {
    headline: "Setembro trouxe o maior número de reservas de sempre fora do verão.",
    outcomes: [
      { label: "Reservas de aulas", value: 41, hint: "através do link nas redes" },
      { label: "Pedidos de informação", value: 76, hint: "mensagens e comentários" },
      { label: "Turistas estrangeiros", value: 18, hint: "reservas em inglês" },
    ],
    estValue: 2870,
    goals: [
      { label: "Reservas em outubro", current: 12, target: 40 },
      { label: "Seguidores no Instagram", current: 8700, target: 10000 },
    ],
    love: [
      { author: "@sophie.lrnt", network: "instagram", text: "Best surf lesson ever, the instructors were amazing!" },
      { author: "@surf.rita", network: "tiktok", text: "O meu filho não fala de outra coisa desde a aula 🏄" },
    ],
    work: [
      { label: "publicações", value: 14 }, { label: "Reels", value: 5 }, { label: "mensagens respondidas", value: 57 }, { label: "vídeo institucional", value: 1 },
    ],
  },
};
