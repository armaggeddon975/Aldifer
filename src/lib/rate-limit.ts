/**
 * Limite de envios por IP.
 *
 * LIMITAÇÃO QUE PRECISA SER DITA: isto guarda o contador em MEMÓRIA do
 * processo. Em serverless cada instância tem a sua, então o limite real é
 * "5 por hora por instância", não por IP global — e uma nova instância começa
 * com o contador zerado.
 *
 * Serve para o que precisa servir: cortar quem reenvia o formulário dez vezes
 * seguidas. Contra ataque distribuído de verdade, o portão é o Turnstile.
 *
 * Um limite realmente global exige armazenamento compartilhado (Vercel KV,
 * Upstash Redis). Está anotado na lista de pendências do README, para a Etapa
 * 13 decidir se vale a dependência.
 */

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

/** IP -> instantes dos envios aceitos dentro da janela. */
const hits = new Map<string, number[]>();

/** Evita crescer sem limite se o processo viver muito. */
const MAX_TRACKED_IPS = 5000;

export type RateLimitResult = {
  readonly allowed: boolean;
  /** Quantos envios ainda cabem na janela. */
  readonly remaining: number;
  /** Segundos até o próximo envio ser aceito. Zero quando ainda há saldo. */
  readonly retryAfterSeconds: number;
};

export function checkRateLimit(ip: string, now = Date.now()): RateLimitResult {
  const cutoff = now - WINDOW_MS;

  const previous = hits.get(ip) ?? [];
  const recent = previous.filter((at) => at > cutoff);

  if (recent.length >= MAX_PER_WINDOW) {
    const oldest = recent[0] ?? now;
    hits.set(ip, recent);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
    };
  }

  recent.push(now);
  hits.set(ip, recent);

  // Poda oportunista: só quando o mapa cresce, e não a cada requisição.
  if (hits.size > MAX_TRACKED_IPS) {
    for (const [key, times] of hits) {
      const alive = times.filter((at) => at > cutoff);
      if (alive.length === 0) hits.delete(key);
      else hits.set(key, alive);
    }
  }

  return { allowed: true, remaining: MAX_PER_WINDOW - recent.length, retryAfterSeconds: 0 };
}

/** Só para os testes: zera o estado entre casos. */
export function resetRateLimit(): void {
  hits.clear();
}

/**
 * IP do cliente. Na Vercel vem em x-forwarded-for, com a cadeia de proxies
 * separada por vírgula — o primeiro da lista é o cliente.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'desconhecido';
}
