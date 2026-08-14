import type { Product } from "./products";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  suggestions?: string[];
};

const GOALS: Record<string, string[]> = {
  emagrecer: [
    "emagrecer",
    "perder peso",
    "dieta",
    "queimar gordura",
    "secar",
    "peso",
    "obesidade",
    "sobrepeso",
    "fitness",
    "termogenico",
    "saciedade",
    "metabolismo",
    "apetite",
    "gordura",
    "barriga",
    "inchaço",
    "diuretico",
    "fibra",
  ],
  energia: ["energia", "cansaco", "fadiga", "disposicao", "vigor", "animo", "preguica", "sono excessivo", "tonico"],
  sono: ["sono", "insonia", "dormir", "relaxar", "ansiedade noturna", "descanso", "melatonina"],
  imunidade: ["imunidade", "gripe", "resfriado", "defesa", "imunologico", "virus", "doenca", "resistencia"],
  digestao: ["digestao", "estomago", "intestino", "gases", "inchaco", "transito", "colon", "azia", "intestino"],
  coracao: ["coracao", "circulacao", "pressao", "colesterol", "triglicerideos", "cardiovascular", "sangue"],
  pele: ["pele", "cabelo", "unha", "acne", "envelhecimento", "colageno", "beleza", "antioxidante"],
  masculino: ["testosterona", "libido", "impotencia", "marapuama", "catuaba", "tribulus", "maca peruana", "homem", "virilidade"],
  feminino: ["menopausa", " tpm", "hormonio", "mulher", "gestacao", "amamentacao", "feminino"],
  foco: ["foco", "memoria", "concentracao", "estudo", "cerebro", "mental", "clareza", "insonia mental"],
};

