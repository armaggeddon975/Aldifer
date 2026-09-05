import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import type { QuoteRequest } from './schemas';

/**
 * Onde o lead é guardado.
 *
 * "E-mail sozinho perde lead": cai em spam, o destinatário troca de emprego, a
 * caixa enche. A seção 7 do docs/CONTEUDO.md trata persistir como OBRIGATÓRIO,
 * e a ordem de preferência é Google Sheets → Notion → Supabase.
 *
 * A escolha depende do que a Aldifer já usa no dia a dia — pergunta 10 da
 * seção 12 do CONTEUDO.md, ainda sem resposta. Até ela chegar existe o driver
 * `json`, e ele tem uma limitação que NÃO pode passar em silêncio.
 */

export type Lead = Omit<QuoteRequest, 'website' | 'turnstileToken' | 'loadedAt'> & {
  readonly receivedAt: string;
  readonly ip: string | null;
  readonly userAgent: string | null;
  /** Segundos entre carregar o formulário e enviar. Útil para auditar spam. */
  readonly fillSeconds: number;
};

export type SaveResult = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export interface LeadStore {
  readonly name: string;
  save(lead: Lead): Promise<SaveResult>;
}

/**
 * Detecta ambiente serverless, onde o disco é efêmero.
 *
 * ISTO É O PONTO CRÍTICO: na Vercel o sistema de arquivos é somente leitura
 * fora de /tmp, e /tmp é descartado quando a instância morre. Um driver de
 * arquivo ali NÃO persiste nada — o lead parece salvo e desaparece.
 *
 * Por isso o driver json declara a falha em vez de fingir sucesso: o endpoint
 * carimba o aviso no assunto do e-mail, e a Aldifer descobre pelo próprio
 * pedido que o registro não foi gravado.
 */
function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/** Driver de arquivo. Serve para desenvolvimento local, NÃO para produção. */
function jsonFileStore(file: string): LeadStore {
  return {
    name: `json (${file})`,
    async save(lead) {
      if (isServerless()) {
        return {
          ok: false,
          reason:
            'driver "json" em ambiente serverless: o disco é efêmero e o lead NÃO foi persistido. Configure LEAD_STORE_DRIVER com um destino real.',
        };
      }

      try {
        await mkdir(path.dirname(file), { recursive: true });
        // Uma linha por lead (JSONL): dois pedidos simultâneos não corrompem o
        // arquivo, o que aconteceria reescrevendo um array inteiro.
        await appendFile(file, `${JSON.stringify(lead)}\n`, 'utf8');
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: `falha ao escrever em ${file}: ${String(error)}` };
      }
    },
  };
}

/**
 * Driver ainda não implementado. Existe para o endpoint ter comportamento
 * definido caso alguém configure o destino antes de o código existir — em vez
 * de cair no driver de arquivo e perder o lead em silêncio.
 */
function pendingStore(driver: string): LeadStore {
  return {
    name: `${driver} (não implementado)`,
    async save() {
      return {
        ok: false,
        reason: `driver "${driver}" ainda não implementado. Ver a lista de pendências do README.`,
      };
    },
  };
}

/**
 * Monta o store a partir de LEAD_STORE_DRIVER.
 *
 * TODO — pergunta 10 da seção 12 do docs/CONTEUDO.md: descobrir o que a Aldifer
 * usa (Google Sheets, Notion ou Supabase) e implementar o driver correspondente.
 * Enquanto isso o valor padrão é `json`, que só funciona localmente.
 */
export function createLeadStore(): LeadStore {
  const driver = process.env.LEAD_STORE_DRIVER?.trim() || 'json';

  switch (driver) {
    case 'json':
      return jsonFileStore(process.env.LEAD_STORE_FILE?.trim() || 'data/leads.jsonl');
    case 'google-sheets':
    case 'notion':
    case 'supabase':
      return pendingStore(driver);
    default:
      return pendingStore(driver);
  }
}
