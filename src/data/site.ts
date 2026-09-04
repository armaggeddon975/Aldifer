/**
 * Dados da empresa. Fonte: seção "Dados reais da empresa" do CLAUDE.md.
 *
 * TUDO aqui é confirmado (extraído do site atual) EXCETO o que está tipado como
 * `null` e marcado com [CONFIRMAR]. Campo nulo não renderiza — a interface omite
 * a informação em vez de inventá-la.
 *
 * Etapa 2 migra este módulo para uma content collection `siteConfig`, para que
 * o pessoal da Aldifer edite pelo painel do Keystatic. Até lá é TS tipado, que
 * já atende a regra "conteúdo nunca hardcoded no componente".
 */

export type SocialLink = {
  readonly label: string;
  readonly href: string;
};

export type Address = {
  readonly street: string;
  readonly district: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
};

export type SiteData = {
  readonly legalName: string;
  readonly shortName: string;
  readonly slogan: string;
  readonly foundedYear: number;
  readonly address: Address;
  /** Formato de leitura, para exibir na tela. */
  readonly phone: string;
  /** Formato E.164, para o href tel: e para o JSON-LD. */
  readonly phoneE164: string;
  readonly email: string;
  readonly social: readonly SocialLink[];

  /** [CONFIRMAR] O site atual manda para um linktr.ee. Falta o número direto. */
  readonly whatsapp: string | null;
  /** [CONFIRMAR] Não consta no site atual. Incluir sábado. */
  readonly openingHours: readonly string[] | null;
  /** [CONFIRMAR] Necessário para o rodapé e para o JSON-LD. */
  readonly cnpj: string | null;
};

export const site: SiteData = {
  legalName: 'Aldifer Distribuidora de Ferro e Aço',
  shortName: 'Aldifer',
  slogan: 'A Loja do Aço',
  foundedYear: 2002,
  address: {
    street: 'Estrada dos Alvarengas, 5338',
    district: 'Núcleo São Jorge',
    city: 'São Bernardo do Campo',
    state: 'SP',
    postalCode: '09850-550',
  },
  phone: '(11) 4344-1919',
  phoneE164: '+551143441919',
  email: 'contato@aldifer.com.br',
  social: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/aldifer/' },
    { label: 'Instagram', href: 'https://www.instagram.com/aldiferoficial/' },
    { label: 'Facebook', href: 'https://www.facebook.com/aldiferoficial/' },
  ],

  whatsapp: null,
  openingHours: null,
  cnpj: null,
};