const COMMON_ANSWERS: { patterns: string[]; answer: string }[] = [
  {
    patterns: ["entrega", "frete", "envio", "prazo", "chega", "receber", "correio", "transporte"],
    answer:
      "Entregamos para todo o Brasil. O prazo e o valor do frete são calculados automaticamente no checkout com base no seu CEP. Frete grátis disponível para compras acima do valor mínimo configurado na loja.",
  },
  {
    patterns: ["pagamento", "cartao", "pix", "boleto", "parcelar", "credito", "debito"],
    answer:
      "Aceitamos cartão de crédito, Pix e outros métodos disponíveis no Stripe. O pagamento é processado de forma segura e você recebe a confirmação por e-mail.",
  },
  {
    patterns: ["trocar", "devolver", "reembolso", "devolucao", "garantia"],
    answer:
      "Caso tenha qualquer problema com o produto, entre em contato conosco pelo WhatsApp ou e-mail. Avaliamos cada caso para troca, devolução ou reembolso.",
  },
  {
    patterns: ["dose", "tomar", "modo de usar", "quantas capsulas", "posologia", "horario"],
    answer:
      "A dosagem recomendada está na descrição de cada produto. Em geral, indicamos seguir a posologia do fabricante e, se tiver condições de saúde específicas, consultar um profissional antes de começar.",
  },
  {
    patterns: ["seguro", "efeito colateral", "contraindicacao", "pode tomar", "gravida", "amamentando", "crianca"],
    answer:
      "Nossos produtos são naturais e de qualidade, mas cada organismo reage de forma individual. Gestantes, nutrizes, crianças e pessoas com condições médicas devem consultar um profissional de saúde antes de usar qualquer suplemento.",
  },
  {
    patterns: ["vegano", "vegetariano", "gelatina", "capsula"],
    answer:
      "Nossas cápsulas são de origem vegetal, adequadas para vegetarianos e veganos, salvo indicação contrária na descrição específica do produto.",
  },
  {
    patterns: ["laudo", "qualidade", "teste", "puro", "original"],
    answer:
      "Trabalhamos com produtos selecionados e cada lote passa por laudos de pureza e potência. A qualidade é prioridade na Tioxtm Natural.",
  },
  {
    patterns: ["quem somos", "historia", "loja", "empresa", "marca"],
    answer:
      "A Tioxtm Natural nasceu da transformação de uma família com alimentação, disciplina e suplementação natural. Nosso propósito é levar até você o que há de melhor da natureza com segurança.",
  },
  {
    patterns: ["kit", "kits", "combo", "promocao", "desconto"],
    answer:
      "Temos kits montados com produtos complementares e preço especial. Dê uma olhada na aba 'Kits' no menu ou me diga seu objetivo que eu indico o melhor combo.",
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

function scoreProducts(products: Product[], query: string): Product[] {
  const q = normalize(query);
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  const scored = products.map((p) => {
    const text = normalize([p.name, p.subtitle, p.description, ...(p.benefits ?? [])].join(" "));
    let score = 0;
    for (const word of words) {
      if (text.includes(word)) score += 1;
      if (normalize(p.name).includes(word)) score += 3;
      if ((p.benefits ?? []).some((b) => normalize(b).includes(word))) score += 2;
    }
    return { product: p, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.product);
}

export function detectGoals(query: string): string[] {
  const q = normalize(query);
  const matched: string[] = [];
  for (const [goal, keywords] of Object.entries(GOALS)) {
    if (keywords.some((k) => q.includes(k))) matched.push(goal);
  }
  return matched;
}

function goalProducts(products: Product[], goals: string[]): Product[] {
  const goalKeywords = goals.flatMap((g) => GOALS[g] ?? []);
  const scored = products.map((p) => {
    const text = normalize([p.name, p.subtitle, p.description, ...(p.benefits ?? [])].join(" "));
    let score = 0;
    for (const kw of goalKeywords) {
      if (text.includes(kw)) score += 1;
    }
    return { product: p, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.product);
}

function commonAnswer(query: string): string | null {
  const q = normalize(query);
  for (const item of COMMON_ANSWERS) {
    if (item.patterns.some((p) => q.includes(p))) return item.answer;
  }
  return null;
}

export function getWelcomeMessage(): ChatMessage {
  return {
    role: "assistant",
    content:
      "Olá! Sou o assistente da Tioxtm Natural. Posso te ajudar a escolher suplementos, tirar dúvidas sobre entrega, pagamento e uso dos produtos. Qual o seu objetivo hoje?",
    suggestions: [
      "Quero emagrecer",
      "Preciso de mais energia",
      "Quero dormir melhor",
      "Como funciona a entrega?",
      "Quais formas de pagamento?",
    ],
  };
}

export function answerWithAssistant(query: string, products: Product[]): ChatMessage {
  const goals = detectGoals(query);
  const common = commonAnswer(query);
  const directMatches = scoreProducts(products, query);
  const goalMatches = goals.length ? goalProducts(products, goals) : [];

  const matchedProducts = goalMatches.length ? goalMatches : directMatches;

  if (common && matchedProducts.length === 0) {
    return {
      role: "assistant",
      content: common,
      suggestions: ["Ver produtos", "Ver kits", "Falar com um humano"],
    };
  }

  if (matchedProducts.length === 0) {
    return {
      role: "assistant",
      content:
        "Ainda não entendi bem o que você procura. Pode me dizer um objetivo (ex.: emagrecer, ter mais energia, dormir melhor, imunidade) ou o nome de um produto?",
      suggestions: ["Quero emagrecer", "Mais energia", "Dormir melhor", "Imunidade", "Ver todos os produtos"],
    };
  }

  const names = matchedProducts.map((p) => `"${p.name}"`).join(", ");
  let content = "";

  if (goals.length) {
    const goalLabel = goals[0] as keyof typeof goalNames;
    const goalNames = {
      emagrecer: "emagrecimento",
      energia: "mais energia e disposição",
      sono: "sono e relaxamento",
      imunidade: "imunidade",
      digestao: "saúde digestiva",
      coracao: "saúde cardiovascular",
      pele: "beleza da pele, cabelo e unhas",
      masculino: "saúde masculina",
      feminino: "saúde feminina",
      foco: "foco e memória",
    };
    content = `Para ${goalNames[goalLabel] ?? goalLabel}, indico estes produtos: ${names}. Clique em um deles para ver detalhes e adicionar ao carrinho.`;
  } else if (common) {
    content = `${common}\n\nTambém encontrei estes produtos no seu interesse: ${names}.`;
  } else {
    content = `Encontrei estes produtos para você: ${names}. Posso te ajudar com mais detalhes ou indicar um kit completo.`;
  }

  return {
    role: "assistant",
    content,
    products: matchedProducts,
    suggestions: ["Ver detalhes", "Adicionar ao carrinho", "Indicar outro produto", "Falar com um humano"].slice(
      0,
      3,
    ),
  };
}
